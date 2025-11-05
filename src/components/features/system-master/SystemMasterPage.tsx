import React, { useState, useMemo } from "react";
import type { User } from "../../../../types";
import { SearchIcon } from "../../icons/SearchIcon";
import { ChevronDownIcon } from "../../icons/ChevronDownIcon";
import { EditIcon } from "../../icons/EditIcon";
import { DeleteIcon } from "../../icons/DeleteIcon";
import SystemMasterModal from "../../common/Modal/SystemMasterModal";
import ConfirmationModal from "../../common/Modal/ConfirmationModal";
import InfoModal from "../../common/Modal/InfoModal";
import { AddButton } from "../../common/Button/AddButton";
import { IconButton } from "../../common/Button/IconButton";
import SearchableDropdown from "../../common/SearchableDropdown";
import {
  useSystemMasterFilters,
  useSystemMasterPagination,
  useSystemMasterActions,
  useSystemMasterRecords,
  useFilteredSystemMasterRecords,
} from "../../../hooks/useStoreSelectors";
import { useAuthStore } from "@/src/store/authStore";
// import { postLogMonitoringApi } from "@/src/api/log_monitoring";
import { AuditAction } from "@/src/constants/auditActions";
import { SystemMaster } from "@/src/types/systemMaster";
import { useSystemMasterStore } from "@/src/store/systemMasterStore";
import { formatDate, formatDateTime } from "@/utils/dateFormatter";

interface SystemMasterPageProps {
  user: User;
}

const SystemMasterPage: React.FC<SystemMasterPageProps> = ({ user }) => {
  // Zustand store hooks
  const records = useSystemMasterRecords();
  const storeFilteredRecords = useFilteredSystemMasterRecords();
  const { filters, setFilters } = useSystemMasterFilters();
  const meta = useSystemMasterStore((state) => state.meta);
  const getSystemMasters = useSystemMasterStore(
    (state) => state.getSystemMasters
  );

  const {
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    getTotalPages,
    getCurrentPageRecords,
  } = useSystemMasterPagination();
  const {
    setFilteredRecords,
    addSystemMasterRecord,
    updateSystemMasterRecord,
    deleteSystemMasterRecord,
  } = useSystemMasterActions();

  // 🧩 Current user from Auth store
  const { currentUser } = useAuthStore();

  // Local state for UI interactions
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SystemMaster | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<SystemMaster | null>(
    null
  );

  const [infoMessage, setInfoMessage] = useState("");
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const systemTypes = useMemo(
    () => [...new Set(records.map((r) => r.SYSTEM_TYPE))],
    [records]
  );

  React.useEffect(() => {
    const controller = new AbortController();
    getSystemMasters({
      systemType: '',
      systemCode: '', signal: controller.signal
    });
    return () => {
      controller.abort();
    };
  }, [getSystemMasters, filters, currentPage, itemsPerPage]);

  const totalPages = getTotalPages();
  const totalItems = meta?.total ?? 0;
  const currentRecords = getCurrentPageRecords();
  const startItem =
    currentRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: SystemMaster) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleSaveRecord = async (
    record: Omit<
      SystemMaster,
      "CREATED_BY" | "CHANGED_BY" | "CREATED_DT" | "CHANGED_DT"
    >
  ) => {
    const username = currentUser?.username ?? "anonymous";
    if (editingRecord) {
      const status = await updateSystemMasterRecord(record.SYSTEM_CD, record);
      if (status.error === undefined) {
        setInfoMessage("Save Successfully");
        setIsInfoOpen(true);

        // await postLogMonitoringApi({
        //   userId: username,
        //   module: "SystemMaster",
        //   action: AuditAction.DATA_UPDATE,
        //   status: "Success",
        //   description: `User ${username} updated SystemMaster record ${record.SYSTEM_CD}`,
        //   location: "SystemMasterPage.handleSaveRecord",
        //   timestamp: new Date().toISOString(),
        // });
      } else {
        setInfoMessage(
          `Error: ${status.error.message} Code: ${status.error.code ?? ""}`
        );
        setIsInfoOpen(true);

        // await postLogMonitoringApi({
        //   userId: username,
        //   module: "SystemMaster",
        //   action: AuditAction.DATA_UPDATE,
        //   status: "Error",
        //   description: `Failed to update SystemMaster record ${record.SYSTEM_CD}: ${status.error}`,
        //   location: "SystemMasterPage.handleSaveRecord",
        //   timestamp: new Date().toISOString(),
        // });
      }
    } else {
      const status = await addSystemMasterRecord(record);
      if (status.error === undefined) {
        setInfoMessage("Save Successfully");
        setIsInfoOpen(true);

        // await postLogMonitoringApi({
        //   userId: username,
        //   module: "SystemMaster",
        //   action: AuditAction.DATA_CREATE,
        //   status: "Success",
        //   description: `User ${username} added new SystemMaster record ${record.SYSTEM_CD}`,
        //   location: "SystemMasterPage.handleSaveRecord",
        //   timestamp: new Date().toISOString(),
        // });
      } else {
        setInfoMessage(
          `Error: ${status.error.message} Code: ${status.error.code ?? ""}`
        );
        setIsInfoOpen(true);

        // await postLogMonitoringApi({
        //   userId: username,
        //   module: "SystemMaster",
        //   action: AuditAction.DATA_CREATE,
        //   status: "Error",
        //   description: `Failed to add new SystemMaster record ${record.SYSTEM_CD}: ${status.error}`,
        //   location: "SystemMasterPage.handleSaveRecord",
        //   timestamp: new Date().toISOString(),
        // });
      }
    }
    handleCloseModal();
  };

  const handleOpenDeleteConfirm = (record: SystemMaster) => {
    setRecordToDelete(record);
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setRecordToDelete(null);
    setIsDeleteConfirmOpen(false);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    const username = currentUser?.username ?? "anonymous";
    const compoundId = {
      SYSTEM_TYPE: recordToDelete.SYSTEM_TYPE,
      SYSTEM_CD: recordToDelete.SYSTEM_CD,
      VALID_FROM_DT: recordToDelete.VALID_FROM_DT,
    };
    await deleteSystemMasterRecord(compoundId);
    handleCloseDeleteConfirm();

    // 🧩 Log Delete
    try {
      // await postLogMonitoringApi({
      //   userId: username,
      //   module: "SystemMaster",
      //   action: AuditAction.DATA_DELETE,
      //   status: "Success",
      //   description: `User ${username} deleted SystemMaster record ${recordToDelete.SYSTEM_CD}`,
      //   location: "SystemMasterPage.handleDeleteRecord",
      //   timestamp: new Date().toISOString(),
      // });
    } catch (err) {
      console.warn("Failed to log delete:", err);
    }
  };

  const handleFilterChange = async (
    key: keyof typeof filters,
    value: string
  ) => {
    setFilters({ [key]: value });

    const username = currentUser?.username ?? "anonymous";

    if (value.trim() !== "") {
      try {
        // await postLogMonitoringApi({
        //   userId: username,
        //   module: "SystemMaster",
        //   action: AuditAction.DATA_FILTER,
        //   status: "Success",
        //   description: `User ${username} filtered SystemMaster by ${key}: ${value}`,
        //   location: "SystemMasterPage.handleFilterChange",
        //   timestamp: new Date().toISOString(),
        // });
      } catch (err) {
        console.warn("Failed to log filter action:", err);
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">System Master</h2>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <SearchableDropdown
              label="System Type"
              value={filters.systemType}
              onChange={(value) => handleFilterChange("systemType", value)}
              options={systemTypes}
              placeholder="System Type"
              className="w-full sm:w-40"
            />
            <SearchableDropdown
              label="System Code"
              value={filters.systemCode}
              onChange={(value) => handleFilterChange("systemCode", value)}
              options={[...new Set(records.map((r) => r.SYSTEM_CD))].sort()}
              placeholder="System Code"
              className="w-full sm:w-40"
            />
          </div>
          <AddButton onClick={handleOpenAddModal} label="+ Add" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm text-left text-gray-600">
            <thead className="text-sm font-bold text-gray-700 bg-gray-50">
              <tr>
                {[
                  "System Type",
                  "System Code",
                  "Valid From",
                  "Valid To",
                  "System Value Text",
                  "System Value Num",
                  "System Value Time",
                  "Created By",
                  "Created Date",
                  "Changed By",
                  "Changed Date",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-3 border-b text-sm whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((record) => (
                <tr
                  key={record.SYSTEM_CD}
                  className="bg-white border-b hover:bg-gray-50"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {record.SYSTEM_TYPE}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {record.SYSTEM_CD}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {formatDate(record.VALID_FROM_DT)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {formatDate(record.VALID_TO_DT)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {record.VALUE_TEXT}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {record.VALUE_NUM}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {record.VALUE_TIME}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {record.CREATED_BY}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {formatDateTime(record.CREATED_DT)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {record.CHANGED_BY ? record.CHANGED_BY : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {formatDateTime(record.CHANGED_DT ?? "")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-4">
                      <div className="group relative">
                        {/* <button onClick={() => handleOpenEditModal(record)} className="text-gray-500 hover:text-blue-600 text-sm" aria-label={`Edit ${record.systemCode}`}><EditIcon /></button>
                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-blue-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                    Edit
                                                </div> */}
                        <IconButton
                          onClick={() => handleOpenEditModal(record)}
                          tooltip="Edit"
                          aria-label={`Edit ${record.SYSTEM_CD}`}
                          hoverColor="blue"
                        >
                          <EditIcon />
                        </IconButton>
                      </div>
                      <div className="group relative">
                        {/* <button
                          onClick={() => handleOpenDeleteConfirm(record)}
                          className="text-gray-500 hover:text-red-600 text-sm"
                          aria-label={`Delete ${record.systemCode}`}
                        >
                          <DeleteIcon />
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-blue-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Delete
                        </div> */}
                        <IconButton
                          onClick={() => handleOpenDeleteConfirm(record)}
                          tooltip="Delete"
                          aria-label={`Delete ${record.SYSTEM_CD}`}
                          hoverColor="red"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </div>
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
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 appearance-none bg-white"
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
              Showing {startItem}-{endItem} of {totalItems}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border bg-white border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &lt;
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 border bg-white border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <SystemMasterModal
          onClose={handleCloseModal}
          onSave={handleSaveRecord}
          recordToEdit={editingRecord}
          user={user}
        />
      )}
      {isDeleteConfirmOpen && (
        <ConfirmationModal
          onClose={handleCloseDeleteConfirm}
          onConfirm={handleDeleteRecord}
          title="Delete Confirmation"
          message="Do you want to Submit?"
        />
      )}
      {isInfoOpen && (
        <InfoModal
          onClose={() => setIsInfoOpen(false)}
          title="Information"
          message={infoMessage}
        />
      )}
    </div>
  );
};

export default SystemMasterPage;
