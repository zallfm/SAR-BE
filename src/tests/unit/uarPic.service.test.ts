import type { FastifyInstance } from "fastify";
import { uarPicService } from "../../modules/master_data/UarPic/uarpic.service";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
const mockApp = {} as FastifyInstance;

describe("uarPicService", () => {
  describe("createUarPic", () => {
    it("should create a new UAR PIC with valid data", async () => {
      const picName = "New User";
      const divisionId = 10;
      const mail = "new.user@toyota.co.id";

      const result = await uarPicService.createUarPic(
        mockApp,
        picName,
        divisionId,
        mail
      );

      expect(result.ID).toBe("SARPICCIO202510270001");
      expect(result.PIC_NAME).toBe(picName);
      expect(result.DIVISION_ID).toBe(divisionId);
      expect(result.MAIL).toBe(mail);
      expect(result.CREATED_BY).toBe("Hesti");
      expect(result.CHANGED_BY).toBe("Hesti");
      expect(result.CHANGED_DT).toBeNull();
      expect(result.CREATED_DT).toEqual(expect.any(String));
    });

    it("should throw an invalid format error for an incorrect email domain", async () => {
      const picName = "Bad User";
      const divisionId = 11;
      const mail = "bad.user@gmail.com";

      const act = () =>
        uarPicService.createUarPic(mockApp, picName, divisionId, mail);

      await expect(act()).rejects.toThrow(ApplicationError);
      await expect(act()).rejects.toHaveProperty(
        "code",
        ERROR_CODES.VAL_INVALID_FORMAT
      );
      await expect(act()).rejects.toHaveProperty("statusCode", 400);
    });
  });

  describe("editUarPic", () => {
    it("should edit an existing UAR PIC with valid data", async () => {
      const id = "SARPICCIO202510220001";
      const picName = "Hesti Updated";
      const divisionId = 20;
      const mail = "hesti.updated@toyota.co.id";

      const result = await uarPicService.editUarPic(
        mockApp,
        id,
        picName,
        divisionId,
        mail
      );

      expect(result.ID).toBe(id);
      expect(result.PIC_NAME).toBe(picName);
      expect(result.DIVISION_ID).toBe(divisionId);
      expect(result.MAIL).toBe(mail);
      expect(result.CHANGED_BY).toBe("Hesti");
      expect(result.CHANGED_DT).toEqual(expect.any(String));
    });

    it("should throw a not found error for a non-existent ID", async () => {
      const id = "9999";
      const picName = "Nobody";
      const divisionId = 99;
      const mail = "nobody@toyota.co.id";

      const act = () =>
        uarPicService.editUarPic(mockApp, id, picName, divisionId, mail);

      await expect(act()).rejects.toThrow(ApplicationError);
      await expect(act()).rejects.toHaveProperty(
        "code",
        ERROR_CODES.APP_NOT_FOUND
      );
      await expect(act()).rejects.toHaveProperty("statusCode", 400);
    });

    it("should throw an invalid format error for an incorrect email domain during edit", async () => {
      const id = "SARPICCIO202510220002";
      const picName = "Budi Invalid";
      const divisionId = 21;
      const mail = "budi@gmail.com";

      const act = () =>
        uarPicService.editUarPic(mockApp, id, picName, divisionId, mail);

      await expect(act()).rejects.toThrow(ApplicationError);
      await expect(act()).rejects.toHaveProperty(
        "code",
        ERROR_CODES.VAL_INVALID_FORMAT
      );
      await expect(act()).rejects.toHaveProperty("statusCode", 400);
    });
  });

  describe("Type Mismatches (Runtime Errors)", () => {
    it("should incorrectly pass if DIVISION_ID is a string (and not crash)", async () => {
      const picName = "String ID";
      const divisionId = "10" as any;
      const mail = "string.id@toyota.co.id";

      const result = await uarPicService.createUarPic(
        mockApp,
        picName,
        divisionId,
        mail
      );

      expect(result.DIVISION_ID).toBe("10"); // It's a string, not a number
      expect(result.DIVISION_ID).not.toBe(10);
    });

    it("should crash with a TypeError if MAIL is a number", async () => {
      const picName = "Number Mail";
      const divisionId = 10;
      const mail = 12345 as any;

      const act = () =>
        uarPicService.createUarPic(mockApp, picName, divisionId, mail);

      await expect(act()).rejects.toThrow(TypeError);
      await expect(act()).rejects.toThrow("MAIL.endsWith is not a function");

      await expect(act()).rejects.not.toThrow(ApplicationError);
    });
  });
});
