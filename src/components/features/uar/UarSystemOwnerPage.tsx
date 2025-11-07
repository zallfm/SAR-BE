import React, { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon } from "../../icons/ChevronDownIcon";
import { ProgressCheckIcon } from "../../icons/ProgressCheckIcon";
import StatusPill from "../StatusPill/StatusPill";
import { ActionReview } from "../../common/Button/ActionReview";
import { ActionDownload } from "../../common/Button/ActionDownload";
import SearchableDropdown from "../../common/SearchableDropdown";
import { postLogMonitoringApi } from "@/src/api/log_monitoring";
import { AuditAction } from "@/src/constants/auditActions";
import { useAuthStore } from "@/src/store/authStore";
import { useUarStore } from "@/src/store/uarStore";
import type { SystemOwnerUarHeader } from "@/src/types/uarSystemOwner";
import { formatDateTime } from "@/utils/dateFormatter";

interface UarSystemOwnerPageProps {
  onReview: (record: SystemOwnerUarHeader) => void; // <-- Gunakan tipe UarHeader
}

const UarSystemOwnerPage: React.FC<UarSystemOwnerPageProps> = ({
  onReview,
}) => {
  // --- Data dari Zustand Store ---
  const {
    systemOwnerHeaders,
    systemOwnerMeta,
    systemOwnerFilters,
    systemOwnerCurrentPage,
    systemOwnerItemsPerPage,
    isLoading,
    error,
    getSystemOwnerList,
    setSystemOwnerFilters,
    setSystemOwnerCurrentPage,
    setSystemOwnerItemsPerPage,
    selectSystemOwner, // <-- Untuk aksi review
  } = useUarStore();

  const { currentUser } = useAuthStore();

  const [ownerFilter, setOwnerFilter] = useState("");
  const [createDateFilter, setCreateDateFilter] = useState("");
  const [completedDateFilter, setCompletedDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const abortController = new AbortController();

    const extraFilters = {
      owner: ownerFilter || undefined,
      createdDate: createDateFilter || undefined,
      completedDate: completedDateFilter || undefined,
      status: statusFilter || undefined,
    };

    // Panggil action dari store
    getSystemOwnerList({ ...extraFilters, signal: abortController.signal });

    return () => {
      abortController.abort();
    };
  }, [
    getSystemOwnerList,
    systemOwnerFilters, // Filter dari store
    ownerFilter,        // Filter lokal
    createDateFilter,
    completedDateFilter,
    statusFilter,
    systemOwnerCurrentPage,
    systemOwnerItemsPerPage,
  ]);

  // --- Event Handlers ---
  const handleReviewClick = async (record: SystemOwnerUarHeader) => {
    // 1. Set record yang dipilih di store
    selectSystemOwner(record);

    // 2. Jalankan fungsi navigasi dari parent
    onReview(record);

    // 3. Kirim log monitoring
    try {
      await postLogMonitoringApi({
        userId: currentUser?.username ?? "anonymous",
        module: "UAR System Owner",
        action: AuditAction.DATA_REVIEW,
        status: "Success",
        description: `User ${currentUser?.username ?? "unknown"} reviewed UAR ${record.uarId
          }`,
        location: "UarSystemOwnerPage.handleReviewClick",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Gagal mencatat log review:", err);
    }
  };

  const handleDownloadClick = async (record: SystemOwnerUarHeader) => {
    // ... (logika download tetap sama)
    try {
      await postLogMonitoringApi({
        userId: currentUser?.username ?? "anonymous",
        module: "UAR System Owner",
        action: AuditAction.DATA_DOWNLOAD,
        status: "Success",
        description: `User ${currentUser?.username ?? "unknown"
          } downloaded UAR ${record.uarId}`,
        location: "UarSystemOwnerPage.handleDownloadClick",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Gagal mencatat log download:", err);
    }
  };

  const logFilterChange = async (key: string, value: string) => {
    // ... (logika log filter tetap sama)
    try {
      await postLogMonitoringApi({
        userId: currentUser?.username ?? "anonymous",
        module: "UAR System Owner",
        action: AuditAction.DATA_FILTER,
        status: "Success",
        description: `User ${currentUser?.username ?? "unknown"
          } filtered by ${key}: ${value}`,
        location: "UarSystemOwnerPage.filter",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Failed to log filter:", err);
    }
  };

  const overallProgress = useMemo(() => {
    const finishedCount = systemOwnerHeaders.filter((head) => head.status === "1").length;
    const totalCount = systemOwnerMeta?.total ?? 0;
    return { finishedCount, totalCount };
  }, [systemOwnerMeta, systemOwnerHeaders]);

  const paginatedRecords = systemOwnerHeaders;
  const totalItems = systemOwnerMeta?.total ?? 0;
  const totalPages = systemOwnerMeta?.totalPages ?? 1;

  const startItem = useMemo(() => {
    if (totalItems === 0 || !systemOwnerMeta) return 0;
    return (systemOwnerMeta.page - 1) * systemOwnerMeta.limit + 1;
  }, [systemOwnerMeta, totalItems]);

  const endItem = useMemo(() => {
    if (totalItems === 0 || !systemOwnerMeta) return 0;
    return Math.min(systemOwnerMeta.page * systemOwnerMeta.limit, totalItems);
  }, [systemOwnerMeta, totalItems]);


  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        UAR System Owner
      </h2>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-6">
          {/* Top Row: Period and Progress Card */}
          <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
            {/* Period Input (terhubung ke store) */}
            <div className="relative w-full max-w-sm">
              <input
                type={systemOwnerFilters.period ? "month" : "text"}
                placeholder="Period"
                value={systemOwnerFilters.period} // <-- Gunakan store value
                onChange={async (e) => {
                  const v = e.target.value;
                  setSystemOwnerFilters({ period: v }); // <-- Gunakan store action
                  if (v) await logFilterChange("period", v);
                }}
                onFocus={(e) => {
                  e.target.type = "month";
                  try { e.currentTarget.showPicker(); } catch { }
                }}
                onBlur={(e) => {
                  if (!systemOwnerFilters.period) e.target.type = "text";
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Progress Review Card */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm w-full sm:w-auto sm:max-w-[240px]">
              <p className="text-sm text-gray-500 font-medium">
                Progress Review
              </p>
              <div className="flex items-center justify-between mt-2 gap-4">
                <div>
                  <p className="text-4xl font-bold text-gray-800">{`${overallProgress.finishedCount} / ${overallProgress.totalCount}`}</p>
                  <p className="text-sm text-gray-500">Application</p>
                </div>
                <ProgressCheckIcon className="w-12 h-12 flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* Bottom Row: Other Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <SearchableDropdown
              label="UAR ID"
              value={systemOwnerFilters.uarId} // <-- Gunakan store value
              onChange={async (v) => {
                setSystemOwnerFilters({ uarId: v }); // <-- Gunakan store action
                if (v) await logFilterChange("uarId", v);
              }}
              options={[...new Set(systemOwnerHeaders.map((r) => r.uarId))]}
              placeholder="UAR ID"
            />
            <SearchableDropdown
              label="Division Owner"
              value={ownerFilter} // <-- Gunakan state lokal
              onChange={async (v) => {
                setOwnerFilter(v);
                setSystemOwnerCurrentPage(1); // <-- Reset paginasi manual
                if (v) await logFilterChange("divisionOwner", v);
              }}
              options={[...new Set(systemOwnerHeaders.map((r) => r.applicationName))]} // <-- Ganti ke applicationName
              placeholder="Application Name" // <-- Ganti ke applicationName
            />
            {/* Filter Tanggal (state lokal) */}
            <div className="relative">
              <input
                type={createDateFilter ? "date" : "text"}
                placeholder="Create Date"
                value={createDateFilter}
                onChange={async (e) => {
                  const v = e.target.value;
                  setCreateDateFilter(v);
                  setSystemOwnerCurrentPage(1); // <-- Reset paginasi manual
                  if (v) await logFilterChange("createdDate", v);
                }}
                onFocus={(e) => { e.target.type = "date"; }}
                onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="relative">
              <input
                type={completedDateFilter ? "date" : "text"}
                placeholder="Completed Date"
                value={completedDateFilter}
                onChange={async (e) => {
                  const v = e.target.value;
                  setCompletedDateFilter(v);
                  setSystemOwnerCurrentPage(1); // <-- Reset paginasi manual
                  if (v) await logFilterChange("completedDate", v);
                }}
                onFocus={(e) => { e.target.type = "date"; }}
                onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <SearchableDropdown
              label="Status"
              value={statusFilter}
              onChange={async (v) => {
                setStatusFilter(v);
                setSystemOwnerCurrentPage(1); // <-- Reset paginasi manual
                if (v) await logFilterChange("status", v);
              }}
              options={["Finished", "InProgress"]}
              searchable={false}
              placeholder="Status"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm text-left text-gray-700">
            <thead className="text-sm text-gray-800 font-bold bg-gray-50">
              <tr className="border-b-2 border-gray-200">
                {[
                  "UAR ID",
                  "Application Name", // <-- Ganti nama kolom
                  "Percent Complete",
                  "Create Date",
                  "Completed Date",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-sm">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Tampilkan error atau loading state */}
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center p-6 text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="text-center p-6 text-red-600">
                    Error: {error}
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-6 text-gray-500">
                    No records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr
                    key={`${record.uarId}-${record.applicationId}`} // <-- Key unik
                    className="bg-white border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.uarId}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {record.applicationName} {/* <-- Sesuai UarHeader */}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {record.percentComplete} {/* <-- Sesuai UarHeader */}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {formatDateTime(record.createdDate)} {/* <-- Format tanggal */}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {formatDateTime(record.completedDate)} {/* <-- Format tanggal */}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <StatusPill status={record.status === "1" ? "Finished" : "InProgress"} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <div className="group relative">
                          <ActionReview
                            onClick={() => handleReviewClick(record)}
                          />
                        </div>
                        <div className="group relative">
                          <ActionDownload
                            onClick={() => handleDownloadClick(record)}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (terhubung ke store) */}
        <div className="flex justify-between items-center mt-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={systemOwnerItemsPerPage} // <-- Gunakan store value
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (!Number.isNaN(value) && value > 0) {
                    setSystemOwnerItemsPerPage(value); // <-- Gunakan store action
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
                onClick={() =>
                  setSystemOwnerCurrentPage( // <-- Gunakan store action
                    Math.max(1, systemOwnerCurrentPage - 1)
                  )
                }
                disabled={systemOwnerCurrentPage <= 1} // <-- Gunakan store value
                className="px-2 py-1 border bg-white border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                aria-label="Previous Page"
              >
                &lt;
              </button>
              <button
                onClick={() =>
                  setSystemOwnerCurrentPage( // <-- Gunakan store action
                    Math.min(totalPages, systemOwnerCurrentPage + 1)
                  )
                }
                disabled={systemOwnerCurrentPage >= totalPages} // <-- Gunakan store value
                className="px-2 py-1 border bg-white border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                aria-label="Next Page"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UarSystemOwnerPage;