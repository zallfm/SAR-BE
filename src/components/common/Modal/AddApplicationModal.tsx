import React, { useState, useEffect, useMemo } from "react";
import { CloseIcon } from "../../icons/CloseIcon";
import { systemUsers, securityCenters } from "../../../../data";
import type { SystemUser, Application } from "../../../../data";
import { useDebouncedValue } from "@/src/utils/useDebouncedValue";
import {
  getSecurityCentersApi,
  getSystemUsersApi,
} from "@/src/api/application.api";

interface AddApplicationModalProps {
  onClose: () => void;
  onSave: (application: Partial<Application>) => void;
  applicationToEdit?: Application | null;
  externalErrors?: {
    appId?: string;
    appName?: string;
    divisionOwner?: string;
    owner?: string;
    custodian?: string;
    securityCenter?: string;
    form?: string;
  };
}

const AutocompleteInput: React.FC<{
  label: string;
  placeholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  suggestions: SystemUser[];
  onSelect: (user: SystemUser) => void;
  error?: string;
}> = ({
  label,
  placeholder,
  query,
  onQueryChange,
  suggestions,
  onSelect,
  error,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSelect = (user: SystemUser) => {
    onSelect(user);
    setShowSuggestions(false);
  };

  const inputClass =
    `w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ` +
    (error
      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500");

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      />
      {showSuggestions && query && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
          {suggestions.map((user) => (
            <li
              key={user.NOREG}
              onMouseDown={() => handleSelect(user)}
              className="px-3 py-2 cursor-pointer hover:bg-blue-100"
            >
              {user.NOREG} - {user.PERSONAL_NAME}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}{" "}
      {/* [ADD] */}
    </div>
  );
};

const UserDetailsDisplay: React.FC<{ user: SystemUser | null }> = ({
  user,
}) => (
  <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
    <div className="grid grid-cols-[3fr_2fr] gap-x-4 gap-y-2">
      <p className="truncate">
        Name :{" "}
        <span className="font-semibold text-gray-800">
          {user?.PERSONAL_NAME || "-"}
        </span>
      </p>
      <p className="truncate">
        Division :{" "}
        <span className="font-semibold text-gray-800">
          {user?.DIVISION_NAME || "-"}
        </span>
      </p>
      <p className="truncate">
        Email :{" "}
        <span className="font-semibold text-gray-800">{user?.MAIL || "-"}</span>
      </p>
      <p className="truncate">
        Department :{" "}
        <span className="font-semibold text-gray-800">
          {user?.DEPARTEMENT_NAME || "-"}
        </span>
      </p>
    </div>
  </div>
);

type FieldErrors = {
  appId?: string;
  appName?: string;
  divisionOwner?: string;
  owner?: string;
  custodian?: string;
  securityCenter?: string;
  form?: string;
};

const AddApplicationModal: React.FC<AddApplicationModalProps> = ({
  onClose,
  onSave,
  applicationToEdit,
  externalErrors,
}) => {
  const isEditMode = !!applicationToEdit;

  const [appId, setAppId] = useState("");
  const [appName, setAppName] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});

  // [ADDED] sync error dari parent (ApplicationPage) ke modal
  useEffect(() => {
    if (!externalErrors) return;
    setErrors((prev) => ({
      ...prev,
      ...externalErrors,
      // handle kemungkinan divisionOwner dari BE
      owner: externalErrors.owner ?? externalErrors.divisionOwner ?? prev.owner,
    }));
  }, [externalErrors]);

  const matchUser = (u: SystemUser, q: string) =>
    `${u.NOREG} ${u.PERSONAL_NAME}`
      .toLowerCase()
      .includes(q.trim().toLowerCase());

  const [ownerQuery, setOwnerQuery] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<SystemUser | null>(null);

  const [custodianQuery, setCustodianQuery] = useState("");
  const [selectedCustodian, setSelectedCustodian] = useState<SystemUser | null>(
    null
  );

  const [securityCenterQuery, setSecurityCenterQuery] = useState("");
  const [selectedSecurityCenter, setSelectedSecurityCenter] =
    useState<string>("");
  const [showSecuritySuggestions, setShowSecuritySuggestions] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      setAppId(applicationToEdit.APPLICATION_ID);
      setAppName(applicationToEdit.APPLICATION_NAME);
      setSelectedSecurityCenter(applicationToEdit.SECURITY_CENTER);
      setSecurityCenterQuery(applicationToEdit.SECURITY_CENTER);

      setOwnerQuery(applicationToEdit.NOREG_SYSTEM_OWNER || "");
      setCustodianQuery(applicationToEdit.NOREG_SYSTEM_CUST || "");

      (async () => {
        try {
          if (applicationToEdit.NOREG_SYSTEM_OWNER) {
            const resOwner = await getSystemUsersApi({
              q: applicationToEdit.NOREG_SYSTEM_OWNER,
              limit: 1,
            });
            const foundOwner = resOwner.data?.find(
              (u) => u.NOREG === applicationToEdit.NOREG_SYSTEM_OWNER
            );
            if (foundOwner) setSelectedOwner(foundOwner);
          }

          if (applicationToEdit.NOREG_SYSTEM_CUST) {
            const resCust = await getSystemUsersApi({
              q: applicationToEdit.NOREG_SYSTEM_CUST,
              limit: 1,
            });
            const foundCust = resCust.data?.find(
              (u) => u.NOREG === applicationToEdit.NOREG_SYSTEM_CUST
            );
            if (foundCust) setSelectedCustodian(foundCust);
          }
        } catch {
          // boleh diabaikan atau tulis log
        }
      })();

      const ownerUser = systemUsers.find(
        (u) => u.NOREG === applicationToEdit.NOREG_SYSTEM_OWNER
      );
      if (ownerUser) {
        setSelectedOwner(ownerUser);
        setOwnerQuery(ownerUser.NOREG);
      }

      const custodianUser = systemUsers.find(
        (u) => u.NOREG === applicationToEdit.NOREG_SYSTEM_CUST
      );
      if (custodianUser) {
        setSelectedCustodian(custodianUser);
        setCustodianQuery(custodianUser.NOREG);
      }

      setSelectedSecurityCenter(applicationToEdit.SECURITY_CENTER);
      setSecurityCenterQuery(applicationToEdit.SECURITY_CENTER);
    }
  }, [applicationToEdit, isEditMode]);

  const clearError = (key: keyof FieldErrors) =>
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));

  const handleNoregOrNameChange = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    errKey?: keyof FieldErrors
  ) => {
    if (/^\d*$/.test(value)) {
      // if user is typing numbers (or empty)
      if (value.length <= 8) {
        setter(value);
      }
    } else {
      // if user is typing text (name)
      setter(value);
    }
    if (errKey) clearError(errKey);
  };

  //   const filteredOwners = useMemo(
  //     () =>
  //       ownerQuery
  //         ? systemUsers.filter((u) =>
  //             `${u.NOREG} ${u.PERSONAL_NAME}`
  //               .toLowerCase()
  //               .includes(ownerQuery.toLowerCase())
  //           )
  //         : [],
  //     [ownerQuery]
  //   );

  //   const filteredCustodians = useMemo(
  //     () =>
  //       custodianQuery
  //         ? systemUsers.filter((u) =>
  //             `${u.NOREG} ${u.PERSONAL_NAME}`
  //               .toLowerCase()
  //               .includes(custodianQuery.toLowerCase())
  //           )
  //         : [],
  //     [custodianQuery]
  //   );

  //   const filteredSecurityCenters = useMemo(
  //     () =>
  //       securityCenterQuery
  //         ? securityCenters.filter((sc) =>
  //             sc.toLowerCase().includes(securityCenterQuery.toLowerCase())
  //           )
  //         : securityCenters,
  //     [securityCenterQuery]
  //   );

  const [ownerSuggestions, setOwnerSuggestions] = useState<SystemUser[]>([]);
  const [custodianSuggestions, setCustodianSuggestions] = useState<
    SystemUser[]
  >([]);

  // OWNER: custodian boleh jadi owner  ==> (canBeOwner || canBeCustodian)
  // (opsional) tetap disaring sesuai query agar responsif bila BE belum memfilter penuh.
  // OWNER: custodian boleh jadi owner  -> tampilkan user yg canBeOwner **ATAU** canBeCustodian
  const ownerSuggestionsFiltered = useMemo(() => {
    const base = (ownerSuggestions ?? []).filter((u) => u.canBeOwner);
    return ownerQuery ? base.filter((u) => matchUser(u, ownerQuery)) : base;
  }, [ownerSuggestions, ownerQuery]);

  // CUSTODIAN: owner tidak boleh jadi custodian -> tampilkan user yg canBeCustodian **DAN** !canBeOwner
  // (opsional) sembunyikan user yg sudah terpilih sbg Owner agar tidak dobel assign
  const custodianSuggestionsFiltered = useMemo(() => {
    const base = (custodianSuggestions ?? []).filter((u) => u.canBeCustodian);
    return custodianQuery
      ? base.filter((u) => matchUser(u, custodianQuery))
      : base;
  }, [custodianSuggestions, custodianQuery]);

  const [securityCenterOptions, setSecurityCenterOptions] = useState<string[]>(
    []
  );
  const debouncedOwnerQ = useDebouncedValue(ownerQuery, 300);
  const debouncedCustQ = useDebouncedValue(custodianQuery, 300);
  const debouncedSecurityCenterQ = useDebouncedValue(securityCenterQuery, 300);

  useEffect(() => {
    if (!debouncedOwnerQ) {
      setOwnerSuggestions([]);
      return;
    }
    getSystemUsersApi({ q: debouncedOwnerQ, limit: 100 })
      .then((res) => setOwnerSuggestions(res.data ?? []))
      .catch(() => setOwnerSuggestions([]));
  }, [debouncedOwnerQ]);

  useEffect(() => {
    if (!debouncedCustQ) {
      setCustodianSuggestions([]);
      return;
    }
    getSystemUsersApi({ q: debouncedCustQ, limit: 100 })
      .then((res) => setCustodianSuggestions(res.data ?? []))
      .catch(() => setCustodianSuggestions([]));
  }, [debouncedCustQ]);

  // Ambil security centers sekali (atau saat input focus)
  useEffect(() => {
    // optional: kalau input kosong, kosongkan list (atau fetch top 10)
    if (!debouncedSecurityCenterQ.trim()) {
      setSecurityCenterOptions([]);
      return;
    }

    getSecurityCentersApi({ q: debouncedSecurityCenterQ, limit: 100 })
      .then((res) => setSecurityCenterOptions(res.data ?? []))
      .catch(() => setSecurityCenterOptions([]));
  }, [debouncedSecurityCenterQ]);

  const isFormValid = useMemo(() => {
    return (
      appId &&
      appName &&
      selectedOwner &&
      selectedCustodian &&
      selectedSecurityCenter
    );
  }, [
    appId,
    appName,
    selectedOwner,
    selectedCustodian,
    selectedSecurityCenter,
  ]);

  const handleSave = () => {
    setErrors({});

    if (!isFormValid) {
      // [ADDED] set error per field jika kosong
      setErrors({
        appId: !appId ? "Application ID is required" : undefined,
        appName: !appName ? "Application Name is required." : undefined,
        divisionOwner: !selectedOwner
          ? "Division Owner must be selected."
          : undefined,
        owner: !selectedOwner ? "System Owner must be selected." : undefined,
        custodian: !selectedCustodian
          ? "System Custodian must be selected."
          : undefined,
        securityCenter: !selectedSecurityCenter
          ? "Security Center must be selected."
          : undefined,
      });
      return;
    }

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, "0")}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${now.getFullYear()}`;
    const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const newUpdateTime = `${formattedDate}\n${formattedTime}`;
    console.log("selectedOwner", selectedOwner);

    const newApplication: Application = {
      APPLICATION_ID: appId,
      APPLICATION_NAME: appName,
      DIVISION_ID_OWNER: selectedOwner!.DIVISION_ID,
      NOREG_SYSTEM_OWNER: selectedOwner!.NOREG,
      NOREG_SYSTEM_CUST: selectedCustodian!.NOREG,
      SECURITY_CENTER: selectedSecurityCenter,
      CREATED_DT: isEditMode ? applicationToEdit.CREATED_DT : newUpdateTime,
      CHANGED_DT: newUpdateTime,
      APPLICATION_STATUS: isEditMode
        ? applicationToEdit.APPLICATION_STATUS
        : "Active",
      CREATED_BY: isEditMode ? applicationToEdit!.CREATED_BY : "system",
      CHANGED_BY: "system",
    };
    console.log("newApplication", newApplication);
    onSave(newApplication);
  };

  const inputClass = (hasError?: boolean) =>
    `w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ${
      hasError
        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
    }`;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditMode ? "Edit" : "Add"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="appId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Application ID <span className="text-red-500">*</span>
            </label>
            <input
              id="appId"
              type="text"
              placeholder="Application ID"
              value={appId}
              onChange={(e) => {
                setAppId(e.target.value);
                clearError("appId");
              }}
              disabled={isEditMode}
              className={`${inputClass(
                !!errors.appId
              )} disabled:bg-gray-100 disabled:cursor-not-allowed`}
            />
            {errors.appId && (
              <p className="mt-1 text-xs text-red-600">{errors.appId}</p>
            )}{" "}
            {/* [ADDED] */}
          </div>
          <div>
            <label
              htmlFor="appName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Application Name <span className="text-red-500">*</span>
            </label>
            <input
              id="appName"
              type="text"
              placeholder="Application Name"
              value={appName}
              onChange={(e) => {
                setAppName(e.target.value);
                clearError("appName");
              }} // [CHANGED]
              disabled={isEditMode}
              className={`${inputClass(
                !!errors.appName
              )} disabled:bg-gray-100 disabled:cursor-not-allowed`}
            />
            {errors.appName && (
              <p className="mt-1 text-xs text-red-600">{errors.appName}</p>
            )}
          </div>

          <AutocompleteInput
            label="System Owner"
            placeholder="Enter Name / NOREG"
            query={ownerQuery}
            onQueryChange={(value) => {
              handleNoregOrNameChange(value, setOwnerQuery);
              clearError("owner");
            }}
            // suggestions={filteredOwners}
            suggestions={ownerSuggestionsFiltered}
            onSelect={(user) => {
              setSelectedOwner(user);
              setOwnerQuery(user.NOREG);
              clearError("owner");
            }}
            // error={errors.owner}
          />
          <UserDetailsDisplay user={selectedOwner} />

          <AutocompleteInput
            label="System Custodian"
            placeholder="Enter Name / NOREG"
            query={custodianQuery}
            onQueryChange={(value) => {
              handleNoregOrNameChange(value, setCustodianQuery);
              clearError("custodian");
            }}
            // suggestions={filteredCustodians}
            suggestions={custodianSuggestionsFiltered}
            onSelect={(user) => {
              setSelectedCustodian(user);
              setCustodianQuery(user.NOREG);
              clearError("custodian");
            }}
            // error={errors.custodian}
          />
          <UserDetailsDisplay user={selectedCustodian} />

          <div className="relative">
            <label
              htmlFor="securityCenter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Security Center <span className="text-red-500">*</span>
            </label>
            <input
              id="securityCenter"
              type="text"
              placeholder="Select Security Center"
              value={securityCenterQuery}
              onChange={(e) => {
                setSecurityCenterQuery(e.target.value);
                setSelectedSecurityCenter("");
                setShowSecuritySuggestions(true);
              }}
              onFocus={() => setShowSecuritySuggestions(true)}
              onBlur={() =>
                setTimeout(() => setShowSecuritySuggestions(false), 200)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {showSecuritySuggestions && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                {securityCenterOptions.map((sc) => (
                  <li
                    key={sc}
                    onMouseDown={() => {
                      setSelectedSecurityCenter(sc);
                      setSecurityCenterQuery(sc);
                      setShowSecuritySuggestions(false);
                    }}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                  >
                    {sc}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end items-center p-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isFormValid}
            className="ml-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddApplicationModal;
