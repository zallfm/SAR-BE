import { prismaSC } from '../../db/prisma';
import type { User } from '../../types/auth.js';
import { TB_M_USER } from '../../generated/prisma-sc/index';
import { hrPortalClient } from './hrPortal';
import { env } from '../../config/env';

type InternalUser = User & { password: string; id?: string | number };

type MenuRow = {
  MENU_ID: string;
  MENU_PARENT: string | null;
  MENU_TEXT: string | null;
  MENU_TIPS: string | null;
  IS_ACTIVE: number | boolean | null;
  VISIBILITY: number | boolean | null;
  URL: string | null;
  GLYPH: string | null;
  SEPARATOR: number | boolean | null;
  TARGET: string | null;
};

type MenuNode = MenuRow & { children: MenuNode[] };

function buildMenuTree(rows: MenuRow[]): MenuNode[] {
  const byId = new Map<string, MenuNode>();
  const roots: MenuNode[] = [];

  for (const r of rows) byId.set(r.MENU_ID, { ...r, children: [] });

  for (const r of rows) {
    const node = byId.get(r.MENU_ID)!;
    const parent = r.MENU_PARENT ?? '';
    if (parent && byId.has(parent)) {
      byId.get(parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

const applicationId = env.APPLICATION_ID;
export const userRepository = {
  async login(username: string, password: string): Promise<InternalUser | null> {
    const dbUser = await prismaSC.tB_M_USER.findFirst({
      where: {
        USERNAME: username,
        TB_M_USER_APPLICATION: {
          some: {
            APPLICATION: applicationId
          }
        }
      },
      select: { 
        ID: true, 
        USERNAME: true, 
        PASSWORD: true,
        IN_ACTIVE_DIRECTORY: true
      },
    });

    if (!dbUser) {
      throw new Error("Username or password incorrect")
    }

    if (dbUser.IN_ACTIVE_DIRECTORY) {
      console.log(`User ${username} has IN_ACTIVE_DIRECTORY=1, authenticating via HR Portal`)
      const hrPortalAuth = await hrPortalClient.checkSCMobile(
        username,
        password,
      );

      if (!hrPortalAuth.success) {
        throw new Error('Username or password incorrect');
      }
    } else {
      console.log(`User ${username} has IN_ACTIVE_DIRECTORY=0, using local password verification`)
      if (dbUser.PASSWORD !== password) {
        throw new Error('Username or password incorrect');
      }
    }

    // Ambil semua role user dari TB_M_AUTHORIZATION + TB_M_ROLE (aplikasi BK030)
    const roles = await prismaSC.$queryRaw<Array<{ ID: string; NAME: string }>>`
      SELECT DISTINCT r.ID, r.NAME
      FROM TB_M_ROLE r
      INNER JOIN TB_M_AUTHORIZATION a ON r.ID = a.ROLE
      WHERE r.APPLICATION = ${applicationId}
        AND a.USERNAME = ${username}
      ORDER BY r.ID
    `;
    // console.log("roles", roles)
    // Tentukan role utama (kalau punya lebih dari satu role)
    const primary = roles?.[0];
    const dynamicRole = (primary?.NAME ?? "SAR-ADMIN").toUpperCase();

    // Return hasil dinamis
    return {
      id: dbUser.ID,
      username: dbUser.USERNAME,
      password: dbUser.PASSWORD,
      name: dbUser.USERNAME,
      divisionId: 2,
      noreg: "100000",
      role: dynamicRole as User["role"],
    };
  },

  async getMenu(username: string) {
    const startTime = Date.now();
    try {
      const menusQuery = await prismaSC.$queryRaw<MenuRow[]>`
      WITH auth AS (
        SELECT [ROLE], [FUNCTION], [FEATURE]
        FROM dbo.TB_M_AUTHORIZATION
        WHERE [USERNAME] = ${username} AND [APPLICATION] = ${applicationId}
      ),
      base AS (
        SELECT m.*
        FROM dbo.TB_M_MENU m
        JOIN dbo.TB_M_MENU_AUTHORIZATION ma ON m.MENU_ID = ma.MENU_ID
        JOIN auth a ON
             (ma.ROLE_ID     IS NOT NULL AND ma.ROLE_ID     = a.[ROLE])
          OR (ma.FUNCTION_ID IS NOT NULL AND ma.FUNCTION_ID = a.[FUNCTION])
          OR (ma.FEATURE_ID  IS NOT NULL AND ma.FEATURE_ID  = a.[FEATURE])
        WHERE m.APP_ID = ${applicationId} AND ma.APP_ID = ${applicationId}
      ),
      q AS (
        SELECT DISTINCT
          m.MENU_ID,
          m.MENU_PARENT,
          m.MENU_TEXT,
          m.MENU_TIPS,
          m.IS_ACTIVE,
          m.VISIBILITY,
          m.URL,
          m.GLYPH,
          m.SEPARATOR,
          m.TARGET,

          -- nomor urut dari prefix angka (default 9999 jika tak ada angka)
          TRY_CONVERT(int, NULLIF(SUBSTRING(m.MENU_ID, 1,
              PATINDEX('%[^0-9]%', m.MENU_ID + 'X') - 1), ''))        AS ORDER_NO,

          -- nomor urut parent dari prefix angka
          TRY_CONVERT(int, NULLIF(SUBSTRING(m.MENU_PARENT, 1,
              PATINDEX('%[^0-9]%', m.MENU_PARENT + 'X') - 1), ''))    AS PARENT_ORDER,

          -- ID bersih (tanpa angka)
          SUBSTRING(m.MENU_ID,
              PATINDEX('%[^0-9]%', m.MENU_ID + 'X'),
              LEN(m.MENU_ID))                                         AS MENU_ID_CLEAN,

          -- Parent bersih (biarkan null/'menu' apa adanya)
          CASE
            WHEN m.MENU_PARENT IS NULL OR m.MENU_PARENT = 'menu' THEN m.MENU_PARENT
            ELSE SUBSTRING(m.MENU_PARENT,
                   PATINDEX('%[^0-9]%', m.MENU_PARENT + 'X'),
                   LEN(m.MENU_PARENT))
          END                                                         AS MENU_PARENT_CLEAN
        FROM base m
      )
      SELECT *
      FROM q
      ORDER BY
        ISNULL(PARENT_ORDER, 9999),
        ISNULL(ORDER_NO, 9999),
        MENU_ID_CLEAN;
    `;

      const groupedMenus = this.groupMenusByParent(menusQuery);

      const executionTime = Date.now() - startTime;
      try {
        await prismaSC.tB_R_AUDIT_TRAIL.create({
          data: {
            ACTION_TYPE: 'R',
            TABLE_NAME: 'TB_M_MENU',
            TABLE_ITEM: 'getMenu',
            VALUE_BEFORE: null,
            VALUE_AFTER: `Query executed in ${executionTime}ms for user ${username}`,
            MODIFIED_BY: username,
            MODIFIED_DATE: new Date(),
          },
        });
      } catch { }

      return groupedMenus;
    } catch (err) {
      // Saat dev, bagusnya log detail error
      console.error('getMenu error:', err);
      throw new Error('Internal Server Error');
    }
  },


  async getProfile(username: string) {
    try {
      // 1) Ambil user basic info (SC)
      const userRows = await prismaSC.$queryRaw<Array<{
        USERNAME: string;
        FIRST_NAME: string | null;
        LAST_NAME: string | null;
        ID: string;
        REG_NO: string | null;
        COMPANY: string | null;
        BIRTH_DATE: Date | string | null;
        ADDRESS: string | null;
      }>>`
      SELECT
        u.USERNAME,
        u.FIRST_NAME,
        u.LAST_NAME,
        u.ID,
        u.REG_NO,
        u.COMPANY,
        u.BIRTH_DATE,
        u.ADDRESS
      FROM TB_M_USER u
      WHERE u.USERNAME = ${username}
    `;

      const user = userRows[0];
      if (!user) {
        throw new Error('User not found in SC database');
      }

      // 2) Ambil detail company (jika ada)
      const company = user.COMPANY
        ? await prismaSC.tB_M_COMPANY.findFirst({
          where: { ID: user.COMPANY },
          select: {
            ID: true,
            NAME: true,
            DESCRIPTION: true
          },
        })
        : null;

      // 3) Ambil roles, features, functions (paralel)
      const [roles, features, functions] = await Promise.all([
        prismaSC.$queryRaw<Array<{ ID: string; NAME: string; DESCRIPTION: string }>>`
        SELECT DISTINCT r.ID, r.NAME, r.DESCRIPTION
        FROM TB_M_ROLE r
        INNER JOIN TB_M_AUTHORIZATION a ON r.ID = a.ROLE
        WHERE r.APPLICATION = ${applicationId}
          AND a.USERNAME    = ${username}
          AND a.APPLICATION = ${applicationId}
      `,
        prismaSC.$queryRaw<Array<{ ID: string }>>`
        SELECT DISTINCT f.ID
        FROM TB_M_FEATURE f
        INNER JOIN TB_M_AUTHORIZATION a ON f.ID = a.FEATURE
        WHERE f.APPLICATION = ${applicationId}
          AND a.USERNAME    = ${username}
          AND a.APPLICATION = ${applicationId}
      `,
        prismaSC.$queryRaw<Array<{ ID: string }>>`
        SELECT DISTINCT f.ID
        FROM TB_M_FUNCTION f
        INNER JOIN TB_M_AUTHORIZATION a ON f.ID = a.[FUNCTION]
        WHERE f.APPLICATION = ${applicationId}
          AND a.USERNAME    = ${username}
          AND a.APPLICATION = ${applicationId}
      `,
      ]);

      return {
        user: {
          username: user.USERNAME,
          name: `${user.FIRST_NAME ?? ''} ${user.LAST_NAME ?? ''}`.trim(),
          id: user.ID,
          regNo: user.REG_NO,
          company: user.COMPANY,
          firstName: user.FIRST_NAME,
          lastName: user.LAST_NAME,
          birthDate: user.BIRTH_DATE,
          address: user.ADDRESS,
          companyInfo: company
            ? {
              id: company.ID,
              name: company.NAME,
              description: company.DESCRIPTION ?? null
            }
            : null,
          // area/division dihilangkan karena sumbernya tidak tersedia di prisma utama
        },
        features: features.map(f => f.ID),
        functions: functions.map(fn => fn.ID),
        roles: roles.map(r => r.ID),
      };
    } catch {
      throw new Error('Internal Server Error');
    }
  },
  groupMenusByParent(menus: any[]) {
    const strip = (s?: string | null): string | null =>
      s ? s.replace(/^\d+/, '') : s ?? null;

    const rows = menus.map((m) => {
      const rawId = m.MENU_ID ?? '';
      const rawParent = m.MENU_PARENT ?? '';

      const idClean = strip(rawId) ?? '';
      const parentClean =
        rawParent === 'menu' || !rawParent ? 'menu' : strip(rawParent) ?? 'menu';
      const orderNo = parseInt((rawId.match(/^\d+/)?.[0] ?? '9999'), 20);

      return {
        menuId: idClean,
        menuText: m.MENU_TEXT ?? '',
        menuTips: m.MENU_TIPS ?? '',
        isActive: m.IS_ACTIVE ?? false,
        visibility: m.VISIBILITY ?? false,
        url: m.URL ?? '',
        glyph: m.GLYPH ?? '',
        separator: m.SEPARATOR ?? '',
        target: m.TARGET ?? '',
        parent: parentClean,
        orderNo,
      };
    });

    const byId = new Map<string, any>();
    for (const r of rows) byId.set(r.menuId, { ...r, submenu: [] });

    const roots: any[] = [];
    for (const r of rows) {
      const node = byId.get(r.menuId)!;
      if (r.parent && r.parent !== 'menu' && byId.has(r.parent)) {
        byId.get(r.parent)!.submenu.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortByOrder = (a: any, b: any) => (a.orderNo ?? 9999) - (b.orderNo ?? 9999);
    const sortTree = (nodes: any[]) => {
      nodes.sort(sortByOrder);
      nodes.forEach(n => n.submenu && n.submenu.length && sortTree(n.submenu));
    };
    sortTree(roots);

    return roots;
  }



};
