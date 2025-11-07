import React, { useState, useMemo } from "react";
import { initialUarLatestRoles, roleInformationData } from "../../../../data";
import type { UarLatestRole } from "../../../../data";
import { ChevronDownIcon } from "../../icons/ChevronDownIcon";
import RoleInfoModal from "../../common/Modal/RoleInfoModal";
import { DownloadButton } from "../../common/Button/DownloadButton";
import SearchableDropdown from "../../common/SearchableDropdown";

import * as XLSX from "xlsx";
import { useAuthStore } from "@/src/store/authStore";
import { AuditAction } from "@/src/constants/auditActions";

const UarLatestRolePage: React.FC = () => {
  const [roles] = useState<UarLatestRole[]>(initialUarLatestRoles);
  const [appIdFilter, setAppIdFilter] = useState("");
  const [systemIdFilter, setSystemIdFilter] = useState(""); // Assuming Role ID is System ID
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isRoleInfoModalOpen, setIsRoleInfoModalOpen] = useState(false);
  const [selectedRoleInfo, setSelectedRoleInfo] =
    useState<UarLatestRole | null>(null);

  const { currentUser } = useAuthStore();

  const applicationIds = useMemo(
    () => [...new Set(roles.map((r) => r.applicationId))],
    [roles]
  );
  const systemIds = useMemo(
    () => [...new Set(roles.map((r) => r.roleId))],
    [roles]
  );

  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const appIdMatch = appIdFilter
        ? role.applicationId === appIdFilter
        : true;
      const systemIdMatch = systemIdFilter
        ? role.roleId === systemIdFilter
        : true;
      return appIdMatch && systemIdMatch;
    });
  }, [roles, appIdFilter, systemIdFilter]);

  const currentRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRoles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRoles, currentPage, itemsPerPage]);

  const totalItems = filteredRoles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handleRoleInfoClick = (role: UarLatestRole) => {
    setSelectedRoleInfo(role);
    setIsRoleInfoModalOpen(true);
  };

  const handleDownload =async () => {
    if (!filteredRoles.length) {
      alert("No data available to download.");
      return;
    }

    const now = new Date();
    const dateStamp = `${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const fileName = `UAR_Latest_Role_${dateStamp}.xlsx`;

    const headers = [
      "Application ID",
      "Username",
      "NOREG",
      "Name",
      "Role ID",
      "Role Description",
      "Division",
      "Departement",
      "Position",
    ];

    const dataToExport = filteredRoles.map((role) => [
      role.applicationId,
      role.username,
      role.noreg,
      role.name,
      role.roleId,
      role.roleDescription,
      role.division,
      role.department,
      role.position,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Latest Roles");
    XLSX.writeFile(workbook, fileName);

    try {
  
    } catch (err) {
      console.warn("Failed to log download:", err);
    }
  };

  const logFilterChange = async (key: string, value: string) => {
    try {
    
    } catch (err) {
      console.warn("Failed to log filter:", err);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">UAR Latest Role</h2>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <SearchableDropdown
              label="Application ID"
              value={appIdFilter}
              onChange={async (v) => {
                setAppIdFilter(v);
                setCurrentPage(1);
                if (v) await logFilterChange("applicationId", v);
              }}
              options={applicationIds}
              searchable={false}
              placeholder="Application ID"
              className="w-full sm:w-40"
            />

            <SearchableDropdown
              label="System ID"
              value={systemIdFilter}
              onChange={async (v) => {
                setSystemIdFilter(v);
                setCurrentPage(1);
                if (v) await logFilterChange("systemId", v);
              }}
              options={systemIds}
              searchable={false}
              placeholder="System ID"
              className="w-full sm:w-40"
            />
          </div>
          <DownloadButton
            style={{ paddingLeft: "24px", paddingRight: "24px" }}
            className="bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors"
            onClick={handleDownload}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-sm text-left text-gray-600">
            <thead className="text-sm font-bold text-gray-700 bg-gray-50">
              <tr>
                {[
                  "Application ID",
                  "Username",
                  "NOREG",
                  "Name",
                  "Role ID",
                  "Role Description",
                  "Division",
                  "Departement",
                  "Position",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-3 border-b text-sm"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentRoles.map((role) => (
                <tr
                  key={role.ID}
                  className="bg-white border-b hover:bg-gray-50"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {role.applicationId}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {role.username}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {role.noreg}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {role.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleRoleInfoClick(role)}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      {role.roleId}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {role.roleDescription}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {role.division}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {role.department}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {role.position}
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
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border bg-white border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &lt;
              </button>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 border bg-white border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
      {isRoleInfoModalOpen && selectedRoleInfo && (
        <RoleInfoModal
          onClose={() => setIsRoleInfoModalOpen(false)}
          roleInfo={selectedRoleInfo}
        />
      )}
    </div>
  );
};

export default UarLatestRolePage;
