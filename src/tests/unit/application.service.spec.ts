import { applicationService as svc } from "../../modules/master_data/application/application.service.js";
import { __testing as repoTest } from "../../modules/master_data/application/application.repository.js";

describe("Application Service (simple unit)", () => {
  beforeEach(async () => {
    await repoTest.resetDefaults();
    jest.useRealTimers(); // default real timers
  });

  it("lists applications with newest first by default", async () => {
    const res = await svc.list({
      page: 1,
      limit: 10,
      sortField: "CREATED_DT",
      sortOrder: "desc",
    });

    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);

    if (res.data.length > 1) {
      const a = new Date(res.data[0].CREATED_DT).getTime();
      const b = new Date(res.data[1].CREATED_DT).getTime();
      expect(a >= b).toBe(true);
    }
  });

  it("creates application with formatted ID IPPCS and puts newest on top", async () => {
    // freeze time agar tanggal ID stabil
    const fakeNow = new Date("2025-10-25T09:15:00.000Z");
    jest.useFakeTimers().setSystemTime(fakeNow);

    const created = await svc.create({
      APPLICATION_ID: "NEWAPP",
      APPLICATION_NAME: "New App Name",
      DIVISION_ID_OWNER: "Corporate Planning",
      NOREG_SYSTEM_OWNER: "00123456", // canBeOwner: true
      NOREG_SYSTEM_CUST: "00345678",  // canBeCustodian: true
      SECURITY_CENTER: "LDAP",
      APPLICATION_STATUS: "Aktif",
    });

    // expect(created.APPLICATION_ID).toMatch(/^SARAPPLICATION20251025\d{4}$/);

    // newest paling atas
    const listTop = await svc.list({
      page: 1,
      limit: 1,
      sortField: "CREATED_DT",
      sortOrder: "desc",
    });
    expect(listTop.data[0].APPLICATION_ID).toBe(created.APPLICATION_ID);
  });

  // it("increments sequence for same day", async () => {
  //   const day = new Date("2025-10-25T01:00:00.000Z");
  //   jest.useFakeTimers().setSystemTime(day);

  //   const c1 = await svc.create({
  //     APPLICATION_ID: "SEQ1",
  //     APPLICATION_NAME: "Seq 1",
  //     DIVISION_ID_OWNER: "Corporate Planning",
  //     NOREG_SYSTEM_OWNER: "00123456",
  //     NOREG_SYSTEM_CUST: "00345678",
  //     SECURITY_CENTER: "SC",
  //     APPLICATION_STATUS: "Aktif",
  //   });

  //   const c2 = await svc.create({
  //     APPLICATION_ID: "SEQ2",
  //     APPLICATION_NAME: "Seq 2",
  //     DIVISION_ID_OWNER: "Corporate Planning",
  //     NOREG_SYSTEM_OWNER: "00123456",
  //     NOREG_SYSTEM_CUST: "00345678",
  //     SECURITY_CENTER: "SC",
  //     APPLICATION_STATUS: "Aktif",
  //   });

  //   expect(c1.APPLICATION_ID).toMatch(/^SARAPPLICATION20251025\d{4}$/);
  //   expect(c2.APPLICATION_ID).toMatch(/^SARAPPLICATION20251025\d{4}$/);
  //   const s1 = Number(c1.APPLICATION_ID.slice(-4));
  //   const s2 = Number(c2.APPLICATION_ID.slice(-4));
  //   expect(s2).toBe(s1 + 1);
  // });

  it("rejects duplicate APPLICATION_ID", async () => {
    await expect(
      svc.create({
        APPLICATION_ID: "IPPCS", // sudah ada di mock
        APPLICATION_NAME: "Dup",
        DIVISION_ID_OWNER: "Corporate Planning",
        NOREG_SYSTEM_OWNER: "00123456",
        NOREG_SYSTEM_CUST: "00345678",
        SECURITY_CENTER: "SC",
        APPLICATION_STATUS: "Aktif",
      })
    ).rejects.toMatchObject({ code: "VAL-ERR-304" }); // VAL_DUPLICATE_ENTRY
  });

  it("validates owner eligibility (owner must canBeOwner=true)", async () => {
    await expect(
      svc.create({
        APPLICATION_ID: "OWNERBAD",
        APPLICATION_NAME: "Owner Bad",
        DIVISION_ID_OWNER: "PE",
        NOREG_SYSTEM_OWNER: "00345679", // Suzuki -> canBeOwner: false
        NOREG_SYSTEM_CUST: "00345679",
        SECURITY_CENTER: "SC",
        APPLICATION_STATUS: "Aktif",
      })
    ).rejects.toMatchObject({ code: "VAL-ERR-302" }); // VAL_INVALID_FORMAT
  });

  it("validates custodian eligibility (custodian must canBeCustodian=true)", async () => {
    await expect(
      svc.create({
        APPLICATION_ID: "CUSTBAD",
        APPLICATION_NAME: "Cust Bad",
        DIVISION_ID_OWNER: "PPC",
        NOREG_SYSTEM_OWNER: "00123456",
        NOREG_SYSTEM_CUST: "00123457", // Yoshida -> canBeCustodian: false
        SECURITY_CENTER: "SC",
        APPLICATION_STATUS: "Aktif",
      })
    ).rejects.toMatchObject({ code: "VAL-ERR-302" }); // VAL_INVALID_FORMAT
  });

  it("rejects when owner and custodian are the same user", async () => {
    await expect(
      svc.create({
        APPLICATION_ID: "SAMEUSER",
        APPLICATION_NAME: "Same User",
        DIVISION_ID_OWNER: "PPC",
        NOREG_SYSTEM_OWNER: "00123456", // same
        NOREG_SYSTEM_CUST: "00123456", // same
        SECURITY_CENTER: "SC",
        APPLICATION_STATUS: "Aktif",
      })
    ).rejects.toMatchObject({ code: "VAL-ERR-302" }); // VAL_INVALID_FORMAT
  });

  it("validates security center", async () => {
    await expect(
      svc.create({
        APPLICATION_ID: "SCBAD",
        APPLICATION_NAME: "SC Bad",
        DIVISION_ID_OWNER: "PPC",
        NOREG_SYSTEM_OWNER: "00123456",
        NOREG_SYSTEM_CUST: "00345678",
        SECURITY_CENTER: "NOT_VALID",
        APPLICATION_STATUS: "Aktif",
      })
    ).rejects.toMatchObject({ code: "APP-ERR-103" }); // APP_INVALID_DATA
  });

  it("updates allowed fields and refreshes CHANGED_DT", async () => {
    // Ambil salah satu data awal
    const { data } = await svc.list({ page: 1, limit: 1, sortField: "CREATED_DT", sortOrder: "desc" });
    const target = data[0];

    const updated = await svc.update(target.APPLICATION_ID, {
      APPLICATION_NAME: "Updated Name",
      SECURITY_CENTER: "LDAP",
      APPLICATION_STATUS: "Inactive",
    });

    expect(updated.APPLICATION_NAME).toBe("Updated Name");
    expect(updated.SECURITY_CENTER).toBe("LDAP");
    expect(updated.APPLICATION_STATUS).toBe("Inactive");
    expect(new Date(updated.CHANGED_DT).getTime()).toBeGreaterThan(new Date(target.CHANGED_DT).getTime());
  });

  it("update validates owner/custodian/security center when provided", async () => {
    const { data } = await svc.list({ page: 1, limit: 1, sortField: "CREATED_DT", sortOrder: "desc" });
    const target = data[0];

    // owner salah
    await expect(
      svc.update(target.APPLICATION_ID, { NOREG_SYSTEM_OWNER: "00345679" }) // canBeOwner: false
    ).rejects.toMatchObject({ code: "VAL-ERR-302" });

    // custodian salah
    await expect(
      svc.update(target.APPLICATION_ID, { NOREG_SYSTEM_CUST: "00123457" }) // canBeCustodian: false
    ).rejects.toMatchObject({ code: "VAL-ERR-302" });

    // security center salah
    await expect(
      svc.update(target.APPLICATION_ID, { SECURITY_CENTER: "SalahSC" as any })
    ).rejects.toMatchObject({ code: "APP-ERR-103" });
  });
});
