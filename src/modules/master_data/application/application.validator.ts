import { SystemUser, systemUsers } from "./mocks"; // atau dari repository master user

function findUser(noreg: string) {
  return systemUsers.find(u => u.NOREG === noreg);
}

// ➜ aturan baru
function eligibleAsOwner(user: SystemUser) {
  // custodian ⇒ otomatis boleh owner
  return user.canBeOwner || user.canBeCustodian;
}

function eligibleAsCustodian(user: SystemUser) {
  // owner TIDAK boleh jadi custodian
  // jadi harus benar-benar punya hak custodian
  return user.canBeCustodian === true;
}

// dipanggil saat CREATE dan UPDATE
export function validateOwnerAndCustodian(noregOwner: string, noregCust: string) {
  if (noregOwner === noregCust) {
    throw appError("VAL-ERR-302", "Owner and Custodian must be different users");
  }

  // const owner = findUser(noregOwner);
  // const cust  = findUser(noregCust);

  // if (!owner) throw appError("APP-ERR-101", "Owner user not found");
  // if (!cust)  throw appError("APP-ERR-101", "Custodian user not found");

  // if (!eligibleAsOwner(owner)) {
  //   throw appError("VAL-ERR-302", "Selected Owner is not eligible as Owner");
  // }

  // if (!eligibleAsCustodian(cust)) {
  //   throw appError("VAL-ERR-302", "Selected Custodian is not eligible as Custodian");
  // }
}

function appError(code: string, message: string) {
  const e: any = new Error(message);
  e.code = code;
  e.statusCode = 400;
  return e;
}
