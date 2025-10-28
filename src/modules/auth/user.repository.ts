import { prismaSC } from '../../db/prisma';
import type { User } from '../../types/auth.js';
import { TB_M_USER } from '../../generated/prisma-sc/index';

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
export const userRepository = {
  async login(username: string): Promise<InternalUser | null> {
    const dbUser = await prismaSC.tB_M_USER.findFirst({
      where: { USERNAME: username },
      select: {
        ID: true,
        USERNAME: true,
        PASSWORD: true,
      },
    });
    if (!dbUser) return null;
    const roles = await prismaSC.$queryRaw<Array<{ ID: string; NAME: string }>>`
      SELECT DISTINCT r.ID, r.NAME
      FROM TB_M_ROLE r
      INNER JOIN TB_M_AUTHORIZATION a ON r.ID = a.ROLE
      WHERE r.APPLICATION = 'SARSYS'
    `;
    // console.log("roles", roles)

    const primaryRoleName = roles?.[0]?.NAME ?? 'ADMIN';

    return {
      id: dbUser.ID,
      username: dbUser.USERNAME,
      password: dbUser.PASSWORD,
      name: dbUser.USERNAME,
      role: primaryRoleName as User['role'],
    };
  },

  async getMenu(username: string) {
    const startTime = Date.now();
    try {
      const menus = await prismaSC.$queryRaw<MenuRow[]>`
      SELECT
        m.MENU_ID,
        m.MENU_PARENT,
        m.MENU_TEXT,
        m.MENU_TIPS,
        m.IS_ACTIVE,
        m.VISIBILITY,
        m.URL,
        m.GLYPH,
        m.SEPARATOR,
        m.TARGET
      FROM TB_M_MENU m
      INNER JOIN TB_M_MENU_AUTHORIZATION ma ON m.MENU_ID = ma.MENU_ID
      INNER JOIN TB_M_AUTHORIZATION a ON (
        (ma.ROLE_ID IS NOT NULL AND ma.ROLE_ID = a.ROLE) OR
        (ma.FUNCTION_ID IS NOT NULL AND ma.FUNCTION_ID = a.[FUNCTION]) OR
        (ma.FEATURE_ID IS NOT NULL AND ma.FEATURE_ID = a.FEATURE)
      )
      WHERE m.APP_ID = 'SARSYS'
        AND ma.APP_ID = 'SARSYS'
        AND a.USERNAME = ${username}
        AND a.APPLICATION = 'SARSYS'
      ORDER BY
        m.MENU_PARENT,
        m.MENU_ID,
        CASE WHEN m.MENU_TEXT = 'Dashboard' THEN 0 ELSE 1 END
    `;

      const tree = buildMenuTree(menus);
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

      return tree;
    } catch (error) {
      throw new Error('Internal Server Error');
    }
  },

  async getProfile(username: string) {
  try {
    let userMain: any = null;

    const roles = await prismaSC.$queryRaw<Array<{ ID: string; NAME: string; DESCRIPTION: string }>>`
      SELECT DISTINCT r.ID, r.NAME, r.DESCRIPTION
      FROM TB_M_ROLE r
      INNER JOIN TB_M_AUTHORIZATION a ON r.ID = a.ROLE
      WHERE r.APPLICATION = 'PULLSYS'
        AND a.USERNAME   = ${username}
        AND a.APPLICATION = 'PULLSYS'
    `;

      userMain = await prismaSC.tB_M_COMPANY
      if (!userMain) {
        throw new Error('User not found tpm');
      }

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
    if (!user) throw new Error('User not found in SC database');

    const features = await prismaSC.$queryRaw<Array<{ ID: string }>>`
      SELECT DISTINCT f.ID
      FROM TB_M_FEATURE f
      INNER JOIN TB_M_AUTHORIZATION a ON f.ID = a.FEATURE
      WHERE f.APPLICATION = 'PULLSYS'
        AND a.USERNAME   = ${username}
        AND a.APPLICATION = 'PULLSYS'
    `;

    const functions = await prismaSC.$queryRaw<Array<{ ID: string }>>`
      SELECT DISTINCT f.ID
      FROM TB_M_FUNCTION f
      INNER JOIN TB_M_AUTHORIZATION a ON f.ID = a.[FUNCTION]
      WHERE f.APPLICATION = 'PULLSYS'
        AND a.USERNAME   = ${username}
        AND a.APPLICATION = 'PULLSYS'
    `;

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
        companyInfo: userMain?.COMPANY
          ? {
              id: userMain.COMPANY.COMPANY_ID,
              name: userMain.COMPANY.COMPANY_NAME,
              code: userMain.COMPANY.COMPANY_CODE,
              address: userMain.COMPANY.ADDRESS,
              picName: userMain.COMPANY.PIC_NAME,
              phoneNumber: userMain.COMPANY.PHONE_NUMBER,
              officeNumber: userMain.COMPANY.OFFICE_NUMBER,
            }
          : null,
        area: userMain?.AREA
          ? {
              id: userMain.AREA.SYSTEM_ID,
              description: userMain.AREA.DESCRIPTION,
              name: userMain.AREA.SYS_VAL_TXT,
            }
          : null,
        division: userMain?.DIVISION
          ? {
              id: userMain.DIVISION.SYSTEM_ID,
              description: userMain.DIVISION.DESCRIPTION,
              name: userMain.DIVISION.SYS_VAL_TXT,
            }
          : null,
      },
      features: features.map(f => f.ID),
      functions: functions.map(fn => fn.ID),
      roles: roles.map(r => r.ID),
    };
  } catch (e) {
    throw new Error('Internal Server Error');
  }
}

};
