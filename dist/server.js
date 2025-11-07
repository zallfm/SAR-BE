var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/api/tdd/tdd-evidence.controller.ts
import * as path from "path";
import { fileURLToPath } from "url";
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import ExcelJS2 from "exceljs";
async function getFunctionEvidence(moduleName, functionName) {
  const evidenceFile = path.join(evidenceDir, `${moduleName}.json`);
  if (!existsSync(evidenceFile)) {
    return null;
  }
  try {
    const content = await readFile(evidenceFile, "utf-8");
    const data = JSON.parse(content);
    return data.functions.find((f) => f.functionName === functionName) || null;
  } catch (error) {
    console.error(`Error reading evidence for ${moduleName}/${functionName}:`, error);
    return null;
  }
}
async function getModuleEvidence(moduleName) {
  const evidenceFile = path.join(evidenceDir, `${moduleName}.json`);
  if (!existsSync(evidenceFile)) {
    return null;
  }
  try {
    const content = await readFile(evidenceFile, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading evidence for module ${moduleName}:`, error);
    return null;
  }
}
async function getAllEvidence() {
  if (!existsSync(evidenceDir)) {
    return [];
  }
  try {
    const files = await readdir(evidenceDir);
    const evidenceFiles = files.filter((f) => f.endsWith(".json") && f !== "_summary.json");
    const allEvidence = [];
    for (const file of evidenceFiles) {
      try {
        const content = await readFile(path.join(evidenceDir, file), "utf-8");
        const data = JSON.parse(content);
        allEvidence.push(data);
      } catch (error) {
        console.error(`Error reading evidence file ${file}:`, error);
      }
    }
    return allEvidence;
  } catch (error) {
    console.error("Error reading evidence directory:", error);
    return [];
  }
}
async function exportEvidenceToExcel(moduleName) {
  const wb = new ExcelJS2.Workbook();
  const loadTDDData = async (module) => {
    const dataFile = path.join(tddDataDir, `${module}.json`);
    if (existsSync(dataFile)) {
      try {
        const content = await readFile(dataFile, "utf-8");
        return JSON.parse(content);
      } catch (error) {
        return null;
      }
    }
    return null;
  };
  const wsOverview = wb.addWorksheet("Functions Overview");
  wsOverview.columns = [
    { header: "Module", key: "module", width: 15 },
    { header: "Function", key: "function", width: 25 },
    { header: "Status", key: "status", width: 12 },
    { header: "Coverage Statements", key: "coverageStatements", width: 18 },
    { header: "Coverage Branches", key: "coverageBranches", width: 18 },
    { header: "Coverage Functions", key: "coverageFunctions", width: 18 },
    { header: "Coverage Lines", key: "coverageLines", width: 15 },
    { header: "Last Test Run", key: "lastTestRun", width: 20 },
    { header: "Test Scenarios Count", key: "testScenariosCount", width: 18 }
  ];
  const wsScenarios = wb.addWorksheet("Test Scenarios");
  wsScenarios.columns = [
    { header: "Module", key: "module", width: 15 },
    { header: "Function", key: "function", width: 25 },
    { header: "Scenario ID", key: "scenarioId", width: 20 },
    { header: "Phase", key: "phase", width: 12 },
    { header: "Status", key: "status", width: 12 },
    { header: "Test File", key: "testFile", width: 40 },
    { header: "Timestamp", key: "timestamp", width: 20 }
  ];
  const wsEvidence = wb.addWorksheet("Evidence Data");
  wsEvidence.columns = [
    { header: "Module", key: "module", width: 15 },
    { header: "Function", key: "function", width: 25 },
    { header: "Test Output", key: "testOutput", width: 50 },
    { header: "Code Snippets Count", key: "codeSnippetsCount", width: 18 },
    { header: "Screenshots Count", key: "screenshotsCount", width: 18 }
  ];
  const wsDOD = wb.addWorksheet("DOD & Acceptance Criteria");
  wsDOD.columns = [
    { header: "Module", key: "module", width: 15 },
    { header: "Function", key: "function", width: 25 },
    { header: "Criteria Type", key: "criteriaType", width: 20 },
    { header: "Criteria ID", key: "criteriaId", width: 20 },
    { header: "Description", key: "description", width: 50 },
    { header: "Status", key: "status", width: 12 },
    { header: "Evidence", key: "evidence", width: 30 }
  ];
  const wsCoverage = wb.addWorksheet("Coverage Summary");
  wsCoverage.columns = [
    { header: "Module", key: "module", width: 15 },
    { header: "Function", key: "function", width: 25 },
    { header: "Statements %", key: "statements", width: 15 },
    { header: "Branches %", key: "branches", width: 15 },
    { header: "Functions %", key: "functions", width: 15 },
    { header: "Lines %", key: "lines", width: 15 },
    { header: "Overall Coverage", key: "overall", width: 15 }
  ];
  const allEvidence = moduleName ? await getModuleEvidence(moduleName) ? [await getModuleEvidence(moduleName)] : [] : await getAllEvidence();
  for (const moduleEvidence of allEvidence) {
    if (!moduleEvidence) continue;
    const tddData = await loadTDDData(moduleEvidence.module);
    for (const funcEvidence of moduleEvidence.functions) {
      wsOverview.addRow({
        module: moduleEvidence.module,
        function: funcEvidence.functionName,
        status: funcEvidence.testStatus,
        coverageStatements: `${funcEvidence.coverage.statements.toFixed(2)}%`,
        coverageBranches: `${funcEvidence.coverage.branches.toFixed(2)}%`,
        coverageFunctions: `${funcEvidence.coverage.functions.toFixed(2)}%`,
        coverageLines: `${funcEvidence.coverage.lines.toFixed(2)}%`,
        lastTestRun: funcEvidence.lastTestRun,
        testScenariosCount: funcEvidence.testScenarios.length
      });
      for (const scenario of funcEvidence.testScenarios) {
        wsScenarios.addRow({
          module: moduleEvidence.module,
          function: funcEvidence.functionName,
          scenarioId: scenario.scenarioId,
          phase: scenario.phase,
          status: scenario.status,
          testFile: scenario.testFile,
          timestamp: scenario.timestamp
        });
      }
      wsEvidence.addRow({
        module: moduleEvidence.module,
        function: funcEvidence.functionName,
        testOutput: funcEvidence.evidence.testOutput,
        codeSnippetsCount: funcEvidence.evidence.codeSnippets.length,
        screenshotsCount: funcEvidence.evidence.screenshots?.length || 0
      });
      if (tddData) {
        const func = tddData.functions?.find((f) => f.name === funcEvidence.functionName);
        if (func?.dod) {
          if (func.dod.criteria) {
            for (const criteria of func.dod.criteria) {
              wsDOD.addRow({
                module: moduleEvidence.module,
                function: funcEvidence.functionName,
                criteriaType: "DOD",
                criteriaId: criteria.id,
                description: criteria.description,
                status: criteria.status,
                evidence: criteria.evidence || ""
              });
            }
          }
          if (func.dod.acceptanceCriteria) {
            for (const ac of func.dod.acceptanceCriteria) {
              wsDOD.addRow({
                module: moduleEvidence.module,
                function: funcEvidence.functionName,
                criteriaType: "Acceptance Criteria",
                criteriaId: ac.id,
                description: ac.description,
                status: ac.status,
                evidence: ac.testScenarioId || ""
              });
            }
          }
        }
      }
      const overall = (funcEvidence.coverage.statements + funcEvidence.coverage.branches + funcEvidence.coverage.functions + funcEvidence.coverage.lines) / 4;
      wsCoverage.addRow({
        module: moduleEvidence.module,
        function: funcEvidence.functionName,
        statements: `${funcEvidence.coverage.statements.toFixed(2)}%`,
        branches: `${funcEvidence.coverage.branches.toFixed(2)}%`,
        functions: `${funcEvidence.coverage.functions.toFixed(2)}%`,
        lines: `${funcEvidence.coverage.lines.toFixed(2)}%`,
        overall: `${overall.toFixed(2)}%`
      });
    }
  }
  [wsOverview, wsScenarios, wsEvidence, wsDOD, wsCoverage].forEach((ws) => {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" }
    };
  });
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
var __filename, __dirname, projectRoot, evidenceDir, tddDataDir;
var init_tdd_evidence_controller = __esm({
  "src/api/tdd/tdd-evidence.controller.ts"() {
    "use strict";
    __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
    projectRoot = path.resolve(__dirname, "../../../");
    evidenceDir = path.join(projectRoot, "tdd-docs", "src", "data", "evidence");
    tddDataDir = path.join(projectRoot, "tdd-docs", "src", "data");
  }
});

// src/api/tdd/tdd.routes.ts
var tdd_routes_exports = {};
__export(tdd_routes_exports, {
  tddRoutes: () => tddRoutes
});
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { readFile as readFile2, stat } from "fs/promises";
import { existsSync as existsSync2 } from "fs";
async function tddRoutes(app) {
  const tddDocsPath = path2.join(__dirname2, "../../../tdd-docs/src");
  app.get("/tdd/api/modules", async (request, reply) => {
    const modules = [
      { name: "auth", displayName: "Authentication", description: "User authentication and authorization" },
      { name: "application", displayName: "Application", description: "Application master data management" },
      { name: "schedule", displayName: "Schedule", description: "Schedule management" },
      { name: "uarpic", displayName: "UAR PIC", description: "UAR Person in Charge management" },
      { name: "master_config", displayName: "Master Config", description: "System configuration management" },
      { name: "log_monitoring", displayName: "Log Monitoring", description: "Logging and monitoring" },
      { name: "uar_division", displayName: "UAR Division", description: "UAR Division management" },
      { name: "uar_generate", displayName: "UAR Generate", description: "UAR generation process" },
      { name: "batch", displayName: "Batch Services", description: "Batch processing services" }
    ];
    return reply.send({ modules });
  });
  app.get("/tdd/api/modules/:moduleName", async (request, reply) => {
    const { moduleName } = request.params;
    const dataPath = path2.join(__dirname2, "../../../tdd-docs/src/data", `${moduleName}.json`);
    try {
      const data = await readFile2(dataPath, "utf-8");
      return reply.type("application/json").send(JSON.parse(data));
    } catch (error) {
      return reply.status(404).send({ error: `Module ${moduleName} not found` });
    }
  });
  app.get("/tdd/api/evidence/:module/:function", async (request, reply) => {
    const { module, function: functionName } = request.params;
    try {
      const evidence = await getFunctionEvidence(module, functionName);
      if (!evidence) {
        return reply.status(404).send({ error: `Evidence not found for ${module}/${functionName}` });
      }
      return reply.send(evidence);
    } catch (error) {
      return reply.status(500).send({ error: "Failed to get evidence" });
    }
  });
  app.get("/tdd/api/evidence/:module", async (request, reply) => {
    const { module } = request.params;
    try {
      const evidence = await getModuleEvidence(module);
      if (!evidence) {
        return reply.status(404).send({ error: `Evidence not found for module ${module}` });
      }
      return reply.send(evidence);
    } catch (error) {
      return reply.status(500).send({ error: "Failed to get evidence" });
    }
  });
  app.get("/tdd/api/evidence", async (request, reply) => {
    try {
      const allEvidence = await getAllEvidence();
      return reply.send({ evidence: allEvidence });
    } catch (error) {
      return reply.status(500).send({ error: "Failed to get evidence" });
    }
  });
  app.get("/tdd/api/evidence/export", async (request, reply) => {
    const { module } = request.query;
    try {
      const buffer = await exportEvidenceToExcel(module);
      const dateStamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const filename = module ? `TDD_Evidence_${module}_${dateStamp}.xlsx` : `TDD_Evidence_All_${dateStamp}.xlsx`;
      return reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").header("Content-Disposition", `attachment; filename="${filename}"`).send(buffer);
    } catch (error) {
      console.error("Error exporting evidence:", error);
      return reply.status(500).send({ error: "Failed to export evidence" });
    }
  });
  app.get("/tdd", async (request, reply) => {
    const indexPath = path2.join(tddDocsPath, "index.html");
    try {
      const html = await readFile2(indexPath, "utf-8");
      return reply.type("text/html").send(html);
    } catch (error) {
      return reply.status(404).send({ error: "TDD documentation not found" });
    }
  });
  app.get("/tdd/*", async (request, reply) => {
    const url = request.url;
    if (url.startsWith("/tdd/api/")) {
      return reply.callNotFound();
    }
    const relativePath = url.replace("/tdd/", "") || "index.html";
    const filePath = path2.join(tddDocsPath, relativePath);
    if (existsSync2(filePath)) {
      try {
        const stats = await stat(filePath);
        if (stats.isFile()) {
          const content = await readFile2(filePath);
          const ext = path2.extname(filePath).toLowerCase();
          const contentTypeMap = {
            ".html": "text/html",
            ".js": "application/javascript",
            ".css": "text/css",
            ".json": "application/json",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon"
          };
          return reply.type(contentTypeMap[ext] || "application/octet-stream").send(content);
        }
      } catch (error) {
      }
    }
    const indexPath = path2.join(tddDocsPath, "index.html");
    try {
      const html = await readFile2(indexPath, "utf-8");
      return reply.type("text/html").send(html);
    } catch (error) {
      return reply.status(404).send({ error: "TDD documentation not found" });
    }
  });
}
var __filename2, __dirname2;
var init_tdd_routes = __esm({
  "src/api/tdd/tdd.routes.ts"() {
    "use strict";
    init_tdd_evidence_controller();
    __filename2 = fileURLToPath2(import.meta.url);
    __dirname2 = path2.dirname(__filename2);
  }
});

// src/server.ts
import "dotenv/config";

// src/app.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyJWT from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import fastifyCookie from "@fastify/cookie";

// src/config/env.ts
var env = {
  PORT: Number(process.env.PORT ?? 3e3),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DB_URL: process.env.DB_URL ?? "localhost",
  DB_PORT: Number(process.env.DB_PORT ?? 5432),
  DB_USER: process.env.DB_USER ?? "mssql",
  DB_NAME: process.env.DB_NAME ?? "",
  DB_PASSWORD: process.env.DB_PASSWORD ?? "",
  FE_PROD: process.env.FE_PROD ?? "http://localhost:5173",
  HRPORTAL_API: process.env.HRPORTAL_API ?? "unknown",
  HRPORTAL_USER: process.env.HRPORTAL_USER ?? "unknown",
  HRPORTAL_PASS: process.env.HRPORTAL_PASS ?? "unknown",
  JWT_SECRET: process.env.JWT_SECRET ?? "changeme",
  TOKEN_EXPIRES_IN: Number(process.env.TOKEN_EXPIRES_IN ?? 8 * 60 * 60),
  RATE_LIMIT_PER_MINUTE: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 60),
  LOCKOUT_MAX_ATTEMPTS: Number(process.env.LOCKOUT_MAX_ATTEMPTS ?? 5),
  LOCKOUT_WINDOW_MS: Number(process.env.LOCKOUT_WINDOW_MS ?? 15 * 60 * 1e3),
  MOCK_USER_ADMIN_USERNAME: process.env.MOCK_USER_ADMIN_USERNAME ?? "admin21",
  MOCK_USER_ADMIN_PASSWORD: process.env.MOCK_USER_ADMIN_PASSWORD ?? "password123212",
  MOCK_USER_ADMIN_NAME: process.env.MOCK_USER_ADMIN_NAME ?? "Admin User",
  MOCK_USER_ADMIN_ROLE: process.env.MOCK_USER_ADMIN_ROLE ?? "Admin"
};

// src/plugins/securityHeaders.ts
import fp from "fastify-plugin";
var securityPlugin = fp(async (app) => {
  app.addHook("onRequest", async (req, reply) => {
    reply.header("x-frame-options", "DENY");
    reply.header("x-content-type-options", "nosniff");
    reply.header("referrer-policy", "no-referrer");
  });
});

// src/core/observability/requestId.ts
import fp2 from "fastify-plugin";
import { randomUUID } from "crypto";
var requestIdPlugin = fp2(async (app) => {
  app.addHook("onRequest", async (req, reply) => {
    const incoming = req.headers["x-request-id"] || randomUUID();
    req.id = incoming;
    reply.header("x-request-id", incoming);
  });
});

// src/db/prisma.ts
import { PrismaClient as PrismaSC } from "./generated/prisma-sc/index.js";
import { PrismaClient as PrismaSAR } from "./generated/prisma/index.js";
var prisma = global.prisma || new PrismaSAR({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
var prismaSC = global.prismaSC || new PrismaSC({
  log: ["error"]
});
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
  global.prismaSC = prismaSC;
}

// src/modules/auth/hrPortal.ts
import Axios from "axios";
import https from "https";
import { z } from "zod";
var userSchema = z.object({
  username: z.string(),
  password: z.string()
});
var menuSchema = z.array(
  z.object({
    menuId: z.string(),
    menuText: z.string(),
    menuTips: z.string(),
    isActive: z.string(),
    visibility: z.string(),
    url: z.string(),
    glyph: z.string(),
    separator: z.string(),
    target: z.string().nullable(),
    submenu: z.array(
      z.object({
        menuId: z.string(),
        menuText: z.string(),
        menuTips: z.string(),
        isActive: z.string(),
        visibility: z.string(),
        url: z.string(),
        glyph: z.string(),
        separator: z.string(),
        target: z.string().nullable()
      })
    ).optional()
  })
);
var employeeSchema = z.object({
  NOREG: z.string(),
  NAME: z.string(),
  CLASS: z.string(),
  POSITION: z.string(),
  STATUS: z.string(),
  DIRECTORATE: z.string(),
  DIVISION: z.string(),
  DEPARTMENT: z.string(),
  SECTION: z.string(),
  LINE: z.string().optional(),
  GROUP: z.string().optional(),
  UNIT_CODE: z.string(),
  MAIN_LOCATION: z.string(),
  SUB_LOCATION: z.string(),
  EMAIL: z.string().email(),
  PHONE_EXT: z.string(),
  GENDER_DESC: z.string()
});
var superiorSchema = z.object({
  NGH: z.string().nullable(),
  NGH_NAME: z.string().nullable(),
  NLH: z.string().nullable(),
  NLH_NAME: z.string().nullable(),
  NSH: z.string().nullable(),
  NSH_NAME: z.string().nullable(),
  NDPH: z.string().nullable(),
  NDPH_NAME: z.string().nullable(),
  NDH: z.string().nullable(),
  NDH_NAME: z.string().nullable(),
  NDIR: z.string().nullable(),
  NDIR_NAME: z.string().nullable()
});
var gadUserSchema = z.object({
  MAIL: z.string().email(),
  NOREG: z.string(),
  PERSONNEL_NAME: z.string(),
  POSITION_NAME: z.string(),
  CLASS: z.string(),
  POSITION_CODE: z.number().int(),
  POSITION_TITLE: z.string(),
  POSITION_LEVEL: z.number().int(),
  JOB_CODE: z.number().int(),
  JOB_TITLE: z.string(),
  DIRECTORATE_ID: z.number().int(),
  DIRECTORATE_NAME: z.string(),
  DIVISION_ID: z.number().int(),
  DIVISION_NAME: z.string(),
  DEPARTMENT_ID: z.number().int(),
  DEPARTMENT_NAME: z.string(),
  SECTION_ID: z.number().int(),
  SECTION_NAME: z.string(),
  LINE_ID: z.number().nullable(),
  LINE_NAME: z.string().nullable(),
  GROUP_ID: z.number().nullable(),
  GROUP_NAME: z.string().nullable(),
  ORG_ID: z.number().int(),
  ORG_TITLE: z.string(),
  ORG_LEVEL_ID: z.number().int(),
  USERNAME: z.string().nullable(),
  VALID_FROM: z.string(),
  VALID_TO: z.string(),
  DELIMIT_DATE: z.string().nullable()
});
var getByNoreg = z.object({
  params: z.object({ NOREG: z.string() })
});
var LoginReqSchema = z.object({
  body: userSchema
});
var GetSuperiorResponse = z.object({
  body: z.array(z.object(superiorSchema.shape))
});
var GetGADResponse = z.object({
  body: z.array(z.object(gadUserSchema.shape))
});
var roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string()
});
var companyInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  address: z.string().nullable(),
  picName: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  officeNumber: z.string().nullable()
});
var areaInfoSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  name: z.string().nullable()
});
var divisionInfoSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  name: z.string().nullable()
});
var profileResponseSchema = z.object({
  user: z.object({
    username: z.string(),
    name: z.string(),
    id: z.string(),
    regNo: z.string(),
    company: z.string().nullable(),
    firstName: z.string(),
    lastName: z.string().nullable(),
    gender: z.string(),
    birthDate: z.string().nullable(),
    address: z.string().nullable(),
    companyInfo: companyInfoSchema.nullable(),
    area: areaInfoSchema.nullable(),
    division: divisionInfoSchema.nullable()
  }),
  features: z.array(z.string()),
  functions: z.array(z.string()),
  roles: z.array(z.string())
});
var GetProfileResponse = z.object({
  body: profileResponseSchema
});
var HRPortalClient = class {
  api;
  constructor() {
    this.api = Axios.create({
      baseURL: env.HRPORTAL_API,
      auth: {
        username: env.HRPORTAL_USER,
        password: env.HRPORTAL_PASS
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 1e4
      // 10 second timeout
    });
  }
  // Helper method to convert object to URL-encoded string
  urlEncode(data) {
    return Object.keys(data).map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`
    ).join("&");
  }
  /**
   * Authenticate user credentials against HR Portal API
   * @param username - User's username
   * @param password - User's password
   * @returns Promise<HRPortalAuthResponse> - Authentication result
   */
  async checkSCMobile(username, password) {
    try {
      const authData = {
        mobileno: "0",
        username,
        password
      };
      const response = await this.api.post(
        "/Login/CheckSCMobile",
        this.urlEncode(authData)
      );
      return {
        success: true,
        message: "Authentication successful"
      };
    } catch (error) {
      const axiosError = error;
      if (axiosError.response) {
        const status = axiosError.response.status;
        if (status === 401 || status === 403) {
          return {
            success: false,
            message: "Invalid credentials"
          };
        } else if (status >= 500) {
          return {
            success: false,
            message: "HR Portal service unavailable"
          };
        } else {
          return {
            success: false,
            message: "Authentication failed"
          };
        }
      } else if (axiosError.request) {
        return {
          success: false,
          message: "HR Portal service unavailable"
        };
      } else {
        return {
          success: false,
          message: "Authentication failed"
        };
      }
    }
  }
};
var hrPortalClient = new HRPortalClient();

// src/modules/auth/user.repository.ts
var userRepository = {
  async login(username, password) {
    const dbUser = await prismaSC.tB_M_USER.findFirst({
      where: {
        USERNAME: username,
        TB_M_USER_APPLICATION: {
          some: {
            APPLICATION: "SARSYS"
          }
        }
      }
      // select: { ID: true, USERNAME: true, PASSWORD: true },
    });
    if (!dbUser) {
      throw new Error("Username or password incorrect");
    }
    if (dbUser.IN_ACTIVE_DIRECTORY) {
      console.log(
        `User ${username} has IN_ACTIVE_DIRECTORY=1, authenticating via HR Portal`
      );
      const hrPortalAuth = await hrPortalClient.checkSCMobile(
        username,
        password
      );
      if (!hrPortalAuth.success) {
        throw new Error("Username or password incorrect");
      }
    } else {
      console.log(
        `User ${username} has IN_ACTIVE_DIRECTORY=0, using local password verification`
      );
      if (dbUser.PASSWORD !== password) {
        throw new Error("Username or password incorrect");
      }
    }
    const roles = await prismaSC.$queryRaw`
      SELECT DISTINCT r.ID, r.NAME
      FROM TB_M_ROLE r
      INNER JOIN TB_M_AUTHORIZATION a ON r.ID = a.ROLE
      WHERE r.APPLICATION = 'SARSYS'
        AND a.APPLICATION = 'SARSYS'
        AND a.USERNAME = ${username}
      ORDER BY r.ID
    `;
    const primary = roles?.[0];
    const dynamicRole = (primary?.NAME ?? "Administrator").toUpperCase();
    return {
      id: dbUser.ID,
      username: dbUser.USERNAME,
      password: dbUser.PASSWORD,
      name: dbUser.USERNAME,
      divisionId: 2,
      noreg: "100000",
      role: dynamicRole
      // contoh: "DPH", "SO", "ADMINISTRATOR"
    };
  },
  async getMenu(username) {
    const startTime = Date.now();
    try {
      const menusQuery = await prismaSC.$queryRaw`
      WITH auth AS (
        SELECT [ROLE], [FUNCTION], [FEATURE]
        FROM dbo.TB_M_AUTHORIZATION
        WHERE [USERNAME] = ${username} AND [APPLICATION] = 'SARSYS'
      ),
      base AS (
        SELECT m.*
        FROM dbo.TB_M_MENU m
        JOIN dbo.TB_M_MENU_AUTHORIZATION ma ON m.MENU_ID = ma.MENU_ID
        JOIN auth a ON
             (ma.ROLE_ID     IS NOT NULL AND ma.ROLE_ID     = a.[ROLE])
          OR (ma.FUNCTION_ID IS NOT NULL AND ma.FUNCTION_ID = a.[FUNCTION])
          OR (ma.FEATURE_ID  IS NOT NULL AND ma.FEATURE_ID  = a.[FEATURE])
        WHERE m.APP_ID = 'SARSYS' AND ma.APP_ID = 'SARSYS'
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
            ACTION_TYPE: "R",
            TABLE_NAME: "TB_M_MENU",
            TABLE_ITEM: "getMenu",
            VALUE_BEFORE: null,
            VALUE_AFTER: `Query executed in ${executionTime}ms for user ${username}`,
            MODIFIED_BY: username,
            MODIFIED_DATE: /* @__PURE__ */ new Date()
          }
        });
      } catch {
      }
      return groupedMenus;
    } catch (err) {
      console.error("getMenu error:", err);
      throw new Error("Internal Server Error");
    }
  },
  async getProfile(username) {
    try {
      const userRows = await prismaSC.$queryRaw`
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
        throw new Error("User not found in SC database");
      }
      const company = user.COMPANY ? await prismaSC.tB_M_COMPANY.findFirst({
        where: { ID: user.COMPANY },
        select: {
          ID: true,
          NAME: true,
          DESCRIPTION: true
        }
      }) : null;
      const [roles, features, functions] = await Promise.all([
        prismaSC.$queryRaw`
        SELECT DISTINCT r.ID, r.NAME, r.DESCRIPTION
        FROM TB_M_ROLE r
        INNER JOIN TB_M_AUTHORIZATION a ON r.ID = a.ROLE
        WHERE r.APPLICATION = 'SARSYS'
          AND a.USERNAME    = ${username}
          AND a.APPLICATION = 'SARSYS'
      `,
        prismaSC.$queryRaw`
        SELECT DISTINCT f.ID
        FROM TB_M_FEATURE f
        INNER JOIN TB_M_AUTHORIZATION a ON f.ID = a.FEATURE
        WHERE f.APPLICATION = 'SARSYS'
          AND a.USERNAME    = ${username}
          AND a.APPLICATION = 'SARSYS'
      `,
        prismaSC.$queryRaw`
        SELECT DISTINCT f.ID
        FROM TB_M_FUNCTION f
        INNER JOIN TB_M_AUTHORIZATION a ON f.ID = a.[FUNCTION]
        WHERE f.APPLICATION = 'SARSYS'
          AND a.USERNAME    = ${username}
          AND a.APPLICATION = 'SARSYS'
      `
      ]);
      return {
        user: {
          username: user.USERNAME,
          name: `${user.FIRST_NAME ?? ""} ${user.LAST_NAME ?? ""}`.trim(),
          id: user.ID,
          regNo: user.REG_NO,
          company: user.COMPANY,
          firstName: user.FIRST_NAME,
          lastName: user.LAST_NAME,
          birthDate: user.BIRTH_DATE,
          address: user.ADDRESS,
          companyInfo: company ? {
            id: company.ID,
            name: company.NAME,
            description: company.DESCRIPTION ?? null
          } : null
          // area/division dihilangkan karena sumbernya tidak tersedia di prisma utama
        },
        features: features.map((f) => f.ID),
        functions: functions.map((fn) => fn.ID),
        roles: roles.map((r) => r.ID)
      };
    } catch {
      throw new Error("Internal Server Error");
    }
  },
  groupMenusByParent(menus) {
    const strip = (s) => s ? s.replace(/^\d+/, "") : s ?? null;
    const rows = menus.map((m) => {
      const rawId = m.MENU_ID ?? "";
      const rawParent = m.MENU_PARENT ?? "";
      const idClean = strip(rawId) ?? "";
      const parentClean = rawParent === "menu" || !rawParent ? "menu" : strip(rawParent) ?? "menu";
      const orderNo = parseInt(rawId.match(/^\d+/)?.[0] ?? "9999", 20);
      return {
        menuId: idClean,
        menuText: m.MENU_TEXT ?? "",
        menuTips: m.MENU_TIPS ?? "",
        isActive: m.IS_ACTIVE ?? false,
        visibility: m.VISIBILITY ?? false,
        url: m.URL ?? "",
        glyph: m.GLYPH ?? "",
        separator: m.SEPARATOR ?? "",
        target: m.TARGET ?? "",
        parent: parentClean,
        orderNo
      };
    });
    const byId = /* @__PURE__ */ new Map();
    for (const r of rows) byId.set(r.menuId, { ...r, submenu: [] });
    const roots = [];
    for (const r of rows) {
      const node = byId.get(r.menuId);
      if (r.parent && r.parent !== "menu" && byId.has(r.parent)) {
        byId.get(r.parent).submenu.push(node);
      } else {
        roots.push(node);
      }
    }
    const sortByOrder = (a, b) => (a.orderNo ?? 9999) - (b.orderNo ?? 9999);
    const sortTree = (nodes) => {
      nodes.sort(sortByOrder);
      nodes.forEach(
        (n) => n.submenu && n.submenu.length && sortTree(n.submenu)
      );
    };
    sortTree(roots);
    return roots;
  }
};

// src/utils/crypto.ts
import { timingSafeEqual, createHash } from "crypto";
function safeCompare(a, b) {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}

// src/core/errors/applicationError.ts
var ApplicationError = class extends Error {
  constructor(code, message, details, requestId, statusCode = 400) {
    super(message);
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.statusCode = statusCode;
    this.name = "ApplicationError";
  }
  toResponse() {
    return {
      code: this.code,
      message: this.message,
      requestId: this.requestId,
      ...this.details ? { details: this.details } : {}
    };
  }
};

// src/core/errors/errorCodes.ts
var ERROR_CODES = {
  // Authentication (AUTH-ERR-0xx)
  AUTH_INVALID_CREDENTIALS: "AUTH-ERR-001",
  AUTH_SESSION_EXPIRED: "AUTH-ERR-002",
  AUTH_INSUFFICIENT_PERMISSIONS: "AUTH-ERR-003",
  AUTH_ACCOUNT_LOCKED: "AUTH-ERR-004",
  AUTH_TOKEN_INVALID: "AUTH-ERR-005",
  // Application Management (APP-ERR-1xx)
  APP_NOT_FOUND: "APP-ERR-101",
  APP_ALREADY_EXISTS: "APP-ERR-102",
  APP_INVALID_DATA: "APP-ERR-103",
  APP_CREATE_FAILED: "APP-ERR-104",
  APP_UPDATE_FAILED: "APP-ERR-105",
  APP_DELETE_FAILED: "APP-ERR-106",
  // UAR Operations (UAR-ERR-2xx)
  UAR_RECORD_NOT_FOUND: "UAR-ERR-201",
  UAR_ALREADY_REVIEWED: "UAR-ERR-202",
  UAR_REVIEW_INCOMPLETE: "UAR-ERR-203",
  UAR_APPROVAL_FAILED: "UAR-ERR-204",
  UAR_STATUS_INVALID: "UAR-ERR-205",
  // Validation (VAL-ERR-3xx)
  VAL_REQUIRED_FIELD: "VAL-ERR-301",
  VAL_INVALID_FORMAT: "VAL-ERR-302",
  VAL_OUT_OF_RANGE: "VAL-ERR-303",
  VAL_DUPLICATE_ENTRY: "VAL-ERR-304",
  VAL_INVALID_DATE: "VAL-ERR-305",
  // API Communication (API-ERR-4xx)
  API_NETWORK_ERROR: "API-ERR-401",
  API_TIMEOUT: "API-ERR-402",
  API_SERVER_ERROR: "API-ERR-403",
  API_RATE_LIMIT: "API-ERR-404",
  API_UNAUTHORIZED: "API-ERR-405",
  // System (SYS-ERR-5xx)
  SYS_UNKNOWN_ERROR: "SYS-ERR-501",
  SYS_CONFIG_ERROR: "SYS-ERR-502",
  SYS_DATABASE_ERROR: "SYS-ERR-503",
  SYS_PERMISSION_DENIED: "SYS-ERR-504"
};

// src/core/errors/errorMessages.ts
var ERROR_MESSAGES = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: "Invalid username or password. Please try again.",
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: "Your session has expired. Please login again.",
  [ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS]: "You do not have permission to access this resource.",
  [ERROR_CODES.AUTH_ACCOUNT_LOCKED]: "Your account is locked. Try again next day.",
  [ERROR_CODES.AUTH_TOKEN_INVALID]: "Invalid or malformed token.",
  [ERROR_CODES.VAL_REQUIRED_FIELD]: "Required field is missing.",
  [ERROR_CODES.VAL_INVALID_FORMAT]: "Invalid format of provided data.",
  [ERROR_CODES.API_NETWORK_ERROR]: "Network error occurred.",
  [ERROR_CODES.API_TIMEOUT]: "Request timed out.",
  [ERROR_CODES.API_SERVER_ERROR]: "Server error occurred.",
  [ERROR_CODES.API_RATE_LIMIT]: "Too many requests. Please slow down.",
  [ERROR_CODES.API_UNAUTHORIZED]: "Unauthorized.",
  [ERROR_CODES.SYS_UNKNOWN_ERROR]: "An unknown error occurred.",
  [ERROR_CODES.SYS_CONFIG_ERROR]: "Configuration error.",
  [ERROR_CODES.SYS_DATABASE_ERROR]: "Database error.",
  [ERROR_CODES.SYS_PERMISSION_DENIED]: "Operation not permitted.",
  [ERROR_CODES.APP_NOT_FOUND]: "The specified data was not found.",
  [ERROR_CODES.APP_ALREADY_EXISTS]: "The specified data already exists."
};

// src/core/audit/auditLogger.ts
var inMemoryAudit = [];
var AuditLogger = {
  log(action, partial) {
    const entry = {
      action,
      status: partial.status ?? "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      description: partial.description,
      userId: partial.userId,
      userName: partial.userName,
      userRole: partial.userRole,
      targetId: partial.targetId,
      targetType: partial.targetType,
      oldValue: partial.oldValue,
      newValue: partial.newValue,
      errorCode: partial.errorCode,
      errorMessage: partial.errorMessage,
      requestId: partial.requestId,
      sessionId: partial.sessionId,
      ipAddress: partial.ipAddress,
      userAgent: partial.userAgent,
      module: partial.module
    };
    inMemoryAudit.push(entry);
  },
  logSuccess(action, details) {
    this.log(action, { ...details, status: "success" });
  },
  logFailure(action, errorCode, details) {
    this.log(action, { ...details, status: "failure", errorCode });
  },
  _getAll() {
    return inMemoryAudit;
  },
  _clear() {
    inMemoryAudit.splice(0, inMemoryAudit.length);
  }
};

// src/config/security.ts
var SECURITY_CONFIG = {
  SESSION_TIMEOUT_MS: 30 * 60 * 1e3,
  SESSION_WARNING_MS: 5 * 60 * 1e3,
  TOKEN_REFRESH_THRESHOLD_MS: 5 * 60 * 1e3,
  MAX_SESSION_DURATION_MS: 8 * 60 * 60 * 1e3,
  // total maximal login
  MAX_LOGIN_ATTEMPTS: 5,
  // total duration locked
  LOCKOUT_DURATION_MS: 0.2 * 60 * 1e3,
  MAX_API_CALLS_PER_MINUTE: 60
};

// src/api/common/models/ServiceResponse.ts
import { StatusCodes } from "http-status-codes";
import { z as z2 } from "zod";
var ServiceResponse = class _ServiceResponse {
  success;
  message;
  data;
  statusCode;
  pagination;
  constructor(success, message, data, statusCode, pagination) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.statusCode = statusCode;
    this.pagination = pagination;
  }
  static success(message, data, statusCode = StatusCodes.OK, pagination) {
    return new _ServiceResponse(true, message, data, statusCode, pagination);
  }
  static failure(message, data, statusCode = StatusCodes.BAD_REQUEST, pagination) {
    return new _ServiceResponse(true, message, data, statusCode, pagination);
  }
};

// src/modules/log_monitoring/log_monitoring.repository.ts
var statusToMsgType = {
  Success: "SUC",
  Error: "ERR",
  Warning: "WRN",
  InProgress: "INF"
};
function dayPrefix(d = /* @__PURE__ */ new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}
async function resolveMessageForStatus(status) {
  const wantedType = statusToMsgType[status] ?? "INF";
  const msg = await prisma.tB_M_MESSAGE.findFirst({
    where: { MESSAGE_TYPE: wantedType },
    orderBy: { MESSAGE_ID: "asc" }
    // ambil yg pertama; bebas atur
  });
  if (!msg) throw new Error(`TB_M_MESSAGE not found for MESSAGE_TYPE=${wantedType}`);
  return msg;
}
async function allocateProcessId(tx, baseDate) {
  const prefix = dayPrefix(baseDate);
  const resource = `LOG_SEQ_${prefix}`;
  await tx.$executeRawUnsafe(
    `EXEC sp_getapplock @Resource = @p1, @LockMode = 'Exclusive', @LockOwner='Transaction', @LockTimeout = 5000;`,
    resource
  );
  const [row] = await tx.$queryRaw`
    SELECT MAX([PROCESS_ID]) AS [last]
    FROM [dbo].[TB_R_LOG_H] WITH (HOLDLOCK)
    WHERE [PROCESS_ID] LIKE ${prefix + "%"}
  `;
  const last = row?.last ?? `${prefix}00000`;
  const nextSeq = String(Number(last.slice(-5)) + 1).padStart(5, "0");
  const candidate = `${prefix}${nextSeq}`;
  return candidate;
}
var parseDate = (s) => {
  if (!s) return /* @__PURE__ */ new Date();
  try {
    const safe = s.replace(/\//g, "-").replace(/\\/g, "-");
    const [d, m, rest] = safe.split("-");
    const [y, time] = (rest ?? "").split(" ");
    const [hh, mm, ss] = (time ?? "00:00:00").split(":").map(Number);
    return new Date(Number(y), Number(m) - 1, Number(d), hh, mm, ss);
  } catch (err) {
    console.error("[parseDate ERROR]", s, err);
    return /* @__PURE__ */ new Date();
  }
};
var toGB = (d) => {
  if (!d) return "";
  return d.toLocaleString("en-GB", { hour12: false }).replace(",", "");
};
var normalizeStatusFromDb = (s) => {
  const v = (s ?? "").toUpperCase();
  if (v === "S") return "Success";
  if (v === "E" || v === "F") return "Error";
  if (v === "W") return "Warning";
  if (v === "P") return "InProgress";
  return "Success";
};
var logRepository = {
  async listLogs(params) {
    const {
      page = 1,
      limit = 10,
      status,
      module,
      userId,
      q,
      startDate,
      endDate,
      sortBy = "START_DATE",
      order = "desc"
    } = params;
    const where = {};
    if (status) {
      const map = {
        Success: "S",
        Error: "E",
        Warning: "W",
        InProgress: "P"
      };
      where.PROCESS_STATUS = map[status];
    }
    if (module) {
      where.TB_M_MODULE = { MODULE_NAME: { equals: module } };
    }
    if (userId) {
      where.CREATED_BY = { equals: userId };
    }
    if (startDate || endDate) {
      where.START_DT = {};
      if (startDate) where.START_DT.gte = parseDate(startDate);
      if (endDate) where.START_DT.lte = parseDate(endDate);
    }
    if (q) {
      const s = q;
      where.OR = [
        { PROCESS_ID: { contains: s } },
        { TB_M_MODULE: { MODULE_NAME: { contains: s } } },
        { TB_M_FUNCTION: { FUNCTION_NAME: { contains: s } } }
      ];
    }
    const orderBy = (() => {
      if (sortBy === "NO") {
        return [{ PROCESS_ID: order }];
      }
      if (sortBy === "END_DATE") {
        return [{ END_DT: order }, { START_DT: order }, { PROCESS_ID: "desc" }];
      }
      return [{ START_DT: order }, { END_DT: order }, { PROCESS_ID: "desc" }];
    })();
    const [total, rows] = await Promise.all([
      prisma.tB_R_LOG_H.count({ where }),
      prisma.tB_R_LOG_H.findMany({
        where,
        include: {
          TB_M_MODULE: true,
          TB_M_FUNCTION: true
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      })
    ]);
    const data = rows.map((h, idx) => ({
      NO: (page - 1) * limit + idx + 1,
      PROCESS_ID: h.PROCESS_ID,
      USER_ID: h.CREATED_BY,
      MODULE: h.TB_M_MODULE?.MODULE_NAME ?? h.MODULE_ID,
      FUNCTION_NAME: h.TB_M_FUNCTION?.FUNCTION_NAME ?? h.FUNCTION_ID,
      START_DATE: toGB(h.START_DT),
      END_DATE: toGB(h.END_DT ?? null),
      STATUS: normalizeStatusFromDb(h.PROCESS_STATUS),
      DETAILS: []
    }));
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  },
  async getLogByProcessId(processId) {
    const h = await prisma.tB_R_LOG_H.findUnique({
      where: { PROCESS_ID: processId },
      include: {
        TB_M_MODULE: true,
        TB_M_FUNCTION: true,
        TB_R_LOG_D: true
      }
    });
    if (!h) return null;
    const details = (h.TB_R_LOG_D ?? []).sort((a, b) => a.SEQ_NO - b.SEQ_NO).map((d) => ({
      ID: d.SEQ_NO,
      PROCESS_ID: d.PROCESS_ID,
      MESSAGE_DATE_TIME: toGB(d.CREATED_DT),
      LOCATION: d.LOCATION,
      MESSAGE_DETAIL: d.MESSAGE_CONTENT,
      MESSAGE_ID: d.MESSAGE_ID,
      MESSAGE_TYPE: d.MESSAGE_TYPE
    }));
    const result = {
      NO: 1,
      PROCESS_ID: h.PROCESS_ID,
      USER_ID: h.CREATED_BY,
      MODULE: h.TB_M_MODULE?.MODULE_NAME ?? h.MODULE_ID,
      FUNCTION_NAME: h.TB_M_FUNCTION?.FUNCTION_NAME ?? h.FUNCTION_ID,
      START_DATE: toGB(h.START_DT),
      END_DATE: toGB(h.END_DT ?? null),
      STATUS: normalizeStatusFromDb(h.PROCESS_STATUS),
      DETAILS: details
    };
    return result;
  },
  async insertLog(newLog) {
    const statusToDb = {
      Success: "S",
      Error: "E",
      Warning: "W",
      InProgress: "P"
    };
    const moduleRow = await prisma.tB_M_MODULE.findFirst({
      where: { OR: [{ MODULE_ID: newLog.MODULE }, { MODULE_NAME: newLog.MODULE }] }
    });
    if (!moduleRow) throw new Error(`MODULE not found: ${newLog.MODULE}`);
    const functionRow = await prisma.tB_M_FUNCTION.findFirst({
      where: { MODULE_ID: moduleRow.MODULE_ID, FUNCTION_NAME: newLog.FUNCTION_NAME }
    });
    if (!functionRow) {
      throw new Error(`FUNCTION_NAME not found for module ${moduleRow.MODULE_ID}: ${newLog.FUNCTION_NAME}`);
    }
    const defaultMsg = await resolveMessageForStatus(newLog.STATUS);
    const startDt = parseDate(newLog.START_DATE);
    const endDt = newLog.END_DATE ? parseDate(newLog.END_DATE) : null;
    console.log("newLog", newLog);
    try {
      await prisma.$transaction(async (tx) => {
        let processId = await allocateProcessId(tx, startDt);
        await tx.tB_R_LOG_H.create({
          data: {
            PROCESS_ID: processId,
            MODULE_ID: moduleRow.MODULE_ID,
            FUNCTION_ID: functionRow.FUNCTION_ID,
            START_DT: startDt,
            END_DT: endDt,
            PROCESS_STATUS: statusToDb[newLog.STATUS],
            CREATED_BY: newLog.USER_ID,
            CREATED_DT: /* @__PURE__ */ new Date()
          }
        });
        if (newLog.DETAILS?.length) {
          await tx.tB_R_LOG_D.createMany({
            data: newLog.DETAILS.map((d) => ({
              PROCESS_ID: processId,
              SEQ_NO: d.ID,
              // ⬇️ default dari master, boleh override kalau d.MESSAGE_ID ada
              MESSAGE_ID: d.MESSAGE_ID ?? defaultMsg.MESSAGE_ID,
              MESSAGE_TYPE: d.MESSAGE_TYPE ?? defaultMsg.MESSAGE_TYPE,
              MESSAGE_CONTENT: d.MESSAGE_DETAIL,
              LOCATION: d.LOCATION,
              CREATED_BY: newLog.USER_ID,
              CREATED_DT: parseDate(d.MESSAGE_DATE_TIME),
              MODULE_ID: moduleRow.MODULE_ID,
              FUNCTION_ID: functionRow.FUNCTION_ID
            }))
          });
        }
      });
    } catch (e) {
      console.error("[insertLog] TRANSACTION FAILED:", e?.message, e);
      throw e;
    }
    return newLog;
  },
  async listDetailsByProcessId(processId, page = 1, limit = 20) {
    const where = { PROCESS_ID: processId };
    const [total, rows] = await Promise.all([
      prisma.tB_R_LOG_D.count({ where }),
      prisma.tB_R_LOG_D.findMany({
        where,
        orderBy: { SEQ_NO: "asc" },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);
    const data = rows.map((d) => ({
      ID: d.SEQ_NO,
      PROCESS_ID: d.PROCESS_ID,
      MESSAGE_DATE_TIME: toGB(d.CREATED_DT),
      LOCATION: d.LOCATION,
      MESSAGE_DETAIL: d.MESSAGE_CONTENT,
      MESSAGE_ID: d.MESSAGE_ID,
      MESSAGE_TYPE: d.MESSAGE_TYPE
    }));
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }
};

// src/utils/idHelper.ts
var BASE_PREFIX = "SAR";
function generateID(appId, divisionId, todayIds, padLength = 4) {
  const sectionPrefix = `${BASE_PREFIX}${appId}${divisionId}`;
  const now = /* @__PURE__ */ new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;
  const fullPrefix = `${sectionPrefix}${datePart}`;
  const lastId = todayIds.filter((id) => id.startsWith(fullPrefix)).sort((a, b) => b.localeCompare(a))[0];
  let nextNumber = 1;
  if (lastId) {
    try {
      const lastNumStr = lastId.slice(-padLength);
      const lastNum = parseInt(lastNumStr);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    } catch (e) {
      console.error("Error parsing last ID number:", e);
    }
  }
  const paddedNumber = String(nextNumber).padStart(padLength, "0");
  return `${fullPrefix}${paddedNumber}`;
}
var seqCounter = 0;
function generateProcessId() {
  const now = /* @__PURE__ */ new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const seq = String(seqCounter++).padStart(5, "0");
  return `${yyyy}${mm}${dd}${seq}`;
}
var toGB2 = (d) => new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta"
}).format(d).replace(",", "");
var normalizeStatus = (s) => {
  if (!s) return "Success";
  const v = String(s).toLowerCase().trim();
  if (v === "success") return "Success";
  if (v === "failure" || v === "error") return "Error";
  if (v === "warning") return "Warning";
  if (v === "inprogress" || v === "in progress") return "InProgress";
  return "Success";
};

// src/modules/log_monitoring/log_publisher.ts
async function publishMonitoringLog(app, input) {
  const startAt = input.timestamp ?? /* @__PURE__ */ new Date();
  const endAt = /* @__PURE__ */ new Date();
  const processId = String(generateProcessId());
  const newLog = {
    NO: 0,
    PROCESS_ID: processId,
    USER_ID: String(input.userId ?? "anonymous"),
    MODULE: String(input.module ?? "Unknown"),
    FUNCTION_NAME: String(input.action ?? "Unknown"),
    START_DATE: toGB2(startAt),
    END_DATE: toGB2(endAt),
    STATUS: normalizeStatus(input.status ?? "Success"),
    DETAILS: [
      {
        ID: 1,
        PROCESS_ID: processId,
        MESSAGE_DATE_TIME: toGB2(/* @__PURE__ */ new Date()),
        LOCATION: String(input.location ?? input.module ?? "Unknown"),
        MESSAGE_DETAIL: String(input.description ?? "Action logged"),
        MESSAGE_ID: void 0,
        MESSAGE_TYPE: void 0
      }
    ]
  };
  await logRepository.insertLog(newLog);
  return newLog;
}

// src/modules/auth/auth.service.ts
var loginAttempts = /* @__PURE__ */ new Map();
function isLocked(username) {
  const rec = loginAttempts.get(username);
  if (!rec) return false;
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    return true;
  }
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    loginAttempts.delete(username);
    return false;
  }
  return false;
}
function recordFailure(username) {
  const now = Date.now();
  const current = loginAttempts.get(username);
  if (!current) {
    loginAttempts.set(username, { count: 1 });
    return { count: 1, justLocked: false };
  }
  if (current.lockedUntil && now >= current.lockedUntil) {
    loginAttempts.set(username, { count: 1 });
    return { count: 1, justLocked: false };
  }
  const nextCount = (current.count ?? 0) + 1;
  if (nextCount >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
    loginAttempts.set(username, {
      count: nextCount,
      lockedUntil: now + SECURITY_CONFIG.LOCKOUT_DURATION_MS
    });
    return { count: nextCount, justLocked: true };
  }
  current.count = nextCount;
  loginAttempts.set(username, current);
  return { count: nextCount, justLocked: false };
}
function resetAttempts(username) {
  loginAttempts.delete(username);
}
function getLockInfo(username) {
  const rec = loginAttempts.get(username);
  if (!rec?.lockedUntil) return { locked: false };
  const now = Date.now();
  const remainingMs = Math.max(rec.lockedUntil - now, 0);
  return {
    locked: remainingMs > 0,
    lockedUntil: rec.lockedUntil,
    remainingMs
  };
}
var authService = {
  async login(app, username, password, requestId) {
    if (isLocked(username)) {
      const info = getLockInfo(username);
      AuditLogger.logFailure("LOGIN_FAILED" /* LOGIN_FAILED */, ERROR_CODES.AUTH_ACCOUNT_LOCKED, {
        userId: username,
        requestId,
        description: "Account locked due to too many failed attempts"
      });
      publishMonitoringLog(app, {
        userId: username,
        module: "AUTH",
        action: "LOGIN_FAILED",
        status: "Error",
        description: "Account locked due to too many failed attempts",
        location: "/login"
      }).catch((e) => app.log.warn({ err: e }, "monitoring log failed (account locked)"));
      throw new ApplicationError(
        ERROR_CODES.AUTH_ACCOUNT_LOCKED,
        ERROR_MESSAGES[ERROR_CODES.AUTH_ACCOUNT_LOCKED],
        {
          locked: true,
          lockedUntil: info.lockedUntil,
          remainingMs: info.remainingMs,
          maxAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS
        },
        // <-- details ke FE
        requestId,
        423
      );
    }
    const user = await userRepository.login(username, password);
    const valid = !!user && safeCompare(password, user.password);
    if (!valid) {
      const { count, justLocked } = recordFailure(username);
      if (justLocked) {
        const info = getLockInfo(username);
        AuditLogger.logFailure("LOGIN_FAILED" /* LOGIN_FAILED */, ERROR_CODES.AUTH_ACCOUNT_LOCKED, {
          userId: username,
          requestId,
          description: "Account locked due to too many failed attempts (threshold reached)"
        });
        publishMonitoringLog(app, {
          userId: username,
          module: "AUTH",
          action: "LOGIN_FAILED",
          status: "Error",
          description: "Account locked (threshold reached)",
          location: "/login"
        }).catch((e) => app.log.warn({ err: e }, "monitoring log failed (threshold reached)"));
        throw new ApplicationError(
          ERROR_CODES.AUTH_ACCOUNT_LOCKED,
          ERROR_MESSAGES[ERROR_CODES.AUTH_ACCOUNT_LOCKED],
          {
            locked: true,
            lockedUntil: info.lockedUntil,
            remainingMs: info.remainingMs,
            maxAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS
          },
          requestId,
          423
        );
      }
      const remaining = Math.max(
        SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - count,
        0
      );
      AuditLogger.logFailure("LOGIN_FAILED" /* LOGIN_FAILED */, ERROR_CODES.AUTH_INVALID_CREDENTIALS, {
        userId: username,
        requestId,
        description: `Invalid credentials (${remaining} attempt${remaining === 1 ? "" : "s"} left)`
      });
      publishMonitoringLog(app, {
        userId: username,
        module: "AUTH",
        action: "LOGIN_FAILED",
        status: "Error",
        description: `Invalid credentials (${remaining} attempts left)`,
        location: "/login"
      }).catch((e) => app.log.warn({ err: e }, "monitoring log failed (invalid)"));
      const message = remaining > 0 ? `Invalid username or passwords. You have ${remaining} attempt${remaining === 1 ? "" : "s"} left.` : ERROR_MESSAGES[ERROR_CODES.AUTH_ACCOUNT_LOCKED];
      throw new ApplicationError(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message,
        {
          locked: false,
          attemptsLeft: remaining,
          maxAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS
        },
        // <-- details
        requestId,
        401
      );
    }
    resetAttempts(username);
    const payload = {
      sub: user.username,
      role: user.role,
      name: user.name
    };
    const token = app.jwt.sign(payload, { expiresIn: env.TOKEN_EXPIRES_IN });
    const publicUser = {
      username: user.username,
      name: user.name,
      role: user.role,
      divisionId: 2,
      noreg: "100000"
    };
    AuditLogger.logSuccess("LOGIN_SUCCESS" /* LOGIN_SUCCESS */, {
      userId: user.username,
      userName: user.name,
      userRole: user.role,
      requestId,
      description: "User logged in successfully"
    });
    publishMonitoringLog(app, {
      userId: user.username,
      module: "AUTH",
      action: "LOGIN_SUCCESS",
      status: "Success",
      description: "User logged in successfully",
      location: "/login"
    }).catch((e) => app.log.warn({ err: e }, "monitoring log failed (success)"));
    return { token, expiresIn: env.TOKEN_EXPIRES_IN, user: publicUser };
  },
  async getMenu(username) {
    try {
      const menus = await userRepository.getMenu(username);
      return ServiceResponse.success("Menu found", menus);
    } catch (error) {
      const errorMessage = `Error finding menu : $${error.message}`;
      return ServiceResponse.failure(
        "An error occurred while retrieving menu.",
        null,
        500
      );
    }
  },
  async getProfile(username) {
    try {
      const profile = await userRepository.getProfile(username);
      return ServiceResponse.success("Profile found", profile);
    } catch (ex) {
      const errorMessage = `Error finding Profile: $${ex.message}`;
      return ServiceResponse.failure(
        "An error occurred while retrieving profile.",
        null,
        500
      );
    }
  },
  async logout(app, token, requestId) {
    const decoded = app.jwt.decode(token);
    AuditLogger.logSuccess("LOGOUT_SUCCESS" /* LOGOUT_SUCCESS */, {
      userId: decoded?.sub ?? "unknown",
      userRole: decoded?.role ?? "unknown",
      requestId,
      description: "User logged out"
    });
    console.log("decoded", decoded);
    publishMonitoringLog(app, {
      userId: decoded.name,
      module: "AUTH",
      action: "LOGOUT_SUCESS",
      status: "Success",
      description: "User loggout in successfully",
      location: "/logout"
    }).catch((e) => app.log.warn({ err: e }, "monitoring log failed (success)"));
    return true;
  },
  async validate(username) {
    try {
      const user = await userRepository.getProfile(username);
      return user;
    } catch (ex) {
      const errorMessage = `Error validating user: $${ex.message}`;
    }
  }
};

// src/modules/auth/auth.controller.ts
var toUpperRole = (val) => {
  if (!val) return void 0;
  return String(val).toUpperCase();
};
var authController = {
  login: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const { username, password } = req.body;
    const result = await authService.login(app, username, password, requestId);
    const normalizedRole = toUpperRole(result?.user?.role) ?? "ADMIN";
    const userOut = {
      ...result.user,
      role: normalizedRole
    };
    let finalToken = result.token;
    let finalExpires = env.TOKEN_EXPIRES_IN;
    try {
      if (result.token) {
        const decoded = app.jwt.decode(result.token) || {};
        const payload = {
          sub: decoded.sub ?? username,
          name: decoded.name ?? result.user?.username ?? username,
          role: normalizedRole
        };
        finalToken = app.jwt.sign(payload, { expiresIn: finalExpires });
      } else {
        const payload = {
          sub: result.user?.username ?? username,
          name: result.user?.name,
          username: result.user?.username ?? username,
          role: normalizedRole
        };
        finalToken = app.jwt.sign(payload, { expiresIn: finalExpires });
      }
    } catch {
      const payload = {
        sub: result.user?.username ?? username,
        name: result.user?.name,
        username: result.user?.username ?? username,
        role: normalizedRole
      };
      finalToken = app.jwt.sign(payload, { expiresIn: finalExpires });
    }
    return reply.status(200).send({
      code: "OK",
      message: "LOGIN_SUCCESS" /* LOGIN_SUCCESS */,
      requestId,
      data: {
        token: finalToken,
        expiresIn: finalExpires,
        user: userOut
      }
    });
  },
  logout: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(400).send({
        code: "AUTH-ERR-001",
        message: "Missing or invalid Authorization header",
        requestId
      });
    }
    const token = authHeader.split(" ")[1];
    await authService.logout(app, token, requestId);
    return reply.status(200).send({
      code: "OK",
      message: "LOGOUT_SUCCESS" /* LOGOUT_SUCCESS */,
      requestId
    });
  },
  getMenu: (_app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const query = req.query ?? {};
    const tokenUsername = req.user?.sub;
    const username = query.username ?? tokenUsername;
    if (!username) {
      return reply.status(400).send({
        code: "BAD_REQUEST",
        message: "username is required (query ?username= or via JWT)",
        requestId
      });
    }
    const res = await authService.getMenu(username);
    return reply.status(res.statusCode ?? 200).send(res);
  },
  // ------------------ GET PROFILE ------------------
  getProfile: (_app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const query = req.query ?? {};
    const tokenUsername = req.user?.sub;
    const username = query.username ?? tokenUsername;
    if (!username) {
      return reply.status(400).send({
        code: "BAD_REQUEST",
        message: "username is required (query ?username= or via JWT)",
        requestId
      });
    }
    const res = await authService.getProfile(username);
    return reply.status(res.statusCode ?? 200).send(res);
  }
};

// src/modules/auth/auth.schemas.ts
var loginSchema = {
  body: {
    type: "object",
    required: ["username", "password"],
    properties: {
      username: { type: "string", minLength: 1 },
      password: { type: "string", minLength: 1 }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: "object",
      required: ["code", "message", "requestId", "data"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        requestId: { type: "string" },
        data: {
          type: "object",
          required: ["token", "expiresIn", "user"],
          properties: {
            token: { type: "string" },
            expiresIn: { type: "number" },
            user: {
              type: "object",
              required: ["username", "name", "role"],
              properties: {
                username: { type: "string" },
                name: { type: "string" },
                role: { type: "string" },
                divisionId: { type: "number" },
                noreg: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
};
var getMenuSchema = {
  querystring: {
    type: "object",
    properties: { username: { type: "string" } },
    additionalProperties: false
  },
  response: {
    200: {
      type: "object",
      required: ["statusCode", "message", "data"],
      properties: {
        statusCode: { type: "number" },
        message: { type: "string" },
        data: { type: "array" }
        // tree menu (biarkan generic)
      }
    }
  }
};
var getProfileSchema = {
  querystring: {
    type: "object",
    properties: { username: { type: "string" } },
    additionalProperties: false
  },
  response: {
    200: {
      type: "object",
      required: ["statusCode", "message", "data"],
      properties: {
        statusCode: { type: "number" },
        message: { type: "string" },
        data: {
          type: "object",
          required: ["user", "features", "functions", "roles"],
          properties: {
            user: {
              type: "object",
              required: ["username", "id"],
              properties: {
                username: { type: "string" },
                name: { type: "string" },
                id: { type: "string" },
                regNo: { type: ["string", "null"] },
                company: { type: ["string", "null"] },
                firstName: { type: ["string", "null"] },
                lastName: { type: ["string", "null"] },
                birthDate: { type: ["string", "null"] },
                address: { type: ["string", "null"] },
                companyInfo: {
                  type: ["object", "null"],
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    description: { type: ["string", "null"] }
                  },
                  additionalProperties: true
                }
              },
              additionalProperties: true
            },
            features: { type: "array", items: { type: "string" } },
            functions: { type: "array", items: { type: "string" } },
            roles: { type: "array", items: { type: "string" } }
          }
        }
      }
    }
  }
};

// src/core/errors/errorHandler.ts
async function errorHandler(err, req, reply) {
  const requestId = req.headers["x-request-id"] || req.id;
  const logger = this?.log ?? req.log;
  if (err instanceof ApplicationError) {
    err.requestId = requestId;
    const status = err.statusCode ?? 400;
    logger.warn({ err, requestId }, `ApplicationError: ${err.code}`);
    return reply.status(status).send(err.toResponse());
  }
  if (err.validation) {
    logger.error({ err, requestId }, "Schema validation error");
    const code2 = ERROR_CODES.VAL_INVALID_FORMAT;
    const message2 = err.message;
    return reply.status(400).send({ code: code2, message: message2, requestId });
  }
  logger.error({ err, requestId }, "Unhandled 500-level error");
  const code = ERROR_CODES.SYS_UNKNOWN_ERROR;
  const message = ERROR_MESSAGES[code] || "An unexpected error occurred";
  return reply.status(500).send({ code, message, requestId });
}

// src/api/auth/auth.routes.ts
async function authRoutes(app) {
  app.post(
    "/login",
    { schema: loginSchema, errorHandler },
    async (req, reply) => {
      return authController.login(app)(req, reply);
    }
  );
  app.post("/logout", async (req, reply) => {
    return authController.logout(app)(req, reply);
  });
  app.get(
    "/menu",
    {
      preHandler: [app.authenticate],
      schema: getMenuSchema
    },
    async (req, reply) => authController.getMenu(app)(req, reply)
  );
  app.get(
    "/profile",
    {
      preHandler: [app.authenticate],
      schema: getProfileSchema
    },
    async (req, reply) => authController.getProfile(app)(req, reply)
  );
}

// src/plugins/prisma.ts
import fp3 from "fastify-plugin";
var prisma_default = fp3(async (fastify) => {
  fastify.decorate("prisma", prisma);
  fastify.decorate("prismaSC", prismaSC);
  fastify.addHook("onClose", async (instance) => {
    await Promise.all([
      instance.prisma.$disconnect(),
      instance.prismaSC.$disconnect()
    ]);
  });
});

// src/core/requestContext.ts
import { AsyncLocalStorage } from "async_hooks";
var als = new AsyncLocalStorage();
function runWithRequestContext(value, fn) {
  return als.run(value, fn);
}
function getRequestContext() {
  return als.getStore() ?? {
    userId: "unknown",
    requestId: "unknown"
  };
}
var currentUserId = () => getRequestContext().userId;
var currentRequestId = () => getRequestContext().requestId;
function extractUserFromRequest(app, req) {
  const u = req.user ?? null;
  if (u?.sub) {
    return {
      userId: String(u.sub),
      role: u.role ? String(u.role) : void 0,
      username: u.name ? String(u.name) : void 0
    };
  }
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token) {
    try {
      const decoded = app.jwt.decode(token);
      if (decoded) {
        return {
          userId: String(decoded.sub ?? "unknown"),
          role: decoded.role ? String(decoded.role) : void 0,
          username: decoded.name ? String(decoded.name) : void 0
        };
      }
    } catch {
    }
  }
  return { userId: "unknown" };
}

// src/data/mockup.ts
var uarSO1 = [
  {
    ID: "SARPICCIO202510220001",
    PIC_NAME: "Hesti",
    DIVISION_ID: 1,
    MAIL: "hesti@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510220002",
    PIC_NAME: "Budi",
    DIVISION_ID: 2,
    MAIL: "budi@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510220003",
    PIC_NAME: "Citra",
    DIVISION_ID: 3,
    MAIL: "citra@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510220004",
    PIC_NAME: "Dina",
    DIVISION_ID: 3,
    MAIL: "dina@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510230001",
    PIC_NAME: "Alia",
    DIVISION_ID: 4,
    MAIL: "alia@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510230002",
    PIC_NAME: "Rizky",
    DIVISION_ID: 5,
    MAIL: "rizky@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: "admin",
    CHANGED_DT: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    ID: "SARPICCIO202510230003",
    PIC_NAME: "Teguh",
    DIVISION_ID: 6,
    MAIL: "teguh@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510230004",
    PIC_NAME: "Mega",
    DIVISION_ID: 2,
    MAIL: "mega@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: "admin",
    CHANGED_DT: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    ID: "SARPICCIO202510230005",
    PIC_NAME: "Yusuf",
    DIVISION_ID: 1,
    MAIL: "yusuf@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510230006",
    PIC_NAME: "Nadia",
    DIVISION_ID: 4,
    MAIL: "nadia@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510240001",
    PIC_NAME: "Wendi",
    DIVISION_ID: 2,
    MAIL: "wendi@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510240002",
    PIC_NAME: "Gilang",
    DIVISION_ID: 5,
    MAIL: "gilang@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: "admin",
    CHANGED_DT: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    ID: "SARPICCIO202510240003",
    PIC_NAME: "Wulan",
    DIVISION_ID: 3,
    MAIL: "wulan@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510240004",
    PIC_NAME: "Rendra",
    DIVISION_ID: 6,
    MAIL: "rendra@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: "system",
    CHANGED_DT: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    ID: "SARPICCIO202510240005",
    PIC_NAME: "Putri",
    DIVISION_ID: 1,
    MAIL: "putri@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510240006",
    PIC_NAME: "Fajar",
    DIVISION_ID: 5,
    MAIL: "fajar@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: "admin",
    CHANGED_DT: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    ID: "SARPICCIO202510240007",
    PIC_NAME: "Selvi",
    DIVISION_ID: 2,
    MAIL: "selvi@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510240008",
    PIC_NAME: "Arman",
    DIVISION_ID: 6,
    MAIL: "arman@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510240009",
    PIC_NAME: "Laras",
    DIVISION_ID: 4,
    MAIL: "laras@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: "system",
    CHANGED_DT: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    ID: "SARPICCIO202510240010",
    PIC_NAME: "Imam",
    DIVISION_ID: 3,
    MAIL: "imam@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  // --- New Data Added to uarSO1 ---
  {
    ID: "SARPICCIO202510240011",
    PIC_NAME: "Kevin",
    DIVISION_ID: 1,
    MAIL: "kevin@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: "SARPICCIO202510240012",
    PIC_NAME: "Linda",
    DIVISION_ID: 2,
    MAIL: "linda@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: "admin",
    CHANGED_DT: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    ID: "SARPICCIO202510240013",
    PIC_NAME: "Marwan",
    DIVISION_ID: 3,
    MAIL: "marwan@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  }
];
var uarSO2 = [
  // --- This ID is different from uarSO1's version ---
  {
    ID: "SARPICCIO202510240001",
    PIC_NAME: "Rani",
    // Different name
    DIVISION_ID: 2,
    MAIL: "rani@toyota.co.id",
    // Different email
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  // --- This ID is unique to uarSO2 ---
  {
    ID: "SARPICCIO202510250001",
    PIC_NAME: "Sari",
    DIVISION_ID: 2,
    MAIL: "sari@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  // --- This ID also exists in uarSO1 ---
  {
    ID: "SARPICCIO202510220002",
    PIC_NAME: "Budi",
    DIVISION_ID: 2,
    MAIL: "budi@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: "2025-10-22T00:00:00.000Z",
    // Older date
    CHANGED_BY: "admin",
    // Has been changed here
    CHANGED_DT: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var uarSO3 = [
  // --- This ID is different from uarSO1 and uarSO2 ---
  {
    ID: "SARPICCIO202510240001",
    PIC_NAME: "Erina",
    // Different name
    DIVISION_ID: 5,
    // Different division
    MAIL: "erina@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  // --- Unique to uarSO3 ---
  {
    ID: "SARPICCIO202510250002",
    PIC_NAME: "Tono",
    DIVISION_ID: 3,
    MAIL: "tono@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  // --- Unique to uarSO3 ---
  {
    ID: "SARPICCIO202510250003",
    PIC_NAME: "Vina",
    DIVISION_ID: 1,
    MAIL: "vina@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  }
];
var uarSO4 = [
  // --- This ID is also in uarSO1, 2, 3 but with different data ---
  {
    ID: "SARPICCIO202510240001",
    PIC_NAME: "Fadhli",
    // Different name
    DIVISION_ID: 2,
    MAIL: "fadhli@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  // --- This ID also exists in uarSO1 ---
  {
    ID: "SARPICCIO202510230003",
    PIC_NAME: "Teguh",
    DIVISION_ID: 6,
    MAIL: "teguh@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  // --- Unique to uarSO4 ---
  {
    ID: "SARPICCIO202510250004",
    PIC_NAME: "Zaki",
    DIVISION_ID: 2,
    MAIL: "zaki@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  }
];
var uarSO5 = [
  // --- This ID is also in uarSO1, 2, 3, 4 ---
  {
    ID: "SARPICCIO202510240001",
    PIC_NAME: "Fajri",
    // Different name
    DIVISION_ID: 2,
    MAIL: "fajri@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  // --- This ID also exists in uarSO1 ---
  {
    ID: "SARPICCIO202510240005",
    PIC_NAME: "Putri",
    DIVISION_ID: 1,
    MAIL: "putri-new@toyota.co.id",
    // Different email
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: "admin",
    // Was null in uarSO1
    CHANGED_DT: (/* @__PURE__ */ new Date()).toISOString()
  },
  // --- Unique to uarSO5 ---
  {
    ID: "SARPICCIO202510250005",
    PIC_NAME: "Bayu",
    DIVISION_ID: 2,
    MAIL: "bayu@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  // --- Unique to uarSO5 ---
  {
    ID: "SARPICCIO202510250006",
    PIC_NAME: "Chandra",
    DIVISION_ID: 6,
    MAIL: "chandra@toyota.co.id",
    CREATED_BY: "system",
    CREATED_DT: (/* @__PURE__ */ new Date()).toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  }
];

// src/modules/master_data/schedule/schedule.service.ts
import { Prisma } from "./generated/prisma/index.js";

// src/modules/master_data/uarpic/uarpic.schemas.ts
var uarPicSchema = {
  body: {
    type: "object",
    required: ["PIC_NAME", "DIVISION_ID", "MAIL"],
    properties: {
      ID: { type: "string" },
      PIC_NAME: { type: "string", maxLength: 30 },
      DIVISION_ID: { type: "number" },
      MAIL: { type: "string", maxLength: 50 },
      CREATED_BY: { type: "string", maxLength: 20 },
      CREATED_DT: { type: "string", format: "date-time" },
      CHANGED_BY: { type: "string", maxLength: 20 },
      CHANGED_DT: { type: "string", format: "date-time" }
    },
    additionalProperties: false
  }
};

// src/modules/master_data/schedule/schedule.service.ts
var formatSchedule = (schedule2) => {
  const { TB_M_APPLICATION, ...rest } = schedule2;
  return {
    ...rest,
    // Add related data
    APPLICATION_NAME: TB_M_APPLICATION?.APPLICATION_NAME || null,
    // Convert Date objects to full ISO strings
    SCHEDULE_SYNC_START_DT: schedule2.SCHEDULE_SYNC_START_DT.toISOString(),
    SCHEDULE_SYNC_END_DT: schedule2.SCHEDULE_SYNC_END_DT.toISOString(),
    SCHEDULE_UAR_DT: schedule2.SCHEDULE_UAR_DT.toISOString(),
    CREATED_DT: schedule2.CREATED_DT.toISOString(),
    CHANGED_DT: schedule2.CHANGED_DT ? schedule2.CHANGED_DT.toISOString() : null
  };
};
var scheduleService = {
  async getSchedules(app, query) {
    const {
      page = 1,
      limit = 10,
      q,
      applicationId,
      applicationName,
      status,
      sortBy = "CREATED_DT",
      order = "desc"
    } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (q) {
      where.OR = [
        { APPLICATION_ID: { contains: q } },
        {
          TB_M_APPLICATION: {
            APPLICATION_NAME: { contains: q }
          }
        }
      ];
    }
    if (applicationId) {
      where.APPLICATION_ID = applicationId;
    }
    if (applicationName) {
      where.TB_M_APPLICATION = {
        APPLICATION_NAME: { contains: applicationName }
      };
    }
    if (status) {
      where.SCHEDULE_STATUS = status;
    }
    const orderBy = sortBy === "APPLICATION_NAME" ? { TB_M_APPLICATION: { APPLICATION_NAME: order } } : { [sortBy]: order };
    try {
      const [rawData, total] = await app.prisma.$transaction([
        app.prisma.tB_M_SCHEDULE.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
          include: {
            TB_M_APPLICATION: {
              select: { APPLICATION_NAME: true }
            }
          }
        }),
        app.prisma.tB_M_SCHEDULE.count({ where })
      ]);
      const data = rawData.map(formatSchedule);
      const totalPages = Math.max(1, Math.ceil(total / limitNum));
      return {
        data,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      };
    } catch (e) {
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  async getSchedule(app, key) {
    try {
      const schedule2 = await app.prisma.tB_M_SCHEDULE.findUnique({
        where: {
          APPLICATION_ID_SCHEDULE_SYNC_START_DT_SCHEDULE_UAR_DT: {
            APPLICATION_ID: key.APPLICATION_ID,
            SCHEDULE_SYNC_START_DT: new Date(key.SCHEDULE_SYNC_START_DT),
            SCHEDULE_UAR_DT: new Date(key.SCHEDULE_UAR_DT)
          }
        },
        include: {
          TB_M_APPLICATION: {
            select: { APPLICATION_NAME: true }
          }
        }
      });
      if (!schedule2) {
        throw new ApplicationError(
          ERROR_CODES.APP_NOT_FOUND,
          ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
          404
        );
      }
      return formatSchedule(schedule2);
    } catch (e) {
      if (e instanceof ApplicationError) throw e;
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  async createSchedule(app, data) {
    console.log("scheddata", data);
    const dataForDb = {
      ...data,
      SCHEDULE_SYNC_START_DT: new Date(data.SCHEDULE_SYNC_START_DT),
      SCHEDULE_SYNC_END_DT: new Date(data.SCHEDULE_SYNC_END_DT),
      SCHEDULE_UAR_DT: new Date(data.SCHEDULE_UAR_DT),
      CREATED_DT: /* @__PURE__ */ new Date(),
      CHANGED_BY: null,
      CHANGED_DT: null
    };
    try {
      const newSchedule = await app.prisma.tB_M_SCHEDULE.create({
        data: dataForDb
      });
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app, {
        userId,
        module: "SCHE",
        action: "SCHEDULE_CREATE",
        status: "Success",
        description: `Create SCHEDULE ${newSchedule.APPLICATION_ID}`,
        location: "/applications"
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return formatSchedule(newSchedule);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            ERROR_MESSAGES[ERROR_CODES.APP_ALREADY_EXISTS],
            409
          );
        }
        if (e.code === "P2003") {
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
            404
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  async editSchedule(app, key, data) {
    const dataForUpdate = {
      ...data,
      SCHEDULE_SYNC_START_DT: new Date(data.SCHEDULE_SYNC_START_DT),
      SCHEDULE_SYNC_END_DT: new Date(data.SCHEDULE_SYNC_END_DT),
      SCHEDULE_UAR_DT: new Date(data.SCHEDULE_UAR_DT),
      CHANGED_DT: /* @__PURE__ */ new Date()
    };
    try {
      const updatedSchedule = await app.prisma.tB_M_SCHEDULE.update({
        where: {
          APPLICATION_ID_SCHEDULE_SYNC_START_DT_SCHEDULE_UAR_DT: {
            APPLICATION_ID: key.APPLICATION_ID,
            SCHEDULE_SYNC_START_DT: new Date(key.SCHEDULE_SYNC_START_DT),
            SCHEDULE_UAR_DT: new Date(key.SCHEDULE_UAR_DT)
          }
        },
        data: dataForUpdate
      });
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app, {
        userId,
        module: "SCHE",
        action: "SCHEDULE_UPDATE",
        status: "Success",
        description: `Create SCHEDULE ${updatedSchedule.APPLICATION_ID}`,
        location: "/applications"
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return formatSchedule(updatedSchedule);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
            404
          );
        }
        if (e.code === "P2002") {
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            "The new combination of Application ID, Sync Start Date, and UAR Date already exists.",
            409
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  async updateStatusSchedule(app, key, SCHEDULE_STATUS) {
    try {
      const CHANGED_BY = "Hesti";
      const updatedSchedule = await app.prisma.tB_M_SCHEDULE.update({
        where: {
          APPLICATION_ID_SCHEDULE_SYNC_START_DT_SCHEDULE_UAR_DT: {
            APPLICATION_ID: key.APPLICATION_ID,
            SCHEDULE_SYNC_START_DT: new Date(key.SCHEDULE_SYNC_START_DT),
            SCHEDULE_UAR_DT: new Date(key.SCHEDULE_UAR_DT)
          }
        },
        data: {
          SCHEDULE_STATUS,
          CHANGED_BY,
          CHANGED_DT: /* @__PURE__ */ new Date()
        }
      });
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app, {
        userId,
        module: "SCHE",
        action: "SCHEDULE_UPDATE",
        status: "Success",
        description: `Create SCHEDULE ${updatedSchedule.APPLICATION_ID}`,
        location: "/applications"
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return formatSchedule(updatedSchedule);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
            404
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  async deleteSchedule(app, key) {
    try {
      const deletedSchedule = await app.prisma.tB_M_SCHEDULE.delete({
        where: {
          APPLICATION_ID_SCHEDULE_SYNC_START_DT_SCHEDULE_UAR_DT: {
            APPLICATION_ID: key.APPLICATION_ID,
            SCHEDULE_SYNC_START_DT: new Date(key.SCHEDULE_SYNC_START_DT),
            SCHEDULE_UAR_DT: new Date(key.SCHEDULE_UAR_DT)
          }
        }
      });
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app, {
        userId,
        module: "SCHE",
        action: "SCHEDULE_DELETE",
        status: "Success",
        description: `Create SCHEDULE ${deletedSchedule.APPLICATION_ID}`,
        location: "/applications"
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return formatSchedule(deletedSchedule);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
            404
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  async getRunningUarSchedules(app) {
    const today = /* @__PURE__ */ new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );
    try {
      const runningSchedules = await app.prisma.tB_M_SCHEDULE.findMany({
        where: {
          SCHEDULE_UAR_DT: {
            gte: startOfDay,
            lt: endOfDay
          },
          SCHEDULE_STATUS: "1"
        }
      });
      return runningSchedules.map((s) => formatSchedule(s));
    } catch (e) {
      app.log.error(e, "Failed to get running UAR schedules");
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  async getRunningSyncSchedules(app) {
    const today = /* @__PURE__ */ new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    try {
      const runningSchedules = await app.prisma.tB_M_SCHEDULE.findMany({
        where: {
          SCHEDULE_SYNC_START_DT: { lte: startOfToday },
          SCHEDULE_SYNC_END_DT: { gte: startOfToday },
          SCHEDULE_STATUS: "1"
        }
      });
      return runningSchedules.map((s) => formatSchedule(s));
    } catch (e) {
      app.log.error(e, "Failed to get running sync schedules");
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  }
};
async function runCreateOnlySync(sourcePicList, app) {
  app.log.info("--- Starting Create-Only Sync ---");
  try {
    const databasePicList = await app.prisma.tB_M_UAR_PIC.findMany({
      select: { ID: true }
    });
    app.log.info(
      `"Database" has ${databasePicList.length} records before sync.`
    );
    app.log.info("Step 1: In-memory tempUarPic cleaned.");
    const tempUarPic = [];
    app.log.info(`Step 2: "Grabbed" ${sourcePicList.length} source records.`);
    const databaseIdMap = new Map(databasePicList.map((pic) => [pic.ID, true]));
    const newTempUarPics = sourcePicList.filter(
      (sourcePic) => !databaseIdMap.has(sourcePic.ID)
    );
    tempUarPic.push(...newTempUarPics);
    app.log.info(
      `Step 3: Filtered for new records. ${tempUarPic.length} new records found.`
    );
    const requiredFields = uarPicSchema.body.required;
    let validatedTempPic = tempUarPic.filter((pic) => {
      for (const key of requiredFields) {
        const value = pic[key];
        if (value === null || value === void 0) {
          app.log.warn(
            `  Skipping: ${pic.ID} (Reason: Required field ${key} is missing or null).`
          );
          return false;
        }
      }
      return true;
    });
    app.log.info(
      `Step 4: Validated records. ${validatedTempPic.length} records are valid.`
    );
    if (validatedTempPic.length > 0) {
      const dataToCreate = validatedTempPic.map((pic) => ({
        ...pic,
        CREATED_DT: new Date(pic.CREATED_DT),
        CHANGED_DT: pic.CHANGED_DT ? new Date(pic.CHANGED_DT) : null
      }));
      console.log("dttcr", dataToCreate);
      const createResult = await createManyWithManualDuplicateCheck(
        app,
        dataToCreate
      );
      app.log.info(
        `Step 5: Pushed ${createResult.count} new records to "database".`
      );
    } else {
      app.log.info("Step 5: No new records to push to database.");
    }
    const finalCount = await app.prisma.tB_M_UAR_PIC.count();
    app.log.info(`"Database" has ${finalCount} records after sync.`);
  } catch (e) {
    app.log.error(e, "Error during UAR PIC sync process");
  }
}
async function createManyWithManualDuplicateCheck(app, dataToCreate) {
  const UNIQUE_KEYS = ["ID"];
  if (!dataToCreate || dataToCreate.length === 0) {
    console.log("No data provided to create.");
    return { count: 0 };
  }
  const createKey = (item) => UNIQUE_KEYS.map((key) => `${key}_${item[key]}`).join("|");
  const uniqueItemMap = /* @__PURE__ */ new Map();
  for (const item of dataToCreate) {
    if (!item.ID) {
      console.warn("Skipping item with no ID:", item);
      continue;
    }
    const itemKey = createKey(item);
    if (!uniqueItemMap.has(itemKey)) {
      uniqueItemMap.set(itemKey, item);
    }
  }
  const uniqueDataToCreate = Array.from(uniqueItemMap.values());
  const originalInputCount = dataToCreate.length;
  const afterInternalDedupCount = uniqueDataToCreate.length;
  if (afterInternalDedupCount < originalInputCount) {
    console.log(
      `Removed ${originalInputCount - afterInternalDedupCount} duplicates from the input data.`
    );
  }
  if (uniqueDataToCreate.length === 0) {
    console.log("No unique data left to create after internal deduplication.");
    return { count: 0 };
  }
  const whereClauses = uniqueDataToCreate.map((item) => ({
    ID: { equals: item.ID }
  }));
  const existingRecords = await app.prisma.tB_M_UAR_PIC.findMany({
    where: {
      OR: whereClauses
    },
    select: {
      ID: true
    }
  });
  const existingKeySet = new Set(existingRecords.map(createKey));
  const dataToActuallyCreate = uniqueDataToCreate.filter((item) => {
    const itemKey = createKey(item);
    return !existingKeySet.has(itemKey);
  });
  if (dataToActuallyCreate.length > 0) {
    const createResult = await app.prisma.tB_M_UAR_PIC.createMany({
      data: dataToActuallyCreate
    });
    console.log(`Found ${existingRecords.length} existing records in DB.`);
    console.log(`Created ${createResult.count} new records.`);
    return createResult;
  } else {
    return { count: 0 };
  }
}
var randomDelay = (ms = 500) => new Promise((resolve2) => setTimeout(resolve2, Math.random() * ms));
async function fetchFromDB1(app) {
  app.log.info("Fetching data from DB1...");
  await randomDelay(300);
  app.log.info(`Fetched ${uarSO1.length} records from DB1.`);
  return uarSO1;
}
async function fetchFromDB2(app) {
  app.log.info("Fetching data from DB2...");
  await randomDelay(500);
  app.log.info(`Fetched ${uarSO2.length} records from DB2.`);
  return uarSO2;
}
async function fetchFromDB3(app) {
  app.log.info("Fetching data from DB3...");
  await randomDelay(200);
  if (Math.random() < 0.1) {
    app.log.error("Simulation: Connection to DB3 failed!");
    throw new Error("Connection timed out to DB3");
  }
  app.log.info(`Fetched ${uarSO3.length} records from DB3.`);
  return uarSO3;
}
async function fetchFromDB4(app) {
  app.log.info("Fetching data from DB4...");
  await randomDelay(400);
  app.log.info(`Fetched ${uarSO4.length} records from DB4.`);
  return uarSO4;
}
async function fetchFromDB5(app) {
  app.log.info("Fetching data from DB5...");
  await randomDelay(600);
  app.log.info(`Fetched ${uarSO5.length} records from DB5.`);
  return uarSO5;
}

// src/modules/master_data/schedule/schedule.controller.ts
var scheduleController = {
  getSchedules: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const schedules = await scheduleService.getSchedules(app, req.query);
    return reply.code(200).send({
      requestId,
      ...schedules
    });
  },
  createSchedule: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const body = req.body;
    const username = req.auth?.username ?? req.user?.sub ?? "system";
    body.CREATED_BY = username;
    const schedule2 = await scheduleService.createSchedule(app, body);
    return reply.code(201).send({ requestId, data: schedule2 });
  },
  editSchedule: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const key = req.params;
    const body = req.body;
    const username = req.auth?.username ?? req.user?.sub ?? "system";
    body.CHANGED_BY = username;
    const schedule2 = await scheduleService.editSchedule(app, key, body);
    return reply.code(200).send({ requestId, data: schedule2 });
  },
  updateStatusSchedule: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const compoundId = req.params;
    const body = req.body;
    const schedule2 = await scheduleService.updateStatusSchedule(
      app,
      compoundId,
      body.SCHEDULE_STATUS
    );
    return reply.code(200).send({ requestId, data: schedule2 });
  }
};

// src/modules/master_data/schedule/schedule.schemas.ts
var scheduleSchema = {
  body: {
    type: "object",
    required: [
      "APPLICATION_ID",
      "SCHEDULE_SYNC_START_DT",
      "SCHEDULE_SYNC_END_DT",
      "SCHEDULE_UAR_DT"
    ],
    properties: {
      APPLICATION_ID: { type: "string", maxLength: 20 },
      SCHEDULE_SYNC_START_DT: { type: "string" },
      SCHEDULE_SYNC_END_DT: { type: "string" },
      SCHEDULE_UAR_DT: { type: "string" },
      SCHEDULE_STATUS: { type: "string", maxLength: 1 },
      CREATED_BY: { type: "string", maxLength: 50 },
      CREATED_DT: { type: "string", format: "date-time" },
      CHANGED_BY: { type: "string", maxLength: 50 },
      CHANGED_DT: { type: "string", format: "date-time" }
    },
    additionalProperties: false
  }
};

// src/api/schedule/schedule.routes.ts
var scheduleRoutes = async (app) => {
  app.get("/", { errorHandler }, async (req, reply) => {
    return scheduleController.getSchedules(app)(req, reply);
  });
  app.post(
    "/",
    { schema: scheduleSchema, errorHandler },
    async (req, reply) => {
      return scheduleController.createSchedule(app)(req, reply);
    }
  );
  app.put(
    "/:APPLICATION_ID/:SCHEDULE_SYNC_START_DT/:SCHEDULE_UAR_DT",
    { schema: scheduleSchema, errorHandler },
    async (req, reply) => {
      return scheduleController.editSchedule(app)(req, reply);
    }
  );
  app.put(
    "/:APPLICATION_ID/:SCHEDULE_SYNC_START_DT/:SCHEDULE_UAR_DT/status",
    { errorHandler },
    async (req, reply) => {
      return scheduleController.updateStatusSchedule(app)(req, reply);
    }
  );
};

// src/modules/master_data/uarpic/uarpic.service.ts
import { Prisma as Prisma2 } from "./generated/prisma/index.js";
function validateUarPicData(PIC_NAME, DIVISION_ID, MAIL) {
  if (!MAIL.endsWith("@toyota.co.id")) {
    throw new ApplicationError(
      ERROR_CODES.VAL_INVALID_FORMAT,
      ERROR_MESSAGES[ERROR_CODES.VAL_INVALID_FORMAT],
      400
    );
  }
  if (/\d/.test(PIC_NAME)) {
    throw new ApplicationError(
      ERROR_CODES.VAL_INVALID_FORMAT,
      "PIC_NAME should not contain numbers",
      400
    );
  }
}
async function dupeCheck(app, MAIL, currentID = null) {
  const where = {
    MAIL: { equals: MAIL }
  };
  if (currentID) {
    where.NOT = {
      ID: currentID
    };
  }
  const duplicate = await app.prisma.tB_M_UAR_PIC.findFirst({ where });
  if (duplicate) {
    throw new ApplicationError(
      ERROR_CODES.APP_ALREADY_EXISTS,
      ERROR_MESSAGES[ERROR_CODES.APP_ALREADY_EXISTS] || "UAR PIC with this MAIL already exists",
      400
      // 400 (Bad Request) or 409 (Conflict) are appropriate
    );
  }
}
var uarPicService = {
  /**
   * Get paginated, filtered, and sorted UAR PICs
   */
  async getUarPics(app, query) {
    const {
      page = 1,
      limit = 10,
      divisionId,
      q,
      pic_name,
      startDate,
      endDate,
      sortBy = "CREATED_DT",
      order = "desc"
    } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (divisionId) {
      where.DIVISION_ID = Number(divisionId);
    }
    if (pic_name) {
      where.PIC_NAME = { contains: pic_name };
    }
    if (q) {
      const s = String(q);
      where.OR = [
        { PIC_NAME: { contains: s } },
        { MAIL: { contains: s } },
        { ID: { contains: s } }
        // Assuming ID is string
      ];
    }
    if (startDate || endDate) {
      const start2 = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;
      where.CREATED_DT = {};
      if (start2) {
        where.CREATED_DT.gte = start2;
      }
      if (end) {
        where.CREATED_DT.lte = end;
      }
    }
    try {
      const [data, total] = await app.prisma.$transaction([
        app.prisma.tB_M_UAR_PIC.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: [{ CREATED_DT: "desc" }, { ID: "desc" }]
        }),
        app.prisma.tB_M_UAR_PIC.count({ where })
      ]);
      const totalPages = Math.max(1, Math.ceil(total / limitNum));
      return {
        data,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      };
    } catch (e) {
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  /**
   * Create a new UAR PIC
   */
  async createUarPic(app, PIC_NAME, DIVISION_ID, MAIL, CREATED_BY) {
    const lowerCaseMail = MAIL.toLowerCase();
    await dupeCheck(app, lowerCaseMail);
    validateUarPicData(PIC_NAME, DIVISION_ID, lowerCaseMail);
    const now = /* @__PURE__ */ new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    const todayPics = await app.prisma.tB_M_UAR_PIC.findMany({
      where: {
        CREATED_DT: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        ID: true
        // Only fetch the ID
      }
    });
    const todayIds = todayPics.map((item) => item.ID);
    const uarPicData = {
      ID: generateID("PIC", "CIO", todayIds),
      PIC_NAME,
      DIVISION_ID,
      MAIL: lowerCaseMail,
      CREATED_BY,
      // Hardcoded as per original
      CREATED_DT: /* @__PURE__ */ new Date(),
      CHANGED_BY: null,
      CHANGED_DT: null
    };
    try {
      const newData = await app.prisma.tB_M_UAR_PIC.create({
        data: uarPicData
      });
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app, {
        userId,
        module: "UAR_PIC",
        action: "UAR_PIC_CREATE",
        status: "Success",
        description: `Create UAR PIC ${newData.PIC_NAME}`,
        location: "/applications"
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return newData;
    } catch (e) {
      if (e instanceof Prisma2.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          app.log.error(e);
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            `A UAR PIC with this data already exists.`,
            400
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  /**
   * Edit an existing UAR PIC
   */
  async editUarPic(app, ID, PIC_NAME, DIVISION_ID, MAIL, CHANGED_BY) {
    const lowerCaseMail = MAIL.toLowerCase();
    const uarPic = await app.prisma.tB_M_UAR_PIC.findUnique({
      where: { ID }
    });
    if (!uarPic) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
        404
        // 404 Not Found is more appropriate
      );
    }
    validateUarPicData(PIC_NAME, DIVISION_ID, lowerCaseMail);
    if (uarPic.MAIL.toLowerCase() !== lowerCaseMail) {
      await dupeCheck(app, lowerCaseMail, ID);
    }
    const uarPicData = {
      PIC_NAME,
      DIVISION_ID,
      MAIL: lowerCaseMail,
      CHANGED_BY,
      // Hardcoded as per original
      CHANGED_DT: /* @__PURE__ */ new Date()
    };
    try {
      const updatedUarPic = await app.prisma.tB_M_UAR_PIC.update({
        where: { ID },
        data: uarPicData
      });
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app, {
        userId,
        module: "UAR_PIC",
        action: "UAR_PIC_UPDATE",
        status: "Success",
        description: `Create UAR PIC ${updatedUarPic.PIC_NAME}`,
        location: "/applications"
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return updatedUarPic;
    } catch (e) {
      if (e instanceof Prisma2.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          app.log.error(`Record not found with ID: ${ID}`);
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
            404
          );
        }
        if (e.code === "P2002") {
          app.log.error(e);
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            "UAR PIC with this MAIL already exists",
            400
          );
        }
      }
      app.log.error(`Possible Error: ${e}`);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  /**
   * Delete a UAR PIC
   */
  async deleteUarPic(app, ID) {
    try {
      const deletedUarPic = await app.prisma.tB_M_UAR_PIC.delete({
        where: { ID }
      });
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app, {
        userId,
        module: "UAR_PIC",
        action: "UAR_PIC_DELETE",
        status: "Success",
        description: `Create UAR PIC ${deletedUarPic.PIC_NAME}`,
        location: "/applications"
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return deletedUarPic;
    } catch (e) {
      if (e instanceof Prisma2.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
            404
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  /**
   * Get all UAR PICs created today
   */
  async getRunningSchedules(app) {
    const now = /* @__PURE__ */ new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    try {
      const runningSchedules = await app.prisma.tB_M_UAR_PIC.findMany({
        where: {
          CREATED_DT: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });
      console.log("Running Schedules:", runningSchedules);
      return runningSchedules;
    } catch (e) {
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  }
};

// src/modules/master_data/uarpic/uarpic.controller.ts
var uarController = {
  getUar: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const uarData = await uarPicService.getUarPics(app, req.query);
    return reply.status(200).send({
      requestId,
      ...uarData
    });
  },
  createUar: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const { PIC_NAME, DIVISION_ID, MAIL } = req.body;
    const username = req.auth?.username ?? req.user?.sub ?? "system";
    const uarPicData = await uarPicService.createUarPic(
      app,
      PIC_NAME,
      DIVISION_ID,
      MAIL,
      username
    );
    return reply.status(201).send({
      requestId,
      data: uarPicData
    });
  },
  editUar: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const ID = req.params.id;
    const { PIC_NAME, DIVISION_ID, MAIL } = req.body;
    const username = req.auth?.username ?? req.user?.sub ?? "system";
    const uarPicData = await uarPicService.editUarPic(
      app,
      ID,
      PIC_NAME,
      DIVISION_ID,
      MAIL,
      username
    );
    return reply.status(200).send({
      requestId,
      data: uarPicData
    });
  },
  deleteUar: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const ID = req.params.id;
    await uarPicService.deleteUarPic(app, ID);
    return reply.status(200).send({
      requestId,
      message: `UAR PIC with ID ${ID} has been deleted.`
    });
  }
};

// src/api/master_data/uarpic/uarpic.routes.ts
async function uarRoutes(app) {
  app.get("/", async (req, reply) => {
    return uarController.getUar(app)(req, reply);
  });
  app.post(
    "/",
    { errorHandler, schema: uarPicSchema },
    async (req, reply) => {
      return uarController.createUar(app)(req, reply);
    }
  );
  app.put(
    "/:id",
    { errorHandler, schema: uarPicSchema },
    async (req, reply) => {
      return uarController.editUar(app)(req, reply);
    }
  );
  app.delete(
    "/:id",
    { errorHandler },
    async (req, reply) => {
      return uarController.deleteUar(app)(req, reply);
    }
  );
}

// src/modules/log_monitoring/log_monitoring.schema.ts
var listLogsSchema = {
  querystring: {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
      status: { type: "string", enum: ["Success", "Error", "Warning", "InProgress"] },
      module: { type: "string" },
      userId: { type: "string" },
      q: { type: "string" },
      startDate: { type: "string" },
      // "DD-MM-YYYY HH:mm:ss"
      endDate: { type: "string" },
      sortBy: { type: "string", enum: ["NO", "START_DATE", "END_DATE"], default: "START_DATE" },
      order: { type: "string", enum: ["asc", "desc"], default: "desc" }
    },
    additionalProperties: false
  }
};
var getLogSchema = {
  params: {
    type: "object",
    properties: {
      processId: { type: "string" }
    },
    required: ["processId"]
  }
};
var listDetailsSchema = {
  params: {
    type: "object",
    properties: {
      processId: { type: "string" }
    },
    required: ["processId"]
  },
  querystring: {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 200, default: 20 }
    },
    additionalProperties: false
  }
};
var exportExcelSchema = {
  querystring: {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 1e3, default: 1e3 },
      // default besar biar semua kebawa
      status: { type: "string", enum: ["Success", "Error", "Warning", "InProgress"] },
      module: { type: "string" },
      userId: { type: "string" },
      q: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" },
      sortBy: { type: "string", enum: ["NO", "START_DATE", "END_DATE"], default: "START_DATE" },
      order: { type: "string", enum: ["asc", "desc"], default: "desc" },
      includeDetails: { type: "boolean", default: false }
      // kalau true, bikin sheet LogDetails juga
    },
    additionalProperties: false
  }
};

// src/modules/log_monitoring/log_monitoring.service.ts
var logMonitoringService = {
  async listLogs(query) {
    const q = {
      sortBy: "START_DATE",
      order: "desc",
      page: 1,
      limit: 10,
      ...query
    };
    return logRepository.listLogs(q);
  },
  async getLog(processId) {
    return logRepository.getLogByProcessId(processId);
  },
  async listDetails(processId, page, limit) {
    const p = page ?? 1;
    const l = limit ?? 20;
    return logRepository.listDetailsByProcessId(processId, p, l);
  }
};

// src/modules/log_monitoring/mock.ts
var mockLogs = [
  // Security
  // {
  //     NO: 18,
  //     PROCESS_ID: '2025011600018',
  //     USER_ID: 'admin',
  //     MODULE: 'Security',
  //     FUNCTION_NAME: 'Login Success',
  //     START_DATE: '21-07-2024 16:30:00',
  //     END_DATE: '21-07-2025 16:30:00',
  //     STATUS: 'Success',
  //     DETAILS: []
  // },
  // {
  //     NO: 17,
  //     PROCESS_ID: '2025011600017',
  //     USER_ID: 'admin',
  //     MODULE: 'Security',
  //     FUNCTION_NAME: 'Login Success',
  //     START_DATE: '21-07-2025 16:30:00',
  //     END_DATE: '21-07-2025 16:30:00',
  //     STATUS: 'Success',
  //     DETAILS: []
  // },
  // {
  //     NO: 16,
  //     PROCESS_ID: '2025011600016',
  //     USER_ID: 'unknown',
  //     MODULE: 'Security',
  //     FUNCTION_NAME: 'Login Failed',
  //     START_DATE: '21-07-2025 16:25:00',
  //     END_DATE: '21-07-2025 16:25:00',
  //     STATUS: 'Error',
  //     DETAILS: []
  // },
  // // InProgress
  // {
  //     NO: 15,
  //     PROCESS_ID: '2025011600015',
  //     USER_ID: 'systemowner',
  //     MODULE: 'UAR',
  //     FUNCTION_NAME: 'Update',
  //     START_DATE: '21-07-2025 16:00:00',
  //     END_DATE: '21-07-2025 16:00:00',
  //     STATUS: 'InProgress',
  //     DETAILS: []
  // },
  // // Errors
  // {
  //     NO: 14,
  //     PROCESS_ID: '2025011600014',
  //     USER_ID: 'dph',
  //     MODULE: 'Application xx',
  //     FUNCTION_NAME: 'Update',
  //     START_DATE: '22-10-2025 15:15:00',
  //     END_DATE: '24-10-2025 15:15:01',
  //     STATUS: 'Error',
  //     DETAILS: []
  // },
  // {
  //     NO: 13,
  //     PROCESS_ID: '2025011600013',
  //     USER_ID: 'admin',
  //     MODULE: 'UAR',
  //     FUNCTION_NAME: 'Create',
  //     START_DATE: '23-10-2025 15:00:00',
  //     END_DATE: '25-10-2025 15:00:02',
  //     STATUS: 'Error',
  //     DETAILS: []
  // },
  // // Schedule
  // {
  //     NO: 12,
  //     PROCESS_ID: '2025011600012',
  //     USER_ID: 'systemowner',
  //     MODULE: 'Schedule',
  //     FUNCTION_NAME: 'Update',
  //     START_DATE: '21-07-2025 14:15:00',
  //     END_DATE: '21-07-2025 14:15:04',
  //     STATUS: 'Success',
  //     DETAILS: []
  // },
  // {
  //     NO: 11,
  //     PROCESS_ID: '2025011600011',
  //     USER_ID: 'admin',
  //     MODULE: 'Schedule',
  //     FUNCTION_NAME: 'Create',
  //     START_DATE: '21-07-2025 14:00:00',
  //     END_DATE: '21-07-2025 14:00:05',
  //     STATUS: 'Success',
  //     DETAILS: []
  // },
  // // User
  // {
  //     NO: 10,
  //     PROCESS_ID: '2025011600010',
  //     USER_ID: 'dph',
  //     MODULE: 'User',
  //     FUNCTION_NAME: 'Update',
  //     START_DATE: '21-07-2025 13:15:00',
  //     END_DATE: '21-07-2025 13:15:03',
  //     STATUS: 'Success',
  //     DETAILS:[]
  // },
  // {
  //     NO: 9,
  //     PROCESS_ID: '2025011600009',
  //     USER_ID: 'admin',
  //     MODULE: 'User',
  //     FUNCTION_NAME: 'Create',
  //     START_DATE: '21-07-2025 13:00:00',
  //     END_DATE: '21-07-2025 13:00:07',
  //     STATUS: 'Success',
  //     DETAILS: []
  // },
  // // System Master
  // {
  //     NO: 8, PROCESS_ID: '2025011600008',
  //     USER_ID: 'admin',
  //     MODULE: 'System Master',
  //     FUNCTION_NAME: 'Update',
  //     START_DATE: '21-07-2025 12:15:00',
  //     END_DATE: '21-07-2025 12:15:04',
  //     STATUS: 'Success',
  //     DETAILS: []
  // },
  // {
  //     NO: 7,
  //     PROCESS_ID: '2025011600007',
  //     USER_ID: 'systemowner',
  //     MODULE: 'System Master',
  //     FUNCTION_NAME: 'Create',
  //     START_DATE: '21-07-2025 12:00:00',
  //     END_DATE: '21-07-2025 12:00:06',
  //     STATUS: 'Success',
  //     DETAILS: []
  // },
  // // Application
  // {
  //     NO: 6,
  //     PROCESS_ID: '2025011600006',
  //     USER_ID: 'admin',
  //     MODULE: 'Application',
  //     FUNCTION_NAME: 'Update',
  //     START_DATE: '21-07-2025 11:30:00',
  //     END_DATE: '21-07-2025 11:30:03',
  //     STATUS: 'Warning',
  //     DETAILS:[]
  // },
  // {
  //     NO: 5,
  //     PROCESS_ID: '2025011600005',
  //     USER_ID: 'dph',
  //     MODULE: 'Application',
  //     FUNCTION_NAME: 'Update',
  //     START_DATE: '21-07-2025 11:15:00',
  //     END_DATE: '21-07-2025 11:15:05',
  //     STATUS: 'Success',
  //     DETAILS: []
  // },
  // {
  //     NO: 4,
  //     PROCESS_ID: '2025011600004',
  //     USER_ID: 'admin',
  //     MODULE: 'Application',
  //     FUNCTION_NAME: 'Create',
  //     START_DATE: '21-07-2025 11:00:00',
  //     END_DATE: '21-07-2025 11:00:08',
  //     STATUS: 'Success',
  //     DETAILS: []
  // },
  // // UAR (oldest)
  // {
  //     NO: 3,
  //     PROCESS_ID: '2025011600003',
  //     USER_ID: 'systemowner',
  //     MODULE: 'UAR',
  //     FUNCTION_NAME: 'Delete',
  //     START_DATE: '21-07-2025 10:30:00',
  //     END_DATE: '21-07-2025 10:30:02',
  //     STATUS: 'Success',
  //     DETAILS: []
  // },
  // {
  //     NO: 2,
  //     PROCESS_ID: '2025011600002',
  //     USER_ID: 'dph',
  //     MODULE: 'UAR',
  //     FUNCTION_NAME: 'Update',
  //     START_DATE: '21-07-2025 10:15:00',
  //     END_DATE: '21-07-2025 10:15:03',
  //     STATUS: 'Success',
  //     DETAILS: []
  // },
  // {
  //     NO: 1,
  //     PROCESS_ID: '2025011600001',
  //     USER_ID: 'admin',
  //     MODULE: 'UAR',
  //     FUNCTION_NAME: 'Create',
  //     START_DATE: '21-07-2025 10:00:00',
  //     END_DATE: '21-07-2025 10:00:05',
  //     STATUS: 'Success',
  //     DETAILS: []
  // }
];
var mkDetails = (processId, base = "21-10-2025 10:00:00") => {
  return Array.from({ length: 10 }, (_, i) => ({
    ID: i + 1,
    PROCESS_ID: processId,
    MESSAGE_DATE_TIME: base,
    // untuk mock: sama; real-nya bisa dihitung per-step
    LOCATION: `Module.FunctionName.Step${i + 1}`,
    MESSAGE_DETAIL: `Execution step ${i + 1} completed.${(i + 1) % 4 === 0 ? " Encountered a minor warning." : ""}`
  }));
};
var mockLogDetails = mockLogs.flatMap(
  (l) => mkDetails(l.PROCESS_ID, l.START_DATE)
);

// src/modules/log_monitoring/log_monitoring.controller.ts
import ExcelJS from "exceljs";
import fs from "fs";
var toGB3 = (d) => d.toLocaleString("en-GB", { hour12: false }).replace(",", "");
var normalizeStatus2 = (s) => {
  if (!s) return "Success";
  const v = String(s).toLowerCase().trim();
  if (v === "success") return "Success";
  if (v === "failure" || v === "error") return "Error";
  if (v === "warning") return "Warning";
  if (v === "inprogress" || v === "in progress") return "InProgress";
  return "Success";
};
var seqCounter2 = 0;
var seqFile = "./seq.json";
try {
  if (fs.existsSync(seqFile)) {
    const saved = JSON.parse(fs.readFileSync(seqFile, "utf8"));
    seqCounter2 = saved.seq ?? 0;
  }
} catch {
}
function generateProcessId2() {
  const now = /* @__PURE__ */ new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const seq = String(seqCounter2++).padStart(5, "0");
  fs.writeFileSync(seqFile, JSON.stringify({ seq: seqCounter2 }));
  return `${yyyy}${mm}${dd}${seq}`;
}
var logMonitoringController = {
  listLogs: (app) => async (req, reply) => {
    const result = await logMonitoringService.listLogs(req.query);
    return reply.status(200).send(result);
  },
  getLog: (app) => async (req, reply) => {
    const { processId } = req.params;
    const data = await logMonitoringService.getLog(processId);
    if (!data) return reply.status(404).send({ message: "Log not found" });
    return reply.status(200).send({ data });
  },
  listDetails: (app) => async (req, reply) => {
    const result = await logMonitoringService.listDetails(
      req.params.processId,
      req.query.page,
      req.query.limit
    );
    return reply.status(200).send(result);
  },
  createLog: (app) => async (req, reply) => {
    try {
      const body = req.body;
      const now = /* @__PURE__ */ new Date();
      const processId = generateProcessId2();
      const newLog = {
        NO: 0,
        // repo yang isi urutan
        PROCESS_ID: String(processId),
        USER_ID: String(body.userId ?? "anonymous"),
        MODULE: String(body.module ?? "Unknown"),
        FUNCTION_NAME: String(body.action ?? "Unknown"),
        START_DATE: toGB3(new Date(body.timestamp ?? now)),
        END_DATE: toGB3(now),
        STATUS: normalizeStatus2(body.status),
        DETAILS: [
          {
            ID: 1,
            PROCESS_ID: String(processId),
            MESSAGE_DATE_TIME: toGB3(now),
            LOCATION: String(body.location ?? body.module ?? "Unknown"),
            MESSAGE_DETAIL: String(
              body.description ?? "Action logged by frontend"
            ),
            MESSAGE_ID: void 0,
            MESSAGE_TYPE: void 0
          }
        ]
      };
      await logRepository.insertLog(newLog);
      return reply.status(201).send({ message: "Log created", data: newLog });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ message: "Failed to create log" });
    }
  },
  exportExcel: (app) => async (req, reply) => {
    const { includeDetails = false, ...filters } = req.query;
    const effective = {
      ...filters,
      page: filters.page ?? 1,
      limit: filters.limit ?? 1e3
    };
    const { data, meta } = await logMonitoringService.listLogs(
      effective
    );
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Logs");
    ws.addRow([
      "No",
      "Process ID",
      "User ID",
      "Module",
      "Function Name",
      "Start Date",
      "End Date",
      "Status"
    ]);
    data.forEach((row, idx) => {
      ws.addRow([
        (effective.page - 1) * effective.limit + idx + 1,
        row.PROCESS_ID,
        row.USER_ID,
        row.MODULE,
        row.FUNCTION_NAME,
        row.START_DATE,
        row.END_DATE,
        row.STATUS
      ]);
    });
    ws.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const v = String(cell.value ?? "");
        max = Math.max(max, v.length + 2);
      });
      col.width = Math.min(max, 50);
    });
    if (includeDetails) {
      const wsd = wb.addWorksheet("LogDetails");
      wsd.addRow([
        "No",
        "Process ID",
        "Message Date Time",
        "Location",
        "Message Detail"
      ]);
      const pids = new Set(data.map((d) => d.PROCESS_ID));
      const details = mockLogDetails.filter((d) => pids.has(d.PROCESS_ID)).sort((a, b) => {
        const ka = a.ID ?? a.NO ?? 0;
        const kb = b.ID ?? b.NO ?? 0;
        return ka - kb;
      });
      details.forEach((d) => {
        wsd.addRow([
          d.ID ?? d.NO ?? "",
          d.PROCESS_ID,
          d.MESSAGE_DATE_TIME,
          d.LOCATION,
          d.MESSAGE_DETAIL
        ]);
      });
      wsd.columns.forEach((col) => {
        let max = 10;
        col.eachCell?.({ includeEmpty: true }, (cell) => {
          const v = String(cell.value ?? "");
          max = Math.max(max, v.length + 2);
        });
        col.width = Math.min(max, 70);
      });
    }
    const now = /* @__PURE__ */ new Date();
    const dateStamp = `${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `SAR_log_${dateStamp}.xlsx`;
    reply.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ).header("Content-Disposition", `attachment; filename="${filename}"`);
    const arrayBuf = await wb.xlsx.writeBuffer();
    const buf = Buffer.from(arrayBuf);
    return reply.send(buf);
  },
  exportDetailsExcel: (app) => async (req, reply) => {
    const { processId } = req.params;
    const { data } = await logMonitoringService.listDetails(
      processId,
      1,
      1e3
    );
    if (!data.length) {
      return reply.status(404).send({ message: "No details found for this process ID" });
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("LogDetails");
    ws.addRow(["No", "Message Date Time", "Location", "Message Detail"]);
    data.forEach((d, i) => {
      ws.addRow([i + 1, d.MESSAGE_DATE_TIME, d.LOCATION, d.MESSAGE_DETAIL]);
    });
    ws.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = String(cell.value ?? "").length;
        max = Math.max(max, len + 2);
      });
      col.width = Math.min(max, 70);
    });
    const filename = `LogDetails_${processId}.xlsx`;
    const arrayBuffer = await wb.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    reply.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ).header("Content-Disposition", `attachment; filename="${filename}"`).send(buffer);
  }
};

// src/api/logging_monitoring/log_monitoring.routes.ts
async function logMonitoringRoutes(app) {
  app.get(
    "",
    {
      schema: listLogsSchema,
      preHandler: app.requirePermission("LOG_MONITORING_VIEW")
    },
    logMonitoringController.listLogs(app)
  );
  app.get(
    "/:processId",
    {
      schema: getLogSchema,
      preHandler: app.requirePermission("LOG_MONITORING_VIEW_DETAIL")
    },
    logMonitoringController.getLog(app)
  );
  app.get(
    "/:processId/details",
    { schema: listDetailsSchema },
    logMonitoringController.listDetails(app)
  );
  app.get(
    "/export",
    { schema: exportExcelSchema },
    logMonitoringController.exportExcel(app)
  );
  app.get(
    "/:processId/details/export",
    logMonitoringController.exportDetailsExcel(app)
  );
  app.post("", logMonitoringController.createLog(app));
}

// src/modules/master_data/application/application.repository.ts
function toOrder(sortField, sortOrder) {
  const field = sortField ?? "CREATED_DT";
  const order = sortOrder ?? "desc";
  return { [field]: order };
}
function mapStatusDbToDto(db) {
  if (db === 0 || db === "0") return "Active";
  if (db === 1 || db === "1") return "Inactive";
  return "Inactive";
}
function mapRowDbToDto(r) {
  return {
    APPLICATION_ID: r.APPLICATION_ID,
    APPLICATION_NAME: r.APPLICATION_NAME,
    DIVISION_ID_OWNER: String(r.DIVISION_ID_OWNER),
    NOREG_SYSTEM_OWNER: r.NOREG_SYSTEM_OWNER,
    NOREG_SYSTEM_CUST: r.NOREG_SYSTEM_CUST,
    SECURITY_CENTER: r.SECURITY_CENTER,
    APPLICATION_STATUS: mapStatusDbToDto(r.APPLICATION_STATUS),
    CREATED_BY: r.CREATED_BY,
    CREATED_DT: new Date(r.CREATED_DT).toISOString(),
    CHANGED_BY: r.CHANGED_BY,
    CHANGED_DT: new Date(r.CHANGED_DT).toISOString()
  };
}
async function getDbNow() {
  const rows = await prisma.$queryRaw`SELECT GETDATE() AS now`;
  return rows[0]?.now ?? /* @__PURE__ */ new Date();
}
var applicationRepository = {
  async activeList() {
    const [dataRaw] = await Promise.all([
      prisma.tB_M_APPLICATION.findMany({
        where: {
          APPLICATION_STATUS: "0"
        }
      })
    ]);
    const data = dataRaw.map(mapRowDbToDto);
    return { data };
  },
  // List aplikasi dengan pencarian, sorting, dan pagination
  async list(params) {
    const search = params.search?.trim();
    const orConds = [];
    if (search) {
      orConds.push({ APPLICATION_ID: { contains: search } });
      orConds.push({ APPLICATION_NAME: { contains: search } });
      const num = Number(search);
      if (Number.isFinite(num)) {
        orConds.push({ DIVISION_ID_OWNER: num });
      }
    }
    const where = search ? { OR: orConds } : void 0;
    const [dataRaw, total] = await Promise.all([
      prisma.tB_M_APPLICATION.findMany({
        where,
        orderBy: toOrder(params.sortField, params.sortOrder),
        skip: (params.page - 1) * params.limit,
        take: params.limit
      }),
      prisma.tB_M_APPLICATION.count({ where })
    ]);
    const data = dataRaw.map(mapRowDbToDto);
    return { data, total };
  },
  // Ambil detail aplikasi by primary key (APPLICATION_ID)
  async findById(id) {
    const row = await prisma.tB_M_APPLICATION.findUnique({
      where: { APPLICATION_ID: id }
    });
    return row ? mapRowDbToDto(row) : null;
  },
  async existsByOwnerNoreg(ownerNoreg) {
    const noreg = String(ownerNoreg).trim().toUpperCase();
    const count = await prisma.tB_M_APPLICATION.count({
      where: { NOREG_SYSTEM_OWNER: noreg }
    });
    return count > 0;
  },
  async existsByOwnerNoregExceptApp(appId, ownerNoreg) {
    const noreg = String(ownerNoreg).trim().toUpperCase();
    const id = String(appId).trim().toUpperCase();
    const count = await prisma.tB_M_APPLICATION.count({
      where: {
        APPLICATION_ID: { not: id },
        NOREG_SYSTEM_OWNER: noreg
      }
    });
    return count > 0;
  },
  async existsByName(name) {
    const appName = String(name).trim().toUpperCase();
    const count = await prisma.tB_M_APPLICATION.count({
      where: {
        APPLICATION_NAME: appName
      }
    });
    return count > 0;
  },
  async existsByNameExceptApp(appId, name) {
    const appName = String(name).trim().toUpperCase();
    const appIdNorm = String(appId).trim().toUpperCase();
    const count = await prisma.tB_M_APPLICATION.count({
      where: {
        APPLICATION_ID: { not: appIdNorm },
        APPLICATION_NAME: appName
      }
    });
    return count > 0;
  },
  // Alias pencarian code (identik dengan findById di model ini)
  async findByCode(code) {
    const row = await prisma.tB_M_APPLICATION.findUnique({
      where: { APPLICATION_ID: code }
    });
    return row ? mapRowDbToDto(row) : null;
  },
  // Buat aplikasi baru
  // Catatan:
  // - APPLICATION_STATUS pada DB disimpan sebagai kode numerik string: '0' (Active) / '1' (Inactive)
  // - CREATED_DT/CHANGED_DT bertipe Date pada SQL Server; Prisma akan memetakannya
  async create(payload, auditUser) {
    const now = await getDbNow();
    console.log("payloadss", payload);
    const created = await prisma.tB_M_APPLICATION.create({
      data: {
        APPLICATION_ID: payload.APPLICATION_ID,
        APPLICATION_NAME: payload.APPLICATION_NAME,
        DIVISION_ID_OWNER: Number(payload.DIVISION_ID_OWNER),
        NOREG_SYSTEM_OWNER: payload.NOREG_SYSTEM_OWNER,
        NOREG_SYSTEM_CUST: payload.NOREG_SYSTEM_CUST,
        SECURITY_CENTER: payload.SECURITY_CENTER,
        // Simpan sebagai '0' (Active) atau '1' (Inactive)
        APPLICATION_STATUS: payload.APPLICATION_STATUS === "Active" ? "0" : "1",
        CREATED_BY: auditUser,
        CREATED_DT: now,
        CHANGED_BY: auditUser,
        CHANGED_DT: now
      }
    });
    console.log("createds", created);
    return mapRowDbToDto(created);
  },
  // Update aplikasi
  // Mapping status tetap sama seperti create
  async update(id, updates, auditUser) {
    const now = await getDbNow();
    try {
      const updated = await prisma.tB_M_APPLICATION.update({
        where: { APPLICATION_ID: id },
        data: {
          APPLICATION_NAME: updates.APPLICATION_NAME,
          DIVISION_ID_OWNER: updates.DIVISION_ID_OWNER ? Number(updates.DIVISION_ID_OWNER) : void 0,
          NOREG_SYSTEM_OWNER: updates.NOREG_SYSTEM_OWNER,
          NOREG_SYSTEM_CUST: updates.NOREG_SYSTEM_CUST,
          SECURITY_CENTER: updates.SECURITY_CENTER,
          APPLICATION_STATUS: updates.APPLICATION_STATUS ? updates.APPLICATION_STATUS === "Active" ? "0" : "1" : void 0,
          CHANGED_BY: auditUser,
          CHANGED_DT: now
        }
      });
      return mapRowDbToDto(updated);
    } catch {
      return null;
    }
  },
  // ---------- master lookups ----------
  // Ambil user by NOREG (snapshot terbaru berdasarkan VALID_TO)
  // Eligibility sederhana: true untuk owner & custodian (aturan detail bisa ditambahkan nanti)
  async getUserByNoreg(noreg) {
    const row = await prisma.tB_M_EMPLOYEE.findFirst({
      where: { NOREG: noreg },
      orderBy: { VALID_TO: "desc" },
      select: {
        NOREG: true,
        DIVISION_ID: true,
        PERSONNEL_NAME: true,
        DIVISION_NAME: true,
        MAIL: true,
        DEPARTMENT_NAME: true
      }
    });
    if (!row) return null;
    return {
      NOREG: row.NOREG,
      DIVISION_ID: row.DIVISION_ID ?? void 0,
      PERSONAL_NAME: row.PERSONNEL_NAME ?? "",
      DIVISION_NAME: row.DIVISION_NAME ?? "",
      MAIL: row.MAIL ?? "",
      DEPARTEMENT_NAME: row.DEPARTMENT_NAME ?? "",
      canBeOwner: true,
      canBeCustodian: true
    };
  },
  // List user untuk dropdown FE: distinct berdasarkan NOREG
  // Pencarian by NOREG/NAME, sort by PERSONNEL_NAME
  async listUsers(p) {
    const q = (p?.q ?? "").trim();
    const limit = Math.min(p?.limit ?? 10, 50);
    const offset = p?.offset ?? 0;
    const where = q ? {
      OR: [
        { NOREG: { contains: q } },
        { PERSONNEL_NAME: { contains: q } }
      ]
    } : void 0;
    const [rows, total] = await Promise.all([
      prisma.tB_M_EMPLOYEE.findMany({
        where,
        distinct: ["NOREG"],
        orderBy: { PERSONNEL_NAME: "asc" },
        skip: offset,
        take: limit,
        select: {
          DIVISION_ID: true,
          DEPARTMENT_ID: true,
          NOREG: true,
          PERSONNEL_NAME: true,
          DIVISION_NAME: true,
          MAIL: true,
          DEPARTMENT_NAME: true,
          TB_M_DIVISION: {
            select: {
              DIVISION_NAME: true
            }
          }
        }
      }),
      prisma.tB_M_EMPLOYEE.count({ where })
    ]);
    const items = rows.map((r) => ({
      NOREG: r.NOREG,
      DIVISION_ID: r.DIVISION_ID,
      DEPARTMENT_ID: r.DEPARTMENT_ID,
      PERSONAL_NAME: r.PERSONNEL_NAME ?? "",
      DIVISION_NAME: r.TB_M_DIVISION?.DIVISION_NAME ?? "",
      MAIL: r.MAIL ?? "",
      DEPARTEMENT_NAME: r.DEPARTMENT_NAME ?? "",
      canBeOwner: true,
      canBeCustodian: true
    }));
    return { items, total };
  },
  // Validasi Security Center: minimal sudah pernah digunakan oleh satu aplikasi
  async isValidSecurityCenter(sc) {
    const count = await prisma.tB_M_APPLICATION.count({ where: { SECURITY_CENTER: sc } });
    return count > 0;
  },
  // Daftar Security Center (distinct), dengan optional filter contains
  async listSecurityCenters(p) {
    const q = (p?.q ?? "").trim().toLowerCase();
    const limit = Math.min(p?.limit ?? 10, 100);
    const offset = p?.offset ?? 0;
    const rows = await prisma.tB_M_APPLICATION.findMany({
      distinct: ["SECURITY_CENTER"],
      select: { SECURITY_CENTER: true },
      orderBy: { SECURITY_CENTER: "asc" }
    });
    let all = rows.map((r) => String(r.SECURITY_CENTER ?? "")).filter(Boolean);
    if (q) all = all.filter((s) => s.toLowerCase().includes(q));
    const items = all.slice(offset, offset + limit);
    return { items, total: all.length };
  }
};

// src/modules/master_data/application/application.validator.ts
function validateOwnerAndCustodian(noregOwner, noregCust) {
}

// src/modules/master_data/application/application.service.ts
var applicationService = {
  // Normalisasi status dari berbagai bentuk input FE
  normalizeStatus(input) {
    const raw = input?.APPLICATION_STATUS ?? input?.status ?? input?.appStatus ?? input?.applicationStatus;
    if (raw === void 0) return void 0;
    if (typeof raw === "boolean") return raw ? "Active" : "Inactive";
    const s = String(raw).trim().toLowerCase();
    if (s === "active" || s === "aktif" || s === "a" || s === "0") return "Active";
    if (s === "inactive" || s === "inaktif" || s === "i" || s === "1") return "Inactive";
    return void 0;
  },
  async activeList() {
    return applicationRepository.activeList();
  },
  async list(params) {
    return applicationRepository.list(params);
  },
  async getById(id) {
    const row = await applicationRepository.findById(id);
    if (!row) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        "Application not found",
        { id },
        void 0,
        404
      );
    }
    return row;
  },
  async create(input, auditUser) {
    const existingApp = await applicationRepository.findByCode(input.APPLICATION_ID.toLowerCase());
    if (existingApp) {
      throw new ApplicationError(
        ERROR_CODES.VAL_DUPLICATE_ENTRY,
        "APPLICATION_ID already exists",
        { errors: { APPLICATION_ID: { code: "ALREADY_EXISTS", message: "APPLICATION_ID already exists", value: input.APPLICATION_ID } } },
        // { APPLICATION_ID: input.APPLICATION_ID },
        void 0,
        400
      );
    }
    validateOwnerAndCustodian(input.NOREG_SYSTEM_OWNER, input.NOREG_SYSTEM_CUST);
    const owner = await applicationRepository.getUserByNoreg(input.NOREG_SYSTEM_OWNER);
    if (!owner) {
      throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "System Owner NOREG not found");
    }
    const cust = await applicationRepository.getUserByNoreg(input.NOREG_SYSTEM_CUST);
    if (!cust) {
      throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "System Custodian NOREG not found");
    }
    const nameUsed = await applicationRepository.existsByName(input.APPLICATION_NAME);
    if (nameUsed) {
      throw new ApplicationError(
        ERROR_CODES.VAL_DUPLICATE_ENTRY,
        "APPLICATION_NAME already exists",
        { errors: { APPLICATION_NAME: { code: "APPLICATION_NAME already existst", value: input.APPLICATION_NAME } } },
        // { APPLICATION_NAME: input.APPLICATION_NAME },
        void 0,
        400
      );
    }
    if (!await applicationRepository.isValidSecurityCenter(input.SECURITY_CENTER)) {
      throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "Invalid Security Center");
    }
    const userId = currentUserId();
    const reqId = currentRequestId();
    publishMonitoringLog(globalThis.app, {
      userId,
      module: "APPLI",
      action: "APPLICATION_CREATE",
      status: "Success",
      description: `Create application ${input.APPLICATION_NAME}`,
      location: "/applications"
    }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
    const norm = this.normalizeStatus(input);
    if (norm) input.APPLICATION_STATUS = norm;
    return applicationRepository.create(input, auditUser);
  },
  async update(id, updates, auditUser) {
    const existing = await applicationRepository.findById(id);
    if (!existing) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        "Application not found",
        { id },
        void 0,
        404
      );
    }
    if (updates.NOREG_SYSTEM_OWNER || updates.NOREG_SYSTEM_CUST) {
      const newOwner = updates.NOREG_SYSTEM_OWNER ?? existing.NOREG_SYSTEM_OWNER;
      const newCust = updates.NOREG_SYSTEM_CUST ?? existing.NOREG_SYSTEM_CUST;
      validateOwnerAndCustodian(newOwner, newCust);
    }
    if (updates.NOREG_SYSTEM_OWNER) {
      const owner = await applicationRepository.getUserByNoreg(updates.NOREG_SYSTEM_OWNER);
      if (!owner) {
        throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "System Owner NOREG not found");
      }
      if (updates.APPLICATION_NAME) {
        const nameUsed = await applicationRepository.existsByNameExceptApp(id, updates.APPLICATION_NAME);
        if (nameUsed) {
          throw new ApplicationError(
            ERROR_CODES.VAL_DUPLICATE_ENTRY,
            "APPLICATION_NAME already exists",
            { errors: { APPLICATION_NAME: { code: "APPLICATION_NAME already existst", value: updates.APPLICATION_NAME } } },
            // { APPLICATION_NAME: input.APPLICATION_NAME },
            void 0,
            400
          );
        }
      }
    }
    if (updates.NOREG_SYSTEM_CUST) {
      const cust = await applicationRepository.getUserByNoreg(updates.NOREG_SYSTEM_CUST);
      if (!cust) {
        throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "System Custodian NOREG not found");
      }
    }
    if (updates.SECURITY_CENTER) {
      const valid = await applicationRepository.isValidSecurityCenter(updates.SECURITY_CENTER);
      if (!valid) {
        throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "Invalid Security Center");
      }
    }
    const norm = this.normalizeStatus(updates);
    if (norm) updates.APPLICATION_STATUS = norm;
    const updated = await applicationRepository.update(id, updates, auditUser);
    if (!updated) {
      throw new ApplicationError(ERROR_CODES.APP_UPDATE_FAILED, "Failed to update application");
    }
    const userId = currentUserId();
    const reqId = currentRequestId();
    publishMonitoringLog(globalThis.app, {
      userId,
      module: "APPLI",
      action: "APPLICATION_UPDATE",
      status: "Success",
      description: `Update application ${id}`,
      location: "/applications"
    }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
    return updated;
  },
  // masters (untuk dropdown FE)
  async listUsers(p) {
    return applicationRepository.listUsers(p);
  },
  async listSecurityCenters(p) {
    return applicationRepository.listSecurityCenters(p);
  }
};

// src/modules/master_data/application/application.controller.ts
var applicationController = {
  activeList: (_app) => async (req, reply) => {
    const result = await applicationService.activeList();
    return reply.send({
      data: result.data
    });
  },
  list: (_app) => async (req, reply) => {
    const {
      page = 1,
      limit = 10,
      search,
      sortField = "CREATED_DT",
      sortOrder = "asc"
    } = req.query ?? {};
    const result = await applicationService.list({
      page: Number(page),
      limit: Number(limit),
      search,
      sortField,
      sortOrder
    });
    return reply.send({
      data: result.data,
      page: Number(page),
      limit: Number(limit),
      total: result.total
    });
  },
  getById: (_app) => async (req, reply) => {
    const row = await applicationService.getById(req.params.id);
    return reply.send({ data: row });
  },
  create: (_app) => async (req, reply) => {
    const username = req.auth?.username ?? req.user?.sub ?? "system";
    const created = await applicationService.create(req.body, username);
    return reply.code(201).send({ message: "Application created", data: created });
  },
  update: (_app) => async (req, reply) => {
    const username = req.auth?.username ?? req.user?.sub ?? "system";
    const updated = await applicationService.update(req.params.id, req.body, username);
    return reply.send({ message: "Application updated", data: updated });
  },
  // masters
  listUsers: () => async (req, reply) => {
    const { q = "", limit = 10, offset = 0 } = req.query ?? {};
    const result = await applicationService.listUsers({ q, limit: Number(limit), offset: Number(offset) });
    return reply.send({ data: result.items, total: result.total });
  },
  listSecurityCenters: () => async (req, reply) => {
    const { q = "", limit = 10, offset = 0 } = req.query ?? {};
    const result = await applicationService.listSecurityCenters({
      q,
      limit: Number(limit),
      offset: Number(offset)
    });
    return reply.send({ data: result.items, total: result.total });
  }
};

// src/modules/master_data/application/application.schema.ts
var ApplicationItemSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    APPLICATION_ID: { type: "string" },
    APPLICATION_NAME: { type: "string" },
    DIVISION_ID_OWNER: { type: "string" },
    NOREG_SYSTEM_OWNER: { type: "string" },
    NOREG_SYSTEM_CUST: { type: "string" },
    SECURITY_CENTER: { type: "string" },
    APPLICATION_STATUS: { type: "string" },
    CREATED_BY: { type: "string" },
    CREATED_DT: { type: "string" },
    CHANGED_BY: { type: "string" },
    CHANGED_DT: { type: "string" }
  },
  required: [
    "APPLICATION_ID",
    "APPLICATION_NAME",
    "DIVISION_ID_OWNER",
    "NOREG_SYSTEM_OWNER",
    "NOREG_SYSTEM_CUST",
    "SECURITY_CENTER",
    "APPLICATION_STATUS",
    "CREATED_BY",
    "CREATED_DT",
    "CHANGED_BY",
    "CHANGED_DT"
  ]
};
var listApplicationSchema = {
  querystring: {
    /* ... */
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: ApplicationItemSchema },
        page: { type: "integer" },
        limit: { type: "integer" },
        total: { type: "integer" }
      },
      required: ["data", "page", "limit", "total"]
    }
  }
};
var getByIdSchema = {
  params: {
    /* ... */
  },
  response: {
    200: {
      type: "object",
      properties: { data: ApplicationItemSchema },
      required: ["data"]
    }
  }
};
var createApplicationSchema = {
  body: {
    /* ... */
  },
  response: {
    201: {
      type: "object",
      properties: {
        message: { type: "string" },
        data: ApplicationItemSchema
      },
      required: ["message", "data"]
    }
  }
};
var updateApplicationSchema = {
  params: {
    /* ... */
  },
  body: {
    /* ... */
  },
  response: {
    200: {
      type: "object",
      properties: {
        message: { type: "string" },
        data: ApplicationItemSchema
      },
      required: ["message", "data"]
    }
  }
};

// src/api/master_data/application/application.ts
async function applicationRoutes(app) {
  app.get(
    "",
    { schema: listApplicationSchema },
    applicationController.list(app)
  );
  app.get(
    "/masters/dropdown",
    applicationController.activeList(app)
  );
  app.get(
    "/:id",
    { schema: getByIdSchema },
    applicationController.getById(app)
  );
  app.post(
    "",
    { schema: createApplicationSchema },
    applicationController.create(app)
  );
  app.put(
    "/:id",
    { schema: updateApplicationSchema },
    applicationController.update(app)
  );
  app.get("/masters/system-users", applicationController.listUsers());
  app.get("/masters/security-centers", applicationController.listSecurityCenters());
}

// src/modules/master_data/master_config/master_config.service.ts
import { Prisma as Prisma3 } from "./generated/prisma/index.js";
function convertStringToTime(timeString) {
  return /* @__PURE__ */ new Date(`1970-01-01T${timeString}Z`);
}
function convertTimeToString(timeDate) {
  return timeDate.toISOString().substring(11, 19);
}
var systemService = {
  async getSystem(app, query) {
    const {
      page = 1,
      limit = 10,
      q,
      systemType,
      systemCode,
      sortBy = "CREATED_DT",
      order = "desc"
    } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (systemType) {
      where.SYSTEM_TYPE = systemType;
    }
    if (systemCode) {
      where.SYSTEM_CD = systemCode;
    }
    if (q) {
      where.OR = [
        { SYSTEM_CD: { contains: q } },
        { SYSTEM_TYPE: { contains: q } }
      ];
    }
    const orderBy = {
      [sortBy]: order
    };
    console.log("orderbay", orderBy);
    try {
      const [rawData, total] = await app.prisma.$transaction([
        app.prisma.tB_M_SYSTEM.findMany({
          where,
          orderBy,
          skip,
          take: limitNum
        }),
        app.prisma.tB_M_SYSTEM.count({ where })
      ]);
      const data = rawData.map((record) => {
        const { VALUE_TIME, ...rest } = record;
        return {
          ...rest,
          VALUE_TIME: VALUE_TIME ? convertTimeToString(VALUE_TIME) : null
        };
      });
      const totalPages = Math.max(1, Math.ceil(total / limitNum));
      return {
        data,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      };
    } catch (e) {
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  async createSystem(app, data) {
    const dataForDb = { ...data };
    if (typeof dataForDb.VALUE_TIME === "string") {
      dataForDb.VALUE_TIME = convertStringToTime(dataForDb.VALUE_TIME);
    }
    try {
      const newData = await app.prisma.tB_M_SYSTEM.create({
        data: {
          ...dataForDb,
          CREATED_DT: /* @__PURE__ */ new Date()
        }
      });
      const { VALUE_TIME, ...rest } = newData;
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app, {
        userId,
        module: "SO",
        action: "SYSTEM_MASTER_CREATE",
        status: "Success",
        description: `Create system master ${newData.SYSTEM_TYPE}`,
        location: "/applications"
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return {
        ...rest,
        VALUE_TIME: VALUE_TIME ? convertTimeToString(VALUE_TIME) : null
      };
    } catch (e) {
      if (e instanceof Prisma3.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            ERROR_MESSAGES[ERROR_CODES.APP_ALREADY_EXISTS]
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  async updateSystem(app, data) {
    const { SYSTEM_CD, SYSTEM_TYPE, VALID_FROM_DT, ...updateData } = data;
    const { NEW_VALID_FROM_DT, ...otherData } = updateData;
    app.log.info(`Finding System: ${JSON.stringify(data)}`);
    const dataForUpdate = {
      ...otherData,
      CHANGED_DT: /* @__PURE__ */ new Date()
    };
    if (typeof dataForUpdate.VALUE_TIME === "string") {
      dataForUpdate.VALUE_TIME = convertStringToTime(dataForUpdate.VALUE_TIME);
    } else if (dataForUpdate.VALUE_TIME === null) {
      dataForUpdate.VALUE_TIME = null;
    }
    if (NEW_VALID_FROM_DT) {
      dataForUpdate.VALID_FROM_DT = NEW_VALID_FROM_DT;
    }
    try {
      const updatedSystem = await app.prisma.tB_M_SYSTEM.update({
        where: {
          SYSTEM_TYPE_SYSTEM_CD_VALID_FROM_DT: {
            SYSTEM_TYPE,
            SYSTEM_CD,
            VALID_FROM_DT
          }
        },
        data: dataForUpdate
      });
      const { VALUE_TIME, ...rest } = updatedSystem;
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app, {
        userId,
        module: "SO",
        action: "SYSTEM_MASTER_UPDATE",
        status: "Success",
        description: `Update system master ${updatedSystem.SYSTEM_TYPE}`,
        location: "/applications"
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return {
        ...rest,
        VALUE_TIME: VALUE_TIME ? convertTimeToString(VALUE_TIME) : null
      };
    } catch (e) {
      if (e instanceof Prisma3.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          app.log.error(
            `Record not found with key: ${SYSTEM_TYPE}, ${SYSTEM_CD}, ${VALID_FROM_DT}`
          );
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND]
          );
        }
        if (e.code === "P2002") {
          app.log.error(
            `Unique constraint violation. The new key may already exist.`
          );
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            ERROR_MESSAGES[ERROR_CODES.APP_ALREADY_EXISTS]
          );
        }
      }
      app.log.error(`Possible Error: ${e}`);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  async deleteSystem(app, compoundId) {
    try {
      const deletedSystem = await app.prisma.tB_M_SYSTEM.delete({
        where: {
          SYSTEM_TYPE_SYSTEM_CD_VALID_FROM_DT: {
            SYSTEM_TYPE: compoundId.SYSTEM_TYPE,
            SYSTEM_CD: compoundId.SYSTEM_CD,
            VALID_FROM_DT: compoundId.VALID_FROM_DT
          }
        }
      });
      const { VALUE_TIME, ...rest } = deletedSystem;
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app, {
        userId,
        module: "SO",
        action: "SYSTEM_MASTER_DELETE",
        status: "Success",
        description: `Delete system master ${deletedSystem.SYSTEM_TYPE}`,
        location: "/applications"
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return {
        ...rest,
        VALUE_TIME: VALUE_TIME ? convertTimeToString(VALUE_TIME) : null
      };
    } catch (e) {
      if (e instanceof Prisma3.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND]
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  }
};

// src/modules/master_data/master_config/master_config.controller.ts
var systemController = {
  getSystem: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const schedules = await systemService.getSystem(app, req.query);
    return reply.code(200).send({
      requestId,
      ...schedules
    });
  },
  createSystem: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const body = req.body;
    const username = req.auth?.username ?? req.user?.sub ?? "system";
    body.CREATED_BY = username;
    const schedule2 = await systemService.createSystem(app, body);
    return reply.code(201).send({ requestId, data: schedule2 });
  },
  updateSystem: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const body = req.body;
    app.log.info(`Body : ${JSON.stringify(body)}`);
    const username = req.auth?.username ?? req.user?.sub ?? "system";
    body.CREATED_BY = username;
    const schedule2 = await systemService.updateSystem(app, body);
    return reply.code(200).send({ requestId, data: schedule2 });
  },
  deleteSystem: (app) => async (req, reply) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const compoundId = req.params;
    const schedule2 = await systemService.deleteSystem(app, compoundId);
    return reply.code(200).send({ requestId, data: schedule2 });
  }
};

// src/modules/master_data/master_config/master_config.schema.ts
var systemSchema = {
  body: {
    type: "object",
    required: ["VALID_FROM_DT", "VALID_TO_DT"],
    properties: {
      SYSTEM_TYPE: { type: "string", maxLength: 30 },
      SYSTEM_CD: { type: "string", maxLength: 30 },
      VALID_FROM_DT: { type: "string", format: "date-time" },
      VALID_TO_DT: { type: "string", format: "date-time" },
      VALUE_TEXT: { type: "string", maxLength: 30 },
      VALUE_NUM: { type: "number" },
      VALUE_TIME: { type: "string" },
      CREATED_BY: { type: "string", maxLength: 20 },
      CREATED_DT: { type: "string", format: "date-time" },
      CHANGED_BY: { type: "string", maxLength: 20 },
      CHANGED_DT: { type: "string", format: "date-time" }
    },
    additionalProperties: false
  }
};

// src/api/master_data/master_config/master_config.routes.ts
async function systemRoutes(app) {
  app.get("/", async (req, reply) => {
    return systemController.getSystem(app)(req, reply);
  });
  app.post(
    "/",
    { schema: systemSchema, errorHandler },
    async (req, reply) => {
      return systemController.createSystem(app)(req, reply);
    }
  );
  app.put(
    "/:id",
    { errorHandler },
    async (req, reply) => {
      return systemController.updateSystem(app)(req, reply);
    }
  );
  app.delete(
    "/:SYSTEM_TYPE/:SYSTEM_CD/:VALID_FROM_DT",
    { errorHandler },
    async (req, reply) => {
      return systemController.deleteSystem(app)(req, reply);
    }
  );
}

// src/modules/uar_generate/uar_generate.repository.ts
async function mergeDivisionUserTx(tx, p) {
  const rows = await tx.$queryRaw`
SET XACT_ABORT ON;

DECLARE @PERIOD_RAW NVARCHAR(30) = ${p.period};
DECLARE @APP_ID     NVARCHAR(50) = ${p.application_id};
DECLARE @APP_ID     NVARCHAR(50) = ${p.application_id};
DECLARE @CREATED_BY VARCHAR(50)  = ${p.createdBy};

-- =========================
-- Normalisasi periode UAR => YYYYMM
-- =========================
-- =========================
-- Normalisasi periode UAR => YYYYMM
-- =========================
DECLARE @UAR_PERIOD CHAR(6);
IF @PERIOD_RAW LIKE '[0-9][0-9][0-9][0-9][0-9][0-9]'
  SET @UAR_PERIOD = @PERIOD_RAW;
ELSE
BEGIN
  DECLARE @RUN_DATE DATE = TRY_CONVERT(DATE, @PERIOD_RAW, 126);
  IF @RUN_DATE IS NULL SET @RUN_DATE = TRY_CONVERT(DATE, @PERIOD_RAW);
  IF @RUN_DATE IS NULL THROW 50000, 'Invalid period. Use YYYYMM or ISO date (YYYY-MM-DD).', 1;
  SET @UAR_PERIOD = LEFT(CONVERT(CHAR(8), @RUN_DATE, 112), 6);
END

DECLARE @UAR_ID NVARCHAR(50) = CONCAT('UAR_', @UAR_PERIOD, '_', @APP_ID);

-- =========================
-- Sumber data (hanya karyawan yang termapping ke APP_ID)
-- =========================
IF OBJECT_ID('tempdb..#base') IS NOT NULL DROP TABLE #base;

SELECT
  e.DIVISION_ID,
  e.DEPARTMENT_ID,
  e.NOREG,
  e.PERSONNEL_NAME,
  e.POSITION_NAME,
  e.SECTION_ID,
  e.POSITION_TITLE,
  e.JOB_CODE,
  e.JOB_TITLE,
  e.MAIL,
  e.POSITION_LEVEL
INTO #base
FROM TB_M_EMPLOYEE e
JOIN TB_M_AUTH_MAPPING am
  ON am.NOREG = e.NOREG
 WHERE am.APPLICATION_ID = @APP_ID
 AND am.NOREG NOT LIKE 'EMP%'

-- =========================
-- Ranking per group (DIVISION_ID + DEPARTMENT_ID)
-- Head = POSITION_NAME LIKE '%DivHead%'
-- Staff = selain head
-- =========================
IF OBJECT_ID('tempdb..#ranked') IS NOT NULL DROP TABLE #ranked;

SELECT
  b.*,
  CASE WHEN b.POSITION_NAME LIKE '%Div Head%' THEN 0 ELSE 1 END AS is_head_first,
  ROW_NUMBER() OVER (
    PARTITION BY b.DIVISION_ID, b.DEPARTMENT_ID
    ORDER BY
      CASE WHEN b.POSITION_NAME LIKE '%Div Head%' THEN 0 ELSE 1 END,
      ISNULL(b.POSITION_LEVEL,0) DESC,
      b.NOREG
  ) AS rn_by_pref,
  SUM(CASE WHEN b.POSITION_NAME LIKE '%Div Head%' THEN 1 ELSE 0 END)
    OVER (PARTITION BY b.DIVISION_ID, b.DEPARTMENT_ID) AS cnt_head_in_grp
INTO #ranked
FROM #base b;

-- Head terpilih: WAJIB "DivHead" (tanpa fallback)
IF OBJECT_ID('tempdb..#pick_head') IS NOT NULL DROP TABLE #pick_head;

SELECT
  r.DIVISION_ID,
  r.DEPARTMENT_ID,
  r.NOREG         AS HEAD_NOREG,
  r.PERSONNEL_NAME AS HEAD_NAME
INTO #pick_head
FROM #ranked r
WHERE r.cnt_head_in_grp > 0
  AND r.is_head_first = 0
  AND r.rn_by_pref = 1;

-- Staff = semua yang bukan head
IF OBJECT_ID('tempdb..#staff') IS NOT NULL DROP TABLE #staff;

SELECT r.*
INTO #staff
FROM #ranked r
LEFT JOIN #pick_head h
  ON  h.DIVISION_ID   = r.DIVISION_ID
  AND h.DEPARTMENT_ID = r.DEPARTMENT_ID
  AND h.HEAD_NOREG    = r.NOREG
WHERE h.HEAD_NOREG IS NULL;  -- exclude head

-- =========================
-- MERGE Header: TB_R_WORKFLOW (SEQ=1, Division)
-- Approver = DivHead
-- =========================
;WITH head_src AS (
  SELECT DISTINCT
    @UAR_ID AS UAR_ID,
    1       AS SEQ_NO,
    h.DIVISION_ID,
    h.DEPARTMENT_ID,
    h.HEAD_NOREG   AS APPROVER_NOREG,
    h.HEAD_NAME    AS APPROVER_NAME
  FROM #pick_head h
),
head_with_plan AS (
  SELECT
    x.*,
    cfg.VALUE_NUM AS OFFSET_DAYS,
    DATEADD(DAY, ISNULL(cfg.VALUE_NUM,0), CAST(SYSDATETIME() AS DATE)) AS PLAN_APPROVED_DT
  FROM head_src x
  OUTER APPLY (
    SELECT TOP 1 s.VALUE_NUM
    FROM TB_M_SYSTEM s
    WHERE s.SYSTEM_TYPE = 'UAR_PLAN'
      AND SYSDATETIME() BETWEEN s.VALID_FROM_DT AND ISNULL(s.VALID_TO_DT, '9999-12-31')
      AND (
           s.SYSTEM_CD = 'DH' OR
           s.SYSTEM_CD = 'DEFAULT'
      )
    ORDER BY
      CASE
        WHEN s.SYSTEM_CD = 'DH'                      THEN 1
        WHEN s.SYSTEM_CD = 'DEFAULT'                 THEN 2
        ELSE 99
      END
  ) cfg
)
MERGE TB_R_WORKFLOW WITH (HOLDLOCK) AS wf
USING head_with_plan AS x
  ON ( wf.UAR_ID = x.UAR_ID
       AND wf.SEQ_NO = x.SEQ_NO
       AND wf.DIVISION_ID = x.DIVISION_ID
       AND ISNULL(wf.DEPARTMENT_ID,'') = ISNULL(x.DEPARTMENT_ID,'') )
WHEN NOT MATCHED THEN
  INSERT (UAR_ID, SEQ_NO, DIVISION_ID, DEPARTMENT_ID,
          APPROVAL_CD, APPROVAL_DESC,
          APPROVER_NOREG, APPROVER_NAME,
          PLAN_APPROVED_DT,
          CREATED_BY, CREATED_DT)
  VALUES (x.UAR_ID, x.SEQ_NO, x.DIVISION_ID, x.DEPARTMENT_ID,
          1, 'Division Approval',
          x.APPROVER_NOREG, x.APPROVER_NAME,
          x.PLAN_APPROVED_DT,
          ${p.createdBy}, SYSDATETIME())
WHEN MATCHED THEN
  UPDATE SET
    wf.APPROVER_NOREG = x.APPROVER_NOREG,
    wf.APPROVER_NAME  = x.APPROVER_NAME,
    wf.PLAN_APPROVED_DT = x.PLAN_APPROVED_DT,
    wf.CHANGED_BY     = ${p.createdBy},
    wf.CHANGED_DT     = SYSDATETIME();

-- =========================
-- MERGE Detail: TB_R_UAR_DIVISION_USER (staff)
-- Join kembali ke AUTH_MAPPING supaya dapat USERNAME/ROLE_ID/APPLICATION_ID
-- Reviewer kolom (jika perlu) kita isi head per group (DIVISION/DEPARTMENT)
-- =========================
DECLARE @chg TABLE (action NVARCHAR(10));

;WITH staff_enriched AS (
  SELECT
    @UAR_PERIOD AS UAR_PERIOD,
    @UAR_ID     AS UAR_ID,
    am.USERNAME,
    am.ROLE_ID,
    am.APPLICATION_ID,
    s.DIVISION_ID,
    s.DEPARTMENT_ID,
    s.NOREG,
    s.PERSONNEL_NAME AS NAME,
    s.POSITION_NAME,
    s.SECTION_ID,
    s.POSITION_TITLE,
    s.JOB_CODE,
    s.JOB_TITLE,
    s.MAIL,
    h.HEAD_NOREG     AS REVIEWER_NOREG,
    h.HEAD_NAME      AS REVIEWER_NAME
  FROM #staff s
  JOIN TB_M_AUTH_MAPPING am
    ON am.NOREG = s.NOREG
   AND am.APPLICATION_ID = @APP_ID
  LEFT JOIN #pick_head h
    ON  h.DIVISION_ID   = s.DIVISION_ID
    AND h.DEPARTMENT_ID = s.DEPARTMENT_ID
)
MERGE TB_R_UAR_DIVISION_USER AS tgt
USING staff_enriched AS src
  ON ( tgt.UAR_ID        = src.UAR_ID
       AND tgt.APPLICATION_ID = src.APPLICATION_ID
       AND tgt.USERNAME  = src.USERNAME
       AND tgt.ROLE_ID   = src.ROLE_ID )
WHEN NOT MATCHED THEN
  INSERT (
    UAR_PERIOD, UAR_ID, USERNAME, ROLE_ID, APPLICATION_ID,
    DIVISION_ID, DEPARTMENT_ID, NOREG, NAME, POSITION_NAME, SECTION_ID,
    REVIEWER_NOREG, REVIEWER_NAME,
    CREATED_BY, CREATED_DT
  )
  VALUES (
    src.UAR_PERIOD, src.UAR_ID, src.USERNAME, src.ROLE_ID, src.APPLICATION_ID,
    src.DIVISION_ID, src.DEPARTMENT_ID, src.NOREG, src.NAME, src.POSITION_NAME, src.SECTION_ID,
    src.REVIEWER_NOREG, src.REVIEWER_NAME,
    ${p.createdBy}, SYSDATETIME()
  )
WHEN MATCHED THEN
  UPDATE SET
    tgt.DIVISION_ID     = src.DIVISION_ID,
    tgt.DEPARTMENT_ID   = src.DEPARTMENT_ID,
    tgt.NOREG           = src.NOREG,
    tgt.NAME            = src.NAME,
    tgt.POSITION_NAME   = src.POSITION_NAME,
    tgt.SECTION_ID      = src.SECTION_ID,
    tgt.REVIEWER_NOREG  = COALESCE(src.REVIEWER_NOREG, tgt.REVIEWER_NOREG),
    tgt.REVIEWER_NAME   = COALESCE(src.REVIEWER_NAME , tgt.REVIEWER_NAME ),
    tgt.CHANGED_BY      = ${p.createdBy},
    tgt.CHANGED_DT      = SYSDATETIME()
OUTPUT $action INTO @chg;

-- Cleanup
DROP TABLE IF EXISTS #staff;
DROP TABLE IF EXISTS #pick_head;
DROP TABLE IF EXISTS #ranked;
DROP TABLE IF EXISTS #base;

-- Result
SELECT
  SUM(CASE WHEN action='INSERT' THEN 1 ELSE 0 END) AS inserted,
  SUM(CASE WHEN action='UPDATE' THEN 1 ELSE 0 END) AS updated
FROM @chg;`;
  return rows?.[0] ?? { inserted: 0, updated: 0 };
}
async function mergeSystemOwnerTx(tx, p) {
  const rows = await tx.$queryRaw`
SET XACT_ABORT ON;

DECLARE @PERIOD_RAW NVARCHAR(30) = ${p.period};
DECLARE @APP_ID     NVARCHAR(50) = ${p.application_id};
DECLARE @CREATED_BY VARCHAR(50)  = ${p.createdBy};

-- =========================
-- Normalisasi periode UAR => YYYYMM
-- =========================
DECLARE @UAR_PERIOD CHAR(6);
IF @PERIOD_RAW LIKE '[0-9][0-9][0-9][0-9][0-9][0-9]'
  SET @UAR_PERIOD = @PERIOD_RAW;
ELSE
BEGIN
  DECLARE @RUN_DATE DATE = TRY_CONVERT(DATE, @PERIOD_RAW, 126);
  IF @RUN_DATE IS NULL SET @RUN_DATE = TRY_CONVERT(DATE, @PERIOD_RAW);
  IF @RUN_DATE IS NULL THROW 50000, 'Invalid period. Use YYYYMM or ISO date (YYYY-MM-DD).', 1;
  SET @UAR_PERIOD = LEFT(CONVERT(CHAR(8), @RUN_DATE, 112), 6);
END;

DECLARE @UAR_ID NVARCHAR(50) = CONCAT('UAR_', @UAR_PERIOD, '_', @APP_ID);

-- ==========================================================
-- 1) Sumber user SO dari AUTH_MAPPING yang terhubung ke EMP
--    (hanya employee dengan NOREG 'EMP%')
-- ==========================================================
IF OBJECT_ID('tempdb..#so_users') IS NOT NULL DROP TABLE #so_users;

SELECT
  @UAR_PERIOD AS UAR_PERIOD,
  @UAR_ID     AS UAR_ID,
  am.USERNAME,
  am.ROLE_ID,
  am.APPLICATION_ID,
  COALESCE(app.DIVISION_ID_OWNER, emp.DIVISION_ID) AS DIVISION_ID,
  emp.DEPARTMENT_ID AS DEPARTMENT_ID, 
  emp.NOREG,
  emp.PERSONNEL_NAME AS NAME,
  emp.POSITION_NAME,
  emp.SECTION_ID
INTO #so_users
FROM TB_M_AUTH_MAPPING am
JOIN TB_M_APPLICATION  app ON app.APPLICATION_ID = am.APPLICATION_ID
JOIN TB_M_EMPLOYEE     emp ON emp.NOREG = am.NOREG
WHERE am.APPLICATION_ID = @APP_ID
  AND emp.NOREG LIKE 'EMP%';

IF NOT EXISTS (SELECT 1 FROM #so_users)
BEGIN
  SELECT CAST(0 AS INT) AS inserted, CAST(0 AS INT) AS updated;
  RETURN;
END;

-- ==========================================================
-- 2) Tentukan So Head untuk UAR ini (prioritas POSITION_NAME mengandung 'So Head')
--    Ambil satu head (global untuk UAR ini) berdasarkan ranking.
--    Jika ingin per-division, hilangkan TOP(1) dan handle grouping di WF.
-- ==========================================================
IF OBJECT_ID('tempdb..#owner_groups') IS NOT NULL DROP TABLE #owner_groups;
SELECT DISTINCT DIVISION_ID, DEPARTMENT_ID INTO #owner_groups FROM #so_users;

IF OBJECT_ID('tempdb..#so_head_candidates') IS NOT NULL DROP TABLE #so_head_candidates;
SELECT
  e.DIVISION_ID,
  g.DEPARTMENT_ID,
  e.NOREG,
  e.PERSONNEL_NAME,
  e.POSITION_NAME,
  e.SECTION_ID,
  e.POSITION_LEVEL,
  CASE WHEN CHARINDEX('so head', LOWER(LTRIM(RTRIM(e.POSITION_NAME)))) > 0 THEN 0 ELSE 1 END AS is_head_first
INTO #so_head_candidates
FROM TB_M_EMPLOYEE e
JOIN #owner_groups g
  ON g.DIVISION_ID = e.DIVISION_ID
  AND ISNULL(g.DEPARTMENT_ID,'') = ISNULL(e.DEPARTMENT_ID,'')
WHERE e.NOREG LIKE 'EMP%';

IF OBJECT_ID('tempdb..#pick_so_head') IS NOT NULL DROP TABLE #pick_so_head;
;WITH ranked AS (
  SELECT
    c.*,
    ROW_NUMBER() OVER (
      PARTITION BY c.DIVISION_ID, c.DEPARTMENT_ID
      ORDER BY c.is_head_first, ISNULL(c.POSITION_LEVEL,0) DESC, c.NOREG
    ) AS rn
  FROM #so_head_candidates c
)
SELECT
  @UAR_ID AS UAR_ID,
  2 AS SEQ_NO,
  DIVISION_ID,
  DEPARTMENT_ID,
  NOREG          AS APPROVER_NOREG,
  PERSONNEL_NAME AS APPROVER_NAME
INTO #pick_so_head
FROM ranked
WHERE rn = 1;

-- Safety fallback: kalau candidate kosong (mustahil bila #so_users ada, tapi tetap jaga-jaga)
IF NOT EXISTS (SELECT 1 FROM #pick_so_head)
BEGIN
  INSERT INTO #pick_so_head (UAR_ID, SEQ_NO, DIVISION_ID, DEPARTMENT_ID, APPROVER_NOREG, APPROVER_NAME)
  SELECT TOP (1)
    @UAR_ID, 2, ou.DIVISION_ID, ou.DEPARTMENT_ID, ou.NOREG, ou.NAME
  FROM #so_users ou
  ORDER BY ou.NOREG; -- fallback sederhana
END;

-- ==========================================================
-- 3) MERGE Header WF SEQ=2 (System Owner)
--    ON hanya UAR_ID + SEQ_NO agar tidak terganjal DEPT_ID
-- ==========================================================
WITH so_head_with_plan AS (
  SELECT
    x.UAR_ID, x.SEQ_NO, x.DIVISION_ID, x.DEPARTMENT_ID,
    x.APPROVER_NOREG, x.APPROVER_NAME,
    cfg.VALUE_NUM AS OFFSET_DAYS,
    DATEADD(DAY, ISNULL(cfg.VALUE_NUM,0), CAST(SYSDATETIME() AS DATE)) AS PLAN_APPROVED_DT
  FROM (SELECT * FROM #pick_so_head) x
  OUTER APPLY (
    SELECT TOP 1 s.VALUE_NUM
    FROM TB_M_SYSTEM s
    WHERE s.SYSTEM_TYPE = 'UAR_PLAN'
      AND SYSDATETIME() BETWEEN s.VALID_FROM_DT AND ISNULL(s.VALID_TO_DT,'9999-12-31')
      AND (
           s.SYSTEM_CD = 'SO' OR
           s.SYSTEM_CD = 'DEFAULT'
      )
    ORDER BY
      CASE
        WHEN s.SYSTEM_CD = 'SO'                      THEN 1
        WHEN s.SYSTEM_CD = 'DEFAULT'                 THEN 2
        ELSE 99
      END
  ) cfg
)
MERGE TB_R_WORKFLOW WITH (HOLDLOCK) AS wf
USING so_head_with_plan x
  ON (wf.UAR_ID = x.UAR_ID AND wf.SEQ_NO = x.SEQ_NO AND ISNULL(wf.DIVISION_ID,'')   = ISNULL(x.DIVISION_ID,'') AND ISNULL(wf.DEPARTMENT_ID,'') = ISNULL(x.DEPARTMENT_ID,''))
WHEN NOT MATCHED THEN
  INSERT (UAR_ID, SEQ_NO, DIVISION_ID, DEPARTMENT_ID,
          APPROVAL_CD, APPROVAL_DESC,
          APPROVER_NOREG, APPROVER_NAME,
          PLAN_APPROVED_DT,
          CREATED_BY, CREATED_DT)
  VALUES (x.UAR_ID, x.SEQ_NO, x.DIVISION_ID, x.DEPARTMENT_ID,
          2, 'System Owner Approval',
          x.APPROVER_NOREG, x.APPROVER_NAME,
          x.PLAN_APPROVED_DT,
          ${p.createdBy}, SYSDATETIME())
WHEN MATCHED THEN
  UPDATE SET
    wf.DIVISION_ID    = x.DIVISION_ID,
    wf.DEPARTMENT_ID  = x.DEPARTMENT_ID,
    wf.APPROVER_NOREG = x.APPROVER_NOREG,
    wf.APPROVER_NAME  = x.APPROVER_NAME,
    wf.PLAN_APPROVED_DT  = x.PLAN_APPROVED_DT,
    wf.CHANGED_BY     = ${p.createdBy},
    wf.CHANGED_DT     = SYSDATETIME();

-- ==========================================================
-- 4) MERGE Detail TB_R_UAR_SYSTEM_OWNER
--    EXCLUDE head dari detail supaya tidak dobel
-- ==========================================================
DECLARE @chg TABLE (action NVARCHAR(10));

;WITH so_enriched AS (
  SELECT
    u.UAR_PERIOD,
    u.UAR_ID,
    u.USERNAME,
    u.ROLE_ID,
    u.APPLICATION_ID,
    u.DIVISION_ID,
    u.DEPARTMENT_ID,
    u.NOREG,
    u.NAME,
    u.POSITION_NAME,
    u.SECTION_ID,
    h.APPROVER_NOREG AS REVIEWER_NOREG,
    h.APPROVER_NAME  AS REVIEWER_NAME
  FROM #so_users u
  JOIN #pick_so_head h
    ON  h.DIVISION_ID              = u.DIVISION_ID
    AND ISNULL(h.DEPARTMENT_ID,'') = ISNULL(u.DEPARTMENT_ID,'')   -- [CHANGED]
  WHERE ISNULL(u.NOREG,'') <> ISNULL(h.APPROVER_NOREG,'')         -- exclude head dari detail
)
MERGE TB_R_UAR_SYSTEM_OWNER AS tgt
USING so_enriched AS src
  ON ( tgt.UAR_ID        = src.UAR_ID
       AND tgt.APPLICATION_ID = src.APPLICATION_ID
       AND tgt.USERNAME  = src.USERNAME
       AND tgt.ROLE_ID   = src.ROLE_ID )
WHEN NOT MATCHED THEN
  INSERT (
    UAR_PERIOD, UAR_ID, USERNAME, ROLE_ID, APPLICATION_ID,
    DIVISION_ID, DEPARTMENT_ID, NOREG, NAME, POSITION_NAME, SECTION_ID,
    REVIEW_STATUS, SO_APPROVAL_STATUS,
    REVIEWER_NOREG, REVIEWER_NAME,
    CREATED_BY, CREATED_DT
  )
  VALUES (
    src.UAR_PERIOD, src.UAR_ID, src.USERNAME, src.ROLE_ID, src.APPLICATION_ID,
    src.DIVISION_ID, src.DEPARTMENT_ID, src.NOREG, src.NAME, src.POSITION_NAME, src.SECTION_ID,
    NULL, NULL,
    src.REVIEWER_NOREG, src.REVIEWER_NAME,
    ${p.createdBy}, SYSDATETIME()
  )
WHEN MATCHED AND (
     ISNULL(tgt.DIVISION_ID   ,-1) <> ISNULL(src.DIVISION_ID   ,-1)
  OR ISNULL(tgt.DEPARTMENT_ID ,-1) <> ISNULL(src.DEPARTMENT_ID ,-1)
  OR ISNULL(tgt.NOREG         ,'') <> ISNULL(src.NOREG         ,'')
  OR ISNULL(tgt.NAME          ,'') <> ISNULL(src.NAME          ,'')
  OR ISNULL(tgt.POSITION_NAME ,'') <> ISNULL(src.POSITION_NAME ,'')
  OR ISNULL(tgt.SECTION_ID    ,-1) <> ISNULL(src.SECTION_ID    ,-1)
  OR ISNULL(tgt.REVIEWER_NOREG,'') <> ISNULL(src.REVIEWER_NOREG,'')
  OR ISNULL(tgt.REVIEWER_NAME ,'') <> ISNULL(src.REVIEWER_NAME ,'')
)
  THEN UPDATE SET
    tgt.DIVISION_ID     = src.DIVISION_ID,
    tgt.DEPARTMENT_ID   = src.DEPARTMENT_ID,
    tgt.NOREG           = src.NOREG,
    tgt.NAME            = src.NAME,
    tgt.POSITION_NAME   = src.POSITION_NAME,
    tgt.SECTION_ID      = src.SECTION_ID,
    tgt.REVIEWER_NOREG  = COALESCE(src.REVIEWER_NOREG, tgt.REVIEWER_NOREG),
    tgt.REVIEWER_NAME   = COALESCE(src.REVIEWER_NAME , tgt.REVIEWER_NAME ),
    tgt.CHANGED_BY      = ${p.createdBy},
    tgt.CHANGED_DT      = SYSDATETIME()
OUTPUT $action INTO @chg;

-- Cleanup
DROP TABLE IF EXISTS #so_users;
DROP TABLE IF EXISTS #owner_groups;
DROP TABLE IF EXISTS #so_head_candidates;
DROP TABLE IF EXISTS #pick_so_head;

-- Hasil
SELECT
  SUM(CASE WHEN action='INSERT' THEN 1 ELSE 0 END) AS inserted,
  SUM(CASE WHEN action='UPDATE' THEN 1 ELSE 0 END) AS updated
FROM @chg;`;
  return rows?.[0] ?? { inserted: 0, updated: 0 };
}
var uarGenerateRepository = {
  async generateAll(p) {
    return prisma.$transaction(async (tx) => {
      const divisionUser = await mergeDivisionUserTx(tx, p);
      const systemOwner = await mergeSystemOwnerTx(tx, p);
      return { divisionUser, systemOwner };
    });
  }
};

// src/modules/uar_generate/uar_generate.service.ts
var uarGenerateService = {
  async generate(input) {
    if (!input?.period || !input.application_id) throw new Error("period and application_id are require");
    const createdBy = input.createdBy || "system";
    const res = await uarGenerateRepository.generateAll({
      period: input.period,
      application_id: input.application_id,
      //   uarId: input.uarId,
      createdBy
    });
    return {
      success: true,
      message: "Generate UAR selesai",
      data: {
        period: input.period,
        // uarId: input.uarId,
        divisionUser: res.divisionUser,
        // { inserted, updated }
        systemOwner: res.systemOwner
        // { inserted, updated }
      }
    };
  }
};

// src/modules/uar_generate/uar_generate.controller.ts
var uarGenerateController = {
  generate: (app) => async (req, reply) => {
    try {
      console.log("req.body", req.body);
      const { period, application_id } = req.body || {};
      const out = await uarGenerateService.generate({ period, application_id });
      return reply.code(200).send(out);
    } catch (err) {
      app.log.error({ err }, "Generate UAR gagal");
      return reply.code(500).send({
        success: false,
        message: err?.message ?? "Generate UAR gagal"
      });
    }
  }
};

// src/api/master_data/uar_generate/uar_generate.routes.ts
async function uarGenerateRoutes(app) {
  app.post(
    "",
    uarGenerateController.generate(app)
  );
}

// src/modules/uar_division/uar_division.repository.ts
async function getDbNow2() {
  const rows = await prisma.$queryRaw`SELECT GETDATE() AS now`;
  return rows[0]?.now ?? /* @__PURE__ */ new Date();
}
var uarDivisionRepository = {
  async listUars(params) {
    const { page, limit, userDivisionId, period, uarId } = params;
    const whereUar = {
      DIVISION_ID: userDivisionId
    };
    if (period) {
      whereUar.UAR_PERIOD = period;
    }
    if (uarId) {
      whereUar.UAR_ID = { contains: uarId };
    }
    const [dataRaw, totalGroups] = await Promise.all([
      prisma.tB_R_UAR_DIVISION_USER.findMany({
        where: whereUar,
        // MODIFIED: Select UAR_ID, UAR_PERIOD, and the related Division Name
        select: {
          UAR_ID: true,
          UAR_PERIOD: true,
          TB_M_DIVISION: {
            select: {
              DIVISION_NAME: true
            }
          }
        },
        distinct: ["UAR_ID", "UAR_PERIOD"],
        orderBy: { UAR_ID: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.tB_R_UAR_DIVISION_USER.groupBy({
        by: ["UAR_ID", "UAR_PERIOD"],
        where: whereUar
      })
    ]);
    const totalRows = totalGroups.length;
    const uarIds = dataRaw.map((d) => d.UAR_ID);
    if (uarIds.length === 0) {
      return { data: [], total: 0, workflowStatus: [], completionStats: [] };
    }
    const [workflowStatus, completionStats] = await Promise.all([
      prisma.tB_R_WORKFLOW.findMany({
        where: {
          UAR_ID: { in: uarIds },
          DIVISION_ID: userDivisionId
        },
        distinct: ["UAR_ID"],
        orderBy: [
          { UAR_ID: "desc" },
          { SEQ_NO: "desc" }
        ],
        select: {
          UAR_ID: true,
          CREATED_DT: true,
          APPROVED_DT: true,
          IS_APPROVED: true,
          IS_REJECTED: true
        }
      }),
      prisma.tB_R_UAR_DIVISION_USER.groupBy({
        by: ["UAR_ID", "DIV_APPROVAL_STATUS"],
        where: {
          UAR_ID: { in: uarIds },
          DIVISION_ID: userDivisionId
        },
        _count: {
          _all: true
        }
      })
    ]);
    return { data: dataRaw, total: totalRows, workflowStatus, completionStats };
  },
  async getUarDetails(uarId, userDivisionId) {
    return prisma.tB_R_UAR_DIVISION_USER.findMany({
      where: {
        UAR_ID: uarId,
        DIVISION_ID: userDivisionId
      },
      orderBy: {
        NAME: "asc"
      }
    });
  },
  async batchUpdate(dto, userNoreg, userDivisionId) {
    const { uarId, items, comments } = dto;
    const now = await getDbNow2();
    const approvedItems = items.filter((item) => item.decision === "Approved").map((item) => ({ USERNAME: item.username, ROLE_ID: item.roleId }));
    const revokedItems = items.filter((item) => item.decision === "Revoked").map((item) => ({ USERNAME: item.username, ROLE_ID: item.roleId }));
    try {
      return await prisma.$transaction(async (tx) => {
        const approveUpdateResult = approvedItems.length > 0 ? await tx.tB_R_UAR_DIVISION_USER.updateMany({
          where: {
            UAR_ID: uarId,
            DIVISION_ID: userDivisionId,
            OR: approvedItems
          },
          data: {
            DIV_APPROVAL_STATUS: "1",
            // 'Approve'
            REVIEWED_BY: userNoreg,
            REVIEWED_DT: now
          }
        }) : { count: 0 };
        const revokeUpdateResult = revokedItems.length > 0 ? await tx.tB_R_UAR_DIVISION_USER.updateMany({
          where: {
            UAR_ID: uarId,
            DIVISION_ID: userDivisionId,
            OR: revokedItems
          },
          data: {
            DIV_APPROVAL_STATUS: "2",
            REVIEWED_BY: userNoreg,
            REVIEWED_DT: now
          }
        }) : { count: 0 };
        const userUpdateResult = {
          count: approveUpdateResult.count + revokeUpdateResult.count
        };
        const allItemsInUar = await tx.tB_R_UAR_DIVISION_USER.findMany({
          where: { UAR_ID: uarId, DIVISION_ID: userDivisionId },
          select: { DIV_APPROVAL_STATUS: true }
        });
        const totalItems = allItemsInUar.length;
        let rejectedCount = 0;
        let pendingCount = 0;
        for (const item of allItemsInUar) {
          if (item.DIV_APPROVAL_STATUS === "0") {
            rejectedCount++;
          } else if (item.DIV_APPROVAL_STATUS === null) {
            pendingCount++;
          }
        }
        let isApproved = "N";
        let isRejected = "N";
        let approvedDt = null;
        if (rejectedCount > 0) {
          isRejected = "Y";
          approvedDt = now;
        } else if (pendingCount > 0) {
        } else {
          isApproved = "Y";
          approvedDt = now;
        }
        const workflowUpdateResult = await tx.tB_R_WORKFLOW.updateMany({
          where: {
            UAR_ID: uarId,
            DIVISION_ID: userDivisionId
          },
          data: {
            IS_APPROVED: isApproved,
            IS_REJECTED: isRejected,
            APPROVED_BY: userNoreg,
            APPROVED_DT: approvedDt
          }
        });
        return { userUpdateResult, workflowUpdateResult };
      });
    } catch (error) {
      console.error("Batch update transaction failed:", error);
      throw new Error("Batch update failed.");
    }
  }
};

// src/modules/uar_division/uar_division.service.ts
var uarDivisionService = {
  async list(params, userDivisionId) {
    const { data, total, workflowStatus, completionStats } = await uarDivisionRepository.listUars({
      ...params,
      userDivisionId
    });
    const wfStatusMap = new Map(workflowStatus.map((w) => [w.UAR_ID, w]));
    const percentMap = /* @__PURE__ */ new Map();
    for (const stat2 of completionStats) {
      const uarId = stat2.UAR_ID;
      const count = stat2._count._all;
      const status = stat2.DIV_APPROVAL_STATUS;
      if (!percentMap.has(uarId)) {
        percentMap.set(uarId, { completed: 0, total: 0 });
      }
      const current = percentMap.get(uarId);
      current.total += count;
      if (status === "1" || status === "2") {
        current.completed += count;
      }
    }
    const headers = data.map((r) => {
      const wf = wfStatusMap.get(r.UAR_ID);
      const stats = percentMap.get(r.UAR_ID);
      let percentCompleteString = "100% (0 of 0)";
      let newStatus = "1";
      if (stats) {
        const total2 = stats.total;
        const completed = stats.completed;
        if (total2 > 0) {
          const percentNumber = Math.round(completed / total2 * 100);
          percentCompleteString = `${percentNumber}% (${completed} of ${total2})`;
          newStatus = percentNumber === 100 ? "1" : "0";
        } else {
          percentCompleteString = "100% (0 of 0)";
          newStatus = "1";
        }
      }
      return {
        uarId: r.UAR_ID,
        uarPeriod: r.UAR_PERIOD,
        divisionOwner: r.TB_M_DIVISION?.DIVISION_NAME ?? "N/A",
        percentComplete: percentCompleteString,
        createdDate: wf?.CREATED_DT?.toISOString() ?? "",
        completedDate: wf?.APPROVED_DT?.toISOString() ?? null,
        status: newStatus
      };
    });
    return { data: headers, total };
  },
  async getDetails(uarId, userDivisionId) {
    const rows = await uarDivisionRepository.getUarDetails(uarId, userDivisionId);
    if (!rows || rows.length === 0) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        "No UAR data found for this ID and your division.",
        { uarId, userDivisionId },
        void 0,
        404
      );
    }
    return rows;
  },
  async batchUpdate(dto, userNoreg, userDivisionId) {
    if (!dto.items || dto.items.length === 0) {
      throw new ApplicationError(
        ERROR_CODES.VAL_INVALID_FORMAT,
        "No items selected for update.",
        dto,
        void 0,
        400
      );
    }
    const result = await uarDivisionRepository.batchUpdate(dto, userNoreg, userDivisionId);
    if (result.workflowUpdateResult.count === 0 && result.userUpdateResult.count === 0) {
      throw new ApplicationError(
        ERROR_CODES.APP_UPDATE_FAILED,
        "Update failed. No matching UAR workflow or items found."
      );
    }
    const userId = currentUserId() ?? userNoreg;
    const reqId = currentRequestId();
    publishMonitoringLog(globalThis.app, {
      userId,
      module: "UAR_DIV",
      action: "BATCH_UPDATE",
      status: "Success",
      description: `Batch update for UAR ${dto.uarId} on ${dto.items.length} items.`,
      location: "/uar-division/batch-update"
    }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
    return result;
  }
};

// src/modules/uar_division/uar_division.controller.ts
function getAuthInfo(req) {
  const auth = req.auth;
  if (!auth?.divisionId || !auth?.noreg) {
    throw new Error(
      "User authentication details (divisionId, noreg) not found. Check auth plugin."
    );
  }
  return auth;
}
var uarDivisionController = {
  list: (_app) => async (req, reply) => {
    const { divisionId } = getAuthInfo(req);
    const { page = 1, limit = 10, period, uarId } = req.query ?? {};
    const result = await uarDivisionService.list(
      {
        page: Number(page),
        limit: Number(limit),
        period,
        uarId
      },
      Number(divisionId)
    );
    return reply.send({
      data: result.data,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: result.total
      }
    });
  },
  getDetails: (_app) => async (req, reply) => {
    const { divisionId } = getAuthInfo(req);
    const uarId = req.params.id;
    const data = await uarDivisionService.getDetails(uarId, Number(divisionId));
    return reply.send({ data });
  },
  batchUpdate: (_app) => async (req, reply) => {
    const { divisionId, noreg } = getAuthInfo(req);
    const result = await uarDivisionService.batchUpdate(
      req.body,
      noreg,
      Number(divisionId)
    );
    return reply.send({
      message: `Batch update successful.`,
      data: result
    });
  }
};

// src/modules/uar_division/uar_division.schema.ts
var UarHeaderItemSchema = {
  type: "object",
  properties: {
    uarId: { type: "string" },
    uarPeriod: { type: "string" },
    divisionOwner: { type: "string" },
    percentComplete: { type: "string" },
    createdDate: { type: "string" },
    completedDate: { type: ["string", "null"] },
    status: { type: ["string", "null"], enum: ["1", "0", null] }
  }
};
var listUarSchema = {
  querystring: {
    type: "object",
    properties: {
      page: { type: "number", default: 1 },
      limit: { type: "number", default: 10 },
      period: { type: "string", description: "Filter by UAR Period (YYYYMM)" },
      uarId: { type: "string", description: "Filter by UAR ID (contains)" }
    }
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: UarHeaderItemSchema },
        meta: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" }
        }
      }
    }
  }
};
var getUarDetailsSchema = {
  params: {
    type: "object",
    properties: {
      id: { type: "string", description: "The UAR_ID" }
    },
    required: ["id"]
  },
  response: {
    200: {
      type: "object",
      properties: {
        // Define the schema for a single TB_R_UAR_DIVISION_USER item
        data: { type: "array", items: { type: "object", additionalProperties: true } }
      }
    }
  }
};
var batchUpdateSchema = {
  body: {
    type: "object",
    properties: {
      uarId: { type: "string" },
      comments: { type: "string" },
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            username: { type: "string" },
            roleId: { type: "string" },
            decision: { type: "string", enum: ["Approved", "Revoked"] }
          },
          required: ["username", "roleId", "decision"]
        }
      }
    },
    required: ["uarId", "items"]
  },
  response: {
    200: {
      type: "object",
      properties: {
        message: { type: "string" },
        data: { type: "object", additionalProperties: true }
      }
    }
  }
};

// src/api/uar_division/uar_division.routes.ts
async function uarDivisionRoutes(app) {
  app.get(
    "",
    { schema: listUarSchema },
    uarDivisionController.list(app)
  );
  app.get(
    "/:id",
    { schema: getUarDetailsSchema },
    uarDivisionController.getDetails(app)
  );
  app.post(
    "/batch-update",
    { schema: batchUpdateSchema },
    uarDivisionController.batchUpdate(app)
  );
}

// src/api/index.routes.ts
async function indexRoutes(app) {
  app.register(async (r) => {
    r.addHook("preHandler", app.requireAnyPermission(["SCHEDULE_VIEW", "SCHEDULE_MANAGE"]));
    await scheduleRoutes(r);
  }, { prefix: "/schedules" });
  app.register(async (r) => {
    r.addHook("preHandler", app.requirePermission("UAR_PIC_VIEW"));
    await uarRoutes(r);
  }, { prefix: "/uarpic" });
  app.register(logMonitoringRoutes, { prefix: "/log_monitoring" });
  app.register(async (r) => {
    r.addHook("preHandler", app.requirePermission("MASTER_CONFIG_MANAGE"));
    await systemRoutes(r);
  }, { prefix: "/master_config" });
  app.register(uarDivisionRoutes, { prefix: "/uar_division" });
  app.register(async (r) => {
    r.addHook("preHandler", app.requireAnyPermission(["APPLICATION_VIEW", "APPLICATION_MANAGE"]));
    await applicationRoutes(r);
  }, { prefix: "/application" });
  app.register(uarGenerateRoutes, { prefix: "/generate" });
}

// src/api/common/middleware/authorize.ts
import fp4 from "fastify-plugin";
var DEFAULT_PUBLIC = [
  "/health-check",
  "/health",
  "/docs",
  "/auth/login",
  "/auth/refresh-token",
  "/job/start",
  "/tools"
];
var startsWithAny = (url, bases) => bases.some((p) => url.startsWith(p));
var authorize_default = fp4(async function authorizePlugin(app, opts) {
  const publicPaths = opts?.publicPaths ?? DEFAULT_PUBLIC;
  const base = opts?.prefixBase ?? "";
  app.decorate("authenticate", async function(req, reply) {
    try {
      await req.jwtVerify();
    } catch (e) {
      const msg = /expired/i.test(String(e?.message)) ? "Unauthorized: Token Expired" : "Unauthorized: Invalid Token";
      return reply.status(401).send(ServiceResponse.failure(msg, null, 401));
    }
  });
  app.addHook("onRequest", async (req, reply) => {
    const url = req.raw.url || req.url || "";
    const fullPublic = publicPaths.map((p) => base ? `${base}${p}` : p);
    if (startsWithAny(url, fullPublic)) return;
    try {
      await app.authenticate(req, reply);
    } catch {
      return;
    }
    const payload = req.user;
    const username = payload?.sub;
    if (!username) {
      return reply.status(401).send(ServiceResponse.failure("Unauthorized", null, 401));
    }
    try {
      const profile = await authService.validate(username);
      req.auth = {
        username: profile?.user?.username ?? username,
        divisionId: 2,
        noreg: "100000",
        features: profile?.features ?? [],
        functions: profile?.functions ?? [],
        roles: profile?.roles ?? []
      };
      if (!req.auth.username) {
        return reply.status(401).send(ServiceResponse.failure("Unauthorized", null, 401));
      }
    } catch {
      return reply.status(401).send(ServiceResponse.failure("Unauthorized", null, 401));
    }
  });
  app.decorate("requirePermission", function(permission) {
    return async (req, reply) => {
      const u = req.auth;
      if (!u) {
        return reply.status(401).send(ServiceResponse.failure("Unauthorized", null, 401));
      }
      if (u.roles?.includes("adminsar")) return;
      const ok = u.features?.includes(permission) || u.functions?.includes(permission);
      if (!ok) {
        return reply.status(403).send(
          ServiceResponse.failure(
            `Access denied. You don't have permission to access this resource`,
            null,
            403
          )
        );
      }
    };
  });
  app.decorate("requireAnyPermission", function(perms) {
    return async (req, reply) => {
      const u = req.auth;
      if (!u) {
        return reply.status(401).send(ServiceResponse.failure("Unauthorized", null, 401));
      }
      if (u.roles?.includes("adminsar")) return;
      const ok = perms.some(
        (p) => u.features?.includes(p) || u.functions?.includes(p)
      );
      if (!ok) {
        return reply.status(403).send(
          ServiceResponse.failure(
            `Access denied. Required one of: ${perms.join(", ")}`,
            null,
            403
          )
        );
      }
    };
  });
  app.decorate("requireAllPermissions", function(perms) {
    return async (req, reply) => {
      const u = req.auth;
      if (!u) {
        return reply.status(401).send(ServiceResponse.failure("Unauthorized", null, 401));
      }
      if (u.roles?.includes("adminsar")) return;
      const ok = perms.every(
        (p) => u.features?.includes(p) || u.functions?.includes(p)
      );
      if (!ok) {
        return reply.status(403).send(
          ServiceResponse.failure(
            `Access denied. Required all of: ${perms.join(", ")}`,
            null,
            403
          )
        );
      }
    };
  });
});

// src/plugins/requestContext.ts
import fp5 from "fastify-plugin";
var requestContext_default = fp5(async function requestContextPlugin(app) {
  app.addHook("onRequest", (req, reply, done) => {
    const requestId = req.headers["x-request-id"] || req.id;
    const user = extractUserFromRequest(app, req);
    runWithRequestContext(
      { userId: user.userId, role: user.role, username: user.username, requestId },
      () => {
        done();
      }
    );
  });
});

// src/app.ts
async function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === "production" ? "info" : "debug" },
    ajv: {
      customOptions: {
        coerceTypes: true
      }
    }
  });
  globalThis.app = app;
  await app.register(prisma_default);
  await app.register(rateLimit, {
    max: SECURITY_CONFIG.MAX_API_CALLS_PER_MINUTE,
    timeWindow: "1 minute"
  });
  await app.register(cors, {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", env.FE_PROD],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-request-id"
    ],
    credentials: true
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(fastifyCookie);
  await app.register(fastifyJWT, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: "access",
      signed: false
      // ← WAJIB ditambahkan
    }
  });
  await app.register(requestIdPlugin);
  await app.register(securityPlugin);
  await app.register(requestContext_default);
  await app.register(authorize_default, {
    publicPaths: [
      "/health",
      "/api/auth/login",
      "/api/auth/refresh-token",
      "/tdd",
      // TDD documentation is public
      "/tdd/*"
      // All TDD routes are public
    ],
    prefixBase: ""
    // optional
  });
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(indexRoutes, { prefix: "/api/sar" });
  const { tddRoutes: tddRoutes2 } = await Promise.resolve().then(() => (init_tdd_routes(), tdd_routes_exports));
  await app.register(tddRoutes2);
  app.get("/health", async (request, reply) => {
    try {
      if (app.hasDecorator("prisma")) {
        await app.prisma.$queryRaw`SELECT 1`;
        return { status: "ok", db: "ok" };
      }
      return { status: "ok", db: "skipped" };
    } catch (e) {
      app.log.error(e, "Database health check failed");
      reply.status(503);
      return { status: "error", db: "unavailable" };
    }
  });
  return app;
}

// src/utils/scheduler.ts
import schedule from "node-schedule";

// src/modules/batch/notif_history.service.ts
import { Prisma as Prisma4 } from "./generated/prisma/index.js";
var ITEM_CODES = {
  CREATED: "UAR_CREATED",
  COMPLETED: "UAR_COMPLETED",
  REMINDER_1: "UAR_REMINDER_1",
  REMINDER_2: "UAR_REMINDER_2",
  REMINDER_3: "UAR_REMINDER_3",
  REMINDER_4: "UAR_REMINDER_4",
  REMINDER_5: "UAR_REMINDER_5",
  REMINDER_6: "UAR_REMINDER_6",
  REMINDER_7: "UAR_REMINDER_7"
};
var REMINDER_CODES = {
  1: ITEM_CODES.REMINDER_1,
  2: ITEM_CODES.REMINDER_2,
  3: ITEM_CODES.REMINDER_3,
  4: ITEM_CODES.REMINDER_4,
  5: ITEM_CODES.REMINDER_5,
  6: ITEM_CODES.REMINDER_6,
  7: ITEM_CODES.REMINDER_7
};
var notificationService = {
  /**
   * Queues a single notification, checking for duplicates first.
   */
  async queueNotification(app, candidate, checkDuplicates = true) {
    if (checkDuplicates) {
      const existing = await app.prisma.tB_H_NOTIFICATION.findFirst({
        where: {
          REQUEST_ID: candidate.REQUEST_ID,
          ITEM_CODE: candidate.ITEM_CODE
        }
      });
      if (existing) {
        app.log.warn(
          `Notification already sent for ${candidate.REQUEST_ID} with code ${candidate.ITEM_CODE}. Skipping.`
        );
        return;
      }
    }
    await app.prisma.tB_T_CANDIDATE_NOTIFICATION.create({
      data: {
        ID: BigInt(Date.now()),
        REQUEST_ID: candidate.REQUEST_ID,
        ITEM_CODE: candidate.ITEM_CODE,
        APPROVER_ID: candidate.APPROVER_ID,
        DUE_DATE: candidate.DUE_DATE,
        STATUS: "PENDING",
        CREATED_DT: /* @__PURE__ */ new Date()
      }
    });
  },
  async triggerInitialNotifications(app, newUarTasks) {
    app.log.info(
      `Triggering initial notifications for ${newUarTasks.length} tasks...`
    );
    const appIds = [...new Set(newUarTasks.map((task) => task.APPLICATION_ID))];
    console.log("appids", appIds);
    const applications = await app.prisma.tB_M_APPLICATION.findMany({
      where: {
        APPLICATION_ID: { in: appIds }
      },
      select: {
        APPLICATION_ID: true,
        NOREG_SYSTEM_OWNER: true
      }
    });
    const approverMap = new Map(
      applications.map((app2) => [app2.APPLICATION_ID, app2.NOREG_SYSTEM_OWNER])
    );
    for (const task of newUarTasks) {
      if (!task.APPLICATION_ID) continue;
      const approverNoreg = approverMap.get(task.APPLICATION_ID);
      if (!approverNoreg) {
        app.log.warn(
          `No approver found for APPLICATION_ID: ${task.APPLICATION_ID}. Skipping notification.`
        );
        continue;
      }
      await this.queueNotification(app, {
        REQUEST_ID: `${task.UAR_ID}${task.USERNAME}${task.ROLE_ID}`,
        ITEM_CODE: ITEM_CODES.CREATED,
        APPROVER_ID: approverNoreg,
        DUE_DATE: null
        // Or set a 'due date' if you have one
      });
    }
  },
  /**
   * EVENT 2: Logic to determine the next reminder code to send.
   */
  getNextReminderCode(daysPending, lastReminderCode) {
    const expectedReminderCode = REMINDER_CODES[daysPending];
    if (!expectedReminderCode) {
      return null;
    }
    const yesterdayReminderCode = REMINDER_CODES[daysPending - 1];
    if (daysPending === 1 && !lastReminderCode || // Day 1, no reminder sent
    lastReminderCode === yesterdayReminderCode) {
      return expectedReminderCode;
    }
    return null;
  }
};

// src/workers/schedule.worker.ts
async function runUarSOWorker(app) {
  app.log.info("Checking for UAR schedule jobs...");
  const now = /* @__PURE__ */ new Date();
  try {
    if (!app.prisma) {
      app.log.error(
        "Prisma client 'prisma' (for TB_H_EMPLOYEE) is not initialized."
      );
      return;
    }
    const runningSchedules = await scheduleService.getRunningUarSchedules(app);
    let totalNewUarTasks = 0;
    console.log("runningSchedules", runningSchedules);
    for (const schedule2 of runningSchedules) {
      app.log.info(
        `Processing schedule for APPLICATION_ID: ${schedule2.APPLICATION_ID}`
      );
      const accessMappings = await app.prisma.tB_M_AUTH_MAPPING.findMany({
        where: {
          APPLICATION_ID: schedule2.APPLICATION_ID,
          UAR_PROCESS_STATUS: "0"
        }
      });
      if (accessMappings.length === 0) {
        app.log.warn(
          `No active access mappings found for ${schedule2.APPLICATION_ID} with status '0'.`
        );
        continue;
      }
      const noregs = [
        ...new Set(accessMappings.map((m) => m.NOREG).filter(Boolean))
      ];
      const employeeData = await app.prisma.tB_M_EMPLOYEE.findMany({
        where: {
          NOREG: { in: noregs },
          VALID_TO: { gte: now }
        },
        orderBy: {
          VALID_TO: "desc"
        }
      });
      const employeeMap = /* @__PURE__ */ new Map();
      for (const emp of employeeData) {
        if (!employeeMap.has(emp.NOREG)) {
          employeeMap.set(emp.NOREG, emp);
        }
      }
      app.log.info(
        `Enriched ${employeeMap.size} employee records from prisma.`
      );
      const uarPeriod = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}`;
      const uarId = `UAR_${uarPeriod.substring(2)}_${schedule2.APPLICATION_ID}`.substring(0, 20);
      const newUarTasks = accessMappings.map((mapping) => {
        const employee = employeeMap.get(mapping.NOREG ?? "");
        return {
          UAR_PERIOD: uarPeriod,
          UAR_ID: uarId,
          USERNAME: mapping.USERNAME,
          NOREG: mapping.NOREG,
          NAME: `${mapping.FIRST_NAME} ${mapping.LAST_NAME}`,
          POSITION_NAME: employee?.POSITION_NAME ?? null,
          DIVISION_ID: employee?.DIVISION_ID ?? null,
          DEPARTMENT_ID: employee?.DEPARTMENT_ID ?? null,
          SECTION_ID: employee?.SECTION_ID ?? null,
          ORG_CHANGED_STATUS: null,
          COMPANY_CD: mapping.COMPANY_CD,
          APPLICATION_ID: mapping.APPLICATION_ID,
          ROLE_ID: mapping.ROLE_ID,
          REVIEWER_NOREG: null,
          REVIEWER_NAME: null,
          REVIEW_STATUS: null,
          REVIEWED_BY: null,
          REVIEWED_DT: null,
          SO_APPROVAL_STATUS: "0",
          SO_APPROVAL_BY: null,
          SO_APPROVAL_DT: null,
          REMEDIATED_STATUS: null,
          REMEDIATED_DT: null,
          CREATED_BY: "system.UarSOWorker",
          CREATED_DT: now,
          CHANGED_BY: null,
          CHANGED_DT: null
        };
      });
      const createResult = await app.prisma.tB_R_UAR_SYSTEM_OWNER.createMany({
        data: newUarTasks
      });
      app.log.info(`Created ${createResult.count} new UAR tasks.`);
      totalNewUarTasks += createResult.count;
      if (createResult.count > 0) {
        app.log.info(
          `Updating ${accessMappings.length} source auth mappings to 'In Progress' (1)...`
        );
        await app.prisma.tB_M_AUTH_MAPPING.updateMany({
          where: {
            APPLICATION_ID: schedule2.APPLICATION_ID,
            UAR_PROCESS_STATUS: "0"
          },
          data: {
            UAR_PROCESS_STATUS: "1",
            CHANGED_BY: "system.UarSOWorker",
            CHANGED_DT: now
          }
        });
        app.log.info(`Updated source mappings for ${schedule2.APPLICATION_ID}.`);
      }
      await notificationService.triggerInitialNotifications(
        app,
        newUarTasks.map((task) => ({
          ...task,
          NOREG: task.NOREG ?? null
        }))
      );
    }
    app.log.info(
      `Ticker: Processed ${totalNewUarTasks} UAR System Owners at ${now.toISOString()}`
    );
  } catch (error) {
    app.log.error(
      error,
      "Ticker: A fatal error occurred during the UAR SO worker run."
    );
  }
}
async function runUarDailyReminderWorker(app) {
  app.log.info("Running Daily UAR Reminder Worker...");
  const now = /* @__PURE__ */ new Date();
  try {
    const pendingTasks = await app.prisma.$queryRaw`
        SELECT
            uar.UAR_ID,
            uar.USERNAME,
            uar.ROLE_ID,
            uar.APPLICATION_ID,
            app.NOREG_SYSTEM_OWNER,
            DATEDIFF(DAY, uar.CREATED_DT, GETDATE()) AS DAYS_PENDING,
            (
                SELECT TOP 1 h.ITEM_CODE
                -- *** BUG FIX: Use correct history table ***
                FROM TB_H_NOTIFICATION h
                WHERE h.REQUEST_ID = (uar.UAR_ID + uar.USERNAME + uar.ROLE_ID)
                AND h.ITEM_CODE LIKE 'UAR_REMINDER_%'
                ORDER BY h.SENT_DT DESC
            ) AS LAST_REMINDER_CODE
        FROM
            TB_R_UAR_SYSTEM_OWNER uar
        JOIN
            TB_M_APPLICATION app ON uar.APPLICATION_ID = app.APPLICATION_ID
        WHERE
            uar.SO_APPROVAL_STATUS = '0'
            AND DATEDIFF(DAY, uar.CREATED_DT, GETDATE()) BETWEEN 1 AND 7;
    `;
    app.log.info(
      `Found ${pendingTasks.length} pending tasks to check for reminders.`
    );
    let remindersQueued = 0;
    for (const task of pendingTasks) {
      const nextReminderCode = notificationService.getNextReminderCode(
        task.DAYS_PENDING,
        task.LAST_REMINDER_CODE
      );
      if (nextReminderCode) {
        await notificationService.queueNotification(app, {
          REQUEST_ID: `${task.UAR_ID}${task.USERNAME}${task.ROLE_ID}`,
          ITEM_CODE: nextReminderCode,
          APPROVER_ID: task.NOREG_SYSTEM_OWNER,
          DUE_DATE: null
        });
        remindersQueued++;
      }
    }
    app.log.info(`Queued ${remindersQueued} new reminders.`);
  } catch (error) {
    app.log.error(
      error,
      "A fatal error occurred during the reminder worker run."
    );
  }
}
async function runPaPusherWorker(app) {
  app.log.info("Running Notification Pusher Worker...");
  let paFlowUrl = null;
  let defaultCc = null;
  try {
    const configs = await app.prisma.tB_M_SYSTEM.findMany({
      where: {
        OR: [
          { SYSTEM_TYPE: "PA_FLOW_URL", SYSTEM_CD: "DEFAULT" },
          { SYSTEM_TYPE: "EMAIL", SYSTEM_CD: "DEFAULT_CC" }
        ],
        VALID_TO_DT: { gte: /* @__PURE__ */ new Date() }
      }
    });
    paFlowUrl = configs.find(
      (c) => c.SYSTEM_TYPE === "PA_FLOW_URL" && c.SYSTEM_CD === "DEFAULT"
    )?.VALUE_TEXT ?? "https://default47c7b16bd4824147b21a04936dd898.75.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/5230e06d1da946f59186c47029a77355/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=-jG539opTKLd4PgrzJgrNTFlfJ5sIG0zKBEp406dpss";
    defaultCc = configs.find(
      (c) => c.SYSTEM_TYPE === "EMAIL" && c.SYSTEM_CD === "DEFAULT_CC"
    )?.VALUE_TEXT ?? null;
    if (!paFlowUrl) {
      app.log.error("PA_FLOW_URL is not set in TB_M_SYSTEM. Worker stopping.");
      return;
    }
  } catch (error) {
    app.log.error(error, "Failed to fetch config from TB_M_SYSTEM.");
    return;
  }
  let candidates = [];
  try {
    candidates = await app.prisma.tB_T_CANDIDATE_NOTIFICATION.findMany({
      where: {
        STATUS: "PENDING"
      },
      take: 50
    });
    if (candidates.length === 0) {
      app.log.info("No pending notifications to push.");
      return;
    }
    app.log.info(`Found ${candidates.length} notifications to process.`);
    const candidateIds = candidates.map((c) => c.ID);
    await app.prisma.tB_T_CANDIDATE_NOTIFICATION.updateMany({
      where: {
        ID: { in: candidateIds },
        STATUS: "PENDING"
      },
      data: {
        STATUS: "PROCESSING"
      }
    });
    for (const job of candidates) {
      let finalPayload = {};
      try {
        let recipientEmail = null;
        let recipientTeamsId = null;
        if (job.ITEM_CODE.startsWith("PIC_")) {
          const pic = await app.prisma.tB_M_UAR_PIC.findFirst({
            where: {
              DIVISION_ID: parseInt(job.APPROVER_ID)
            }
          });
          recipientEmail = pic?.MAIL ?? null;
          recipientTeamsId = pic?.MAIL ?? null;
        } else {
          if (!app.prisma) {
            throw new Error("Prisma client 'prisma' is not available.");
          }
          const employee = await app.prisma.tB_M_EMPLOYEE.findFirst({
            where: {
              NOREG: job.APPROVER_ID
            },
            orderBy: {
              VALID_TO: "desc"
            }
          });
          recipientEmail = employee?.MAIL ?? null;
          recipientTeamsId = employee?.MAIL ?? null;
        }
        if (!recipientEmail) {
          throw new Error(
            `No email recipient found for ITEM_CODE ${job.ITEM_CODE} and APPROVER_ID ${job.APPROVER_ID}`
          );
        }
        const allTemplates = await app.prisma.tB_M_TEMPLATE.findMany({
          where: {
            ITEM_CODE: job.ITEM_CODE,
            LOCALE: "en-US",
            ACTIVE: true
          }
        });
        const emailTemplate = allTemplates.find((t) => t.CHANNEL === "EMAIL");
        const teamsTemplate = allTemplates.find((t) => t.CHANNEL === "TEAMS");
        if (!emailTemplate && !teamsTemplate) {
          throw new Error(
            `No active EMAIL or TEAMS templates found for ITEM_CODE: ${job.ITEM_CODE}`
          );
        }
        const taskCount = parseInt(job.LINK_DETAIL ?? "1", 10) || 1;
        finalPayload = {
          recipientEmail,
          recipientTeamsId,
          ccEmail: defaultCc ?? "",
          emailSubject: emailTemplate?.SUBJECT_TPL ?? "",
          emailBodyCode: emailTemplate?.BODY_TPL ?? "",
          teamsSubject: teamsTemplate?.SUBJECT_TPL ?? "",
          teamsBodyCode: teamsTemplate?.BODY_TPL ?? "",
          itemCode: job.ITEM_CODE,
          requestId: job.REQUEST_ID,
          dueDate: job.DUE_DATE ?? "null",
          taskCount
          // <-- THIS IS THE NEWLY ADDED LINE
        };
        console.log("notifResponse", finalPayload);
        const response = await fetch(paFlowUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalPayload)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Power Automate call failed with status ${response.status}: ${errorText}`
          );
        }
        await app.prisma.tB_H_NOTIFICATION.create({
          data: {
            ID: job.ID,
            REQUEST_ID: job.REQUEST_ID,
            ITEM_CODE: job.ITEM_CODE,
            CHANNEL: "EMAIL_TEAMS_PA",
            SYSTEM: "SAR_DB_WORKER",
            RECIPIENT: job.APPROVER_ID,
            STATUS: "SENT_TO_PA",
            SENT_DT: /* @__PURE__ */ new Date(),
            CREATED_BY: "system.PusherWorker",
            CREATED_DT: /* @__PURE__ */ new Date()
          }
        });
        await app.prisma.tB_T_CANDIDATE_NOTIFICATION.update({
          where: { ID: job.ID },
          data: { STATUS: "SENT" }
        });
        app.log.info(`Successfully processed and pushed job ID: ${job.ID}`);
      } catch (jobError) {
        app.log.error(jobError, `Failed to process job ID: ${job.ID}`);
        await app.prisma.tB_T_CANDIDATE_NOTIFICATION.update({
          where: { ID: job.ID },
          data: { STATUS: "FAILED" }
        });
      }
    }
  } catch (error) {
    app.log.error(
      error,
      "A fatal error occurred during the sender worker run."
    );
  }
}
async function runUarSOSyncWorker(app) {
  app.log.info("Checking for UAR SO Sync jobs");
  const now = /* @__PURE__ */ new Date();
  try {
    app.log.info("Fetching pending UAR SO Sync schedules...");
    const pendingSchedules = await scheduleService.getRunningSyncSchedules(app);
    for (const schedule2 of pendingSchedules) {
      app.log.info(
        `Processing UAR SO Sync for APPLICATION_ID: ${schedule2.APPLICATION_ID}`
      );
      app.log.info(
        `Grabbing data from 5 sources for ${schedule2.APPLICATION_ID}...`
      );
      const results = await Promise.allSettled([
        fetchFromDB1(app),
        fetchFromDB2(app),
        fetchFromDB3(app),
        fetchFromDB4(app),
        fetchFromDB5(app)
      ]);
      let allSourceData = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          app.log.info(
            `Successfully fetched ${result.value.length} records from DB${index + 1}`
          );
          allSourceData = allSourceData.concat(result.value);
        } else {
          app.log.error(
            `Failed to fetch from DB ${index + 1}: ${result.reason?.message || result.reason}`
          );
        }
      });
      app.log.info(
        `Total records grabbed from all sources: ${allSourceData.length}`
      );
      await runCreateOnlySync(allSourceData, app);
      await new Promise((resolve2) => setTimeout(resolve2, 300));
    }
    app.log.info(
      `Processed ${pendingSchedules.length} UAR SO Sync schedules at ${now.toISOString()}`
    );
  } catch (error) {
    app.log.error(error, "A fatal error occurred during the run.");
  }
}

// src/utils/scheduler.ts
async function startScheduler(app) {
  const scheduledJob = () => {
    runUarSOWorker(app);
    runUarSOSyncWorker(app);
    runPaPusherWorker(app);
  };
  const scheduleNotifReminderJob = () => {
    runUarDailyReminderWorker(app);
  };
  schedule.scheduleJob("*/1 * * * *", scheduledJob);
  schedule.scheduleJob("59 7 * * *", scheduleNotifReminderJob);
  app.log.info("Scheduler started: Job scheduled to run every minute.");
}

// src/server.ts
var port = Number(process.env.PORT || 3e3);
var start = async () => {
  const app = await buildApp();
  try {
    await app.listen({ port, host: "0.0.0.0" });
    startScheduler(app);
    app.log.info(`Server listening on http://0.0.0.0:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
//# sourceMappingURL=server.js.map