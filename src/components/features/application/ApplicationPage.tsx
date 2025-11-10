import React, { useEffect, useMemo, useState } from "react";
import { SearchIcon } from "../../icons/SearchIcon";
import { ActionIcon } from "../../icons/ActionIcon";
import { ChevronDownIcon } from "../../icons/ChevronDownIcon";
import AddApplicationModal from "../../common/Modal/AddApplicationModal";
import SuccessModal from "../../common/Modal/SuccessModal";
import { systemUsers } from "../../../../data";
import type { Application } from "../../../../data";
import StatusConfirmationModal from "../../common/Modal/StatusConfirmationModal";
import StatusPill from "../StatusPill/StatusPill";
import { AddButton } from "../../common/Button/AddButton";
import { IconButton } from "../../common/Button/IconButton";
import { EditIcon } from "../../icons/EditIcon";
import { useLogging } from "../../../hooks/useLogging";
import { loggingUtils } from "../../../utils/loggingIntegration";
import SearchableDropdown from "../../common/SearchableDropdown";
import { useApplicationStore } from "../../../store/applicationStore";
// import { postLogMonitoringApi } from "@/src/api/log_monitoring";
// import { AuditAction } from "@/src/constants/auditActions";
// import { useAuthStore } from "@/src/store/authStore";
import { postLogMonitoringApi } from "../../../../src/api/log_monitoring";
import { AuditAction } from "../../../../src/constants/auditActions";
import { useAuthStore } from "../../../../src/store/authStore";
import { parseApiError } from "@/src/utils/apiError";

const ApplicationPage: React.FC = () => {
  
  const {
    applications,
    searchTerm,
    currentPage,
    itemsPerPage,
    isModalOpen,
    editingApplication,
    isStatusConfirmationOpen,
    pendingStatusApplication,
    setSearchTerm,
    setCurrentPage,
    setItemsPerPage,
    addApplication,
    updateApplication,
    openAddModal,
    openEditModal,
    closeModal,
    openStatusConfirmation,
    closeStatusConfirmation,
    getApplications,
    createApplication,
    editApplication,
    toggleApplicationStatus,
    isLoading,
    error,
  } = useApplicationStore();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingSearch, setPendingSearch] = useState("");

  const [modalErrors, setModalErrors] = useState<{
    appId?: string;
    appName?: string;
    divisionOwner?: string;
    owner?: string;
    custodian?: string;
    securityCenter?: string;
    form?: string;
  }>({});

  // Status now standardized to English labels across UI: "Active" | "Inactive"

  const { logUserAction, logError } = useLogging({
    componentName: "ApplicationPage",
    enablePerformanceLogging: true,
  });

  const getNameFromNoreg = (noreg: string): string => {
    const user = systemUsers.find((u) => u.NOREG === noreg);
    return user ? user.PERSONAL_NAME : noreg;
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleOpenAddModal = () => {
    openAddModal();
    loggingUtils.logCriticalAction(
      "open_add_application_modal",
      "Application",
      {
        timestamp: new Date().toISOString(),
      }
    );
  };

  const handleOpenEditModal = (app: Application) => {
    openEditModal(app);
    loggingUtils.logCriticalAction(
      "open_edit_application_modal",
      "Application",
      {
        applicationId: app.APPLICATION_ID,
        applicationName: app.APPLICATION_NAME,
        timestamp: new Date().toISOString(),
      }
    );
  };

  const handleCloseModal = () => {
    closeModal();
  };

  const handleSaveApplication = async (application: Partial<Application>) => {
    try {
      // Validasi minimal untuk create
      const required = [
        "APPLICATION_ID",
        "APPLICATION_NAME",
        "DIVISION_ID_OWNER",
        "NOREG_SYSTEM_OWNER",
        "NOREG_SYSTEM_CUST",
        "SECURITY_CENTER",
        "APPLICATION_STATUS",
      ] as const;

      for (const k of required) {
        if (!application[k]) {
          console.log("❌ Field kosong:", k, "=>", application[k]);
          setModalErrors((prev) => ({
            ...prev,
            // map key payload -> key error di modal
            ...(k === "APPLICATION_ID"
              ? { appId: "The Application ID field is required." }
              : {}),
            ...(k === "APPLICATION_NAME"
              ? { appName: "The Application Name field is required." }
              : {}),
            ...(k === "DIVISION_ID_OWNER"
              ? { divisionOwner: "Division Owner field is required." }
              : {}),
            ...(k === "NOREG_SYSTEM_OWNER"
              ? { owner: "The System Owner field is mandatory." }
              : {}),
            ...(k === "NOREG_SYSTEM_CUST"
              ? { custodian: "The System Custodian field is required." }
              : {}),
            ...(k === "SECURITY_CENTER"
              ? { securityCenter: "Field Security Center is required." }
              : {}),
            ...(k === "APPLICATION_STATUS"
              ? { securityCenter: "Field Application Status is required." }
              : {}),
          }));
          console.log("berhenti di return");
          return;
        }
      }
      if (editingApplication) {
        // EDIT: gabungkan data lama + perubahan
        const id = editingApplication.APPLICATION_ID;

        const payload: Partial<Application> = {
          APPLICATION_NAME:
            application.APPLICATION_NAME ?? editingApplication.APPLICATION_NAME,
          DIVISION_ID_OWNER:
            application.DIVISION_ID_OWNER ??
            editingApplication.DIVISION_ID_OWNER,
          NOREG_SYSTEM_OWNER:
            application.NOREG_SYSTEM_OWNER ??
            editingApplication.NOREG_SYSTEM_OWNER,
          NOREG_SYSTEM_CUST:
            application.NOREG_SYSTEM_CUST ??
            editingApplication.NOREG_SYSTEM_CUST,
          SECURITY_CENTER:
            application.SECURITY_CENTER ?? editingApplication.SECURITY_CENTER,
          APPLICATION_STATUS:
            application.APPLICATION_STATUS ??
            editingApplication.APPLICATION_STATUS,
        };

        await editApplication(id, payload);

        // await postLogMonitoringApi({
        //   userId: currentUser?.username ?? "anonymous",
        //   module: "Application",
        //   action: AuditAction.DATA_UPDATE,
        //   status: "Success",
        //   description: `User update aplikasi name ${payload.APPLICATION_NAME}`,
        //   location: "ApplicationPage.UpdateForm",
        //   timestamp: new Date().toISOString(),
        // });
      } else {
        console.log("masuk create ga?");
        console.log("DIVISION_ID_OWNER", application.DIVISION_ID_OWNER);
        await createApplication({
          APPLICATION_ID: application.APPLICATION_ID!,
          APPLICATION_NAME: application.APPLICATION_NAME!,
          APPLICATION_STATUS: application.APPLICATION_STATUS!,
          DIVISION_ID_OWNER: application.DIVISION_ID_OWNER!,
          NOREG_SYSTEM_OWNER: application.NOREG_SYSTEM_OWNER!, // <-- perbaiki mapping
          NOREG_SYSTEM_CUST: application.NOREG_SYSTEM_CUST!,
          SECURITY_CENTER: application.SECURITY_CENTER!,
        });

        // await postLogMonitoringApi({
        //   userId: currentUser?.username ?? "anonymous",
        //   module: "Application",
        //   action: AuditAction.DATA_CREATE,
        //   status: "Success",
        //   description: `User create aplikasi name ${application.APPLICATION_NAME}`,
        //   location: "ApplicationPage.CreateForm",
        //   timestamp: new Date().toISOString(),
        // });
      }

      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
      setModalErrors({});
      closeModal();
    } catch (err) {
      const { code, message, errors } = parseApiError(err);

      // 1) Kalau BE sudah kirim errors map → pakai ini dulu
      if (errors && Object.keys(errors).length) {
        const fieldMap = {
          APPLICATION_ID: "appId",
          APPLICATION_NAME: "appName",
          DIVISION_ID_OWNER: "divisionOwner",
          NOREG_SYSTEM_OWNER: "owner",
          NOREG_SYSTEM_CUST: "custodian",
          SECURITY_CENTER: "securityCenter",
        } as const;

        const mapped: any = {};
        for (const [beField, v] of Object.entries(errors)) {
          const feKey = fieldMap[beField as keyof typeof fieldMap];
          if (feKey) mapped[feKey] = (v as any)?.message || "Invalid value";
        }
        if (Object.keys(mapped).length) {
          setModalErrors(mapped);
          return;
        }
      }

      // 2) Fallback: infer dari pesan
      const msg = message ?? "";
      const lower = msg.toLowerCase();

      // duplikasi ID
      if (
        /(application[_\s-]?id|app[\s-]?id)/i.test(msg) &&
        /exist/i.test(lower)
      ) {
        setModalErrors({ appId: message });
        return;
      }
      // duplikasi NAME
      if (
        /(application[_\s-]?name|app[\s-]?name)/i.test(msg) &&
        /exist/i.test(lower)
      ) {
        setModalErrors({ appName: message });
        return;
      }
      // owner bermasalah (sudah dipakai/invalid/not found)
      // if (/owner/i.test(lower)) {
      //   setModalErrors({ owner: message });
      //   return;
      // }

      // 3) terakhir: form-level
      setModalErrors({ form: message || "Failed to save application." });
    }
  };

  const handleOpenStatusConfirm = (app: Application) => {
    openStatusConfirmation(app);
  };

  const handleCloseStatusConfirm = () => {
    closeStatusConfirmation();
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusApplication) return;
    try {
      await toggleApplicationStatus(pendingStatusApplication);

      // await postLogMonitoringApi({
      //   userId: currentUser?.username ?? "anonymus",
      //   module: "Application",
      //   action: AuditAction.DATA_UPDATE,
      //   status: "Success",
      //   description: `User changed status of ${pendingStatusApplication.APPLICATION_NAME}`,
      //   location: "ApplicationPage.StatusChange",
      //   timestamp: new Date().toISOString(),
      // })
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }

    // const newStatus =
    //   pendingStatusApplication.APPLICATION_STATUS === "Aktif"
    //     ? "Inactive"
    //     : "Aktif";

    // const updatedApplication: Application = {
    //   ...pendingStatusApplication,
    //   APPLICATION_STATUS: newStatus,
    //   CHANGED_DT: new Date().toISOString(),
    // };

    // updateApplication(updatedApplication);
    // handleCloseStatusConfirm();
    // setShowSuccessModal(true);
    // setTimeout(() => setShowSuccessModal(false), 3000);
  };

  const enhancedApplications = useMemo(() => {
    return applications.map((app) => ({
      ...app,
      searchableFields: Object.values(app)
        .map((value) => String(value).toLowerCase())
        .join("|"),
      createdDisplay: app.CREATED_DT?.replace("T", " ").split(".")[0] ?? "",
      updatedDisplay: app.CHANGED_DT?.replace("T", " ").split(".")[0] ?? "",
    }));
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return enhancedApplications;
    }

    return enhancedApplications.filter((app) =>
      app.searchableFields.includes(term)
    );
  }, [enhancedApplications, searchTerm]);

  const totalItems = filteredApplications.length;
  const totalPages =
    totalItems === 0 ? 1 : Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    if (totalItems === 0) {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
      return;
    }

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalItems, totalPages, setCurrentPage]);

  const { paginatedApplications, startItem, endItem } = useMemo(() => {
    if (totalItems === 0) {
      return {
        paginatedApplications: [] as typeof enhancedApplications,
        startItem: 0,
        endItem: 0,
      };
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    return {
      paginatedApplications: filteredApplications.slice(startIndex, endIndex),
      startItem: startIndex + 1,
      endItem: endIndex,
    };
  }, [
    filteredApplications,
    totalItems,
    currentPage,
    itemsPerPage,
    enhancedApplications,
  ]);

  useEffect(() => {
    getApplications();
  }, [getApplications]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Application</h2>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <SearchIcon className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <AddButton onClick={handleOpenAddModal} label="+ Add" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm text-left text-gray-600">
            <thead className="bg-white text-sm text-gray-700 font-bold border-b-2 border-gray-200">
              <tr>
                <th scope="col" className="px-4 py-3 text-sm">
                  Application ID
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Application Name
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Division Owner
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  System Owner
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  System Custodian
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Security Center
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Created Date
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Last Updated
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedApplications.map((app, index) => (
                <tr
                  key={`${app.APPLICATION_ID}-${index}`}
                  className="bg-white border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-4 whitespace-nowrap text-gray-900 text-sm">
                    {app.APPLICATION_ID}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {app.APPLICATION_NAME}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {app.DIVISION_ID_OWNER}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {getNameFromNoreg(app.NOREG_SYSTEM_OWNER)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {getNameFromNoreg(app.NOREG_SYSTEM_CUST)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {app.SECURITY_CENTER}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {app.createdDisplay}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {app.updatedDisplay}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button
                      type="button"
                      onClick={() => handleOpenStatusConfirm(app)}
                      className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
                      aria-label={`Change status for ${app.APPLICATION_NAME}`}
                    >
                      <StatusPill status={app.APPLICATION_STATUS} />
                    </button>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="group relative flex justify-center">
                      <IconButton
                        onClick={() => handleOpenEditModal(app)}
                        tooltip="Edit"
                        aria-label={`Edit ${app.APPLICATION_NAME}`}
                        hoverColor="blue"
                      >
                        <EditIcon />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (!Number.isNaN(value) && value > 0) {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }
                }}
                className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 appearance-none bg-white"
                aria-label="Items per page"
              >
                <option value={10}>10 / Page</option>
                <option value={25}>25 / Page</option>
                <option value={50}>50 / Page</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <ChevronDownIcon className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span>
              Showing {totalItems === 0 ? 0 : `${startItem}-${endItem}`} of{" "}
              {totalItems}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                aria-label="Previous Page"
              >
                &lt;
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage >= totalPages}
                className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                aria-label="Next Page"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
      {isModalOpen && (
        // <AddApplicationModal
        //   onClose={handleCloseModal}
        //   onSave={handleSaveApplication}
        //   applicationToEdit={editingApplication}
        // />
        <AddApplicationModal
          onClose={() => {
            setModalErrors({});
            handleCloseModal();
          }}
          onSave={handleSaveApplication}
          applicationToEdit={editingApplication}
          externalErrors={modalErrors}
        />
      )}
      {showSuccessModal && (
        <SuccessModal onClose={() => setShowSuccessModal(false)} />
      )}
      {isStatusConfirmationOpen && pendingStatusApplication && (
        <StatusConfirmationModal
          onClose={handleCloseStatusConfirm}
          onConfirm={handleConfirmStatusChange}
          currentStatus={pendingStatusApplication.APPLICATION_STATUS}
        />
      )}
    </div>
  );
};

export default ApplicationPage;
