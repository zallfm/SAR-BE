import React, { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon } from "../../icons/ChevronDownIcon";
import { ProgressCheckIcon } from "../../icons/ProgressCheckIcon";
import StatusPill from "../StatusPill/StatusPill";
import { ActionReview } from "../../common/Button/ActionReview";
import { ActionDownload } from "../../common/Button/ActionDownload";
import SearchableDropdown from "../../common/SearchableDropdown";
import { useAuthStore } from "@/src/store/authStore";
import { postLogMonitoringApi } from "@/src/api/log_monitoring";
import { AuditAction } from "@/src/constants/auditActions";
import { useUarStore } from "@/src/store/uarStore";
import type { UarHeader } from "@/src/types/uarDivision";
import { formatDateTime } from "@/utils/dateFormatter";

interface UarDivisionUserPageProps {
  onReview: (record: UarHeader) => void; // <-- Use UarHeader type
}

const UarDivisionUserPage: React.FC<UarDivisionUserPageProps> = ({
  onReview,
}) => {
  const {
    divisionUserHeaders,
    divisionUserMeta,
    divisionUserFilters,
    divisionUserCurrentPage,
    divisionUserItemsPerPage,
    isLoading,
    error,
    getUarList,
    setDivisionUserFilters,
    setDivisionUserCurrentPage,
    setDivisionUserItemsPerPage,
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

    getUarList({ ...extraFilters, signal: abortController.signal });

    return () => {
      abortController.abort();
    };
  }, [
    getUarList,
    divisionUserFilters,
    ownerFilter,
    createDateFilter,
    completedDateFilter,
    statusFilter,
    divisionUserCurrentPage,
    divisionUserItemsPerPage,
  ]);

  // --- Event Handlers ---
  const handleReviewClick = async (record: UarHeader) => {
    // 1️⃣ Jalankan fungsi review yang dikirim dari parent
    onReview(record);


  };

  const handleDownloadClick = async (record: UarHeader) => {

  };

  const logFilterChange = async (key: string, value: string) => {
    try {
      await postLogMonitoringApi({
        userId: currentUser?.username ?? "anonymous",
        module: "UAR Division User",
        action: AuditAction.DATA_FILTER,
        status: "Success",
        description: `User ${currentUser?.username ?? "unknown"
          } filtered by ${key}: ${value}`,
        location: "UarDivisionUserPage.filter",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Failed to log filter:", err);
    }
  };

  const overallProgress = useMemo(() => {
    const finishedCount = divisionUserHeaders.filter((head) => head.status === "1").length;

    const totalCount = divisionUserMeta?.total ?? 0;

    return { finishedCount, totalCount };
  }, [divisionUserMeta, divisionUserHeaders]);

  // Pagination data is now sourced from the store and its metadata
  const paginatedRecords = divisionUserHeaders;
  const totalItems = divisionUserMeta?.total ?? 0;
  const totalPages = divisionUserMeta?.totalPages ?? 1;

  const startItem = useMemo(() => {
    if (totalItems === 0 || !divisionUserMeta) return 0;
    console.log("divuserData", divisionUserMeta)
    return (divisionUserMeta.page - 1) * divisionUserMeta.limit + 1;
  }, [divisionUserMeta, totalItems]);

  const endItem = useMemo(() => {
    if (totalItems === 0 || !divisionUserMeta) return 0;
    return Math.min(divisionUserMeta.page * divisionUserMeta.limit, totalItems);
  }, [divisionUserMeta, totalItems]);

  // 🔧 helper: (This helper is no longer used by the component's filters,
  // but might be used by other parts, so it's safe to keep.)


  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        UAR Division User
      </h2>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-6">
          {/* Top Row: Period and Progress Card */}
          <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
            {/* Period Input */}
            <div className="relative w-full max-w-sm">
              <input
                type={divisionUserFilters.period ? "month" : "text"}
                placeholder="Period"
                value={divisionUserFilters.period} // <-- Use store value
                onChange={async (e) => {
                  const v = e.target.value;
                  // Use store action; this also resets page to 1
                  setDivisionUserFilters({ period: v });
                  if (v) await logFilterChange("period", v);
                }}
                onFocus={(e) => {
                  e.target.type = "month";
                  try {
                    e.currentTarget.showPicker();
                  } catch (e) {
                    /* ignore */
                  }
                }}
                onBlur={(e) => {
                  // <-- Use store value
                  if (!divisionUserFilters.period) e.target.type = "text";
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              value={divisionUserFilters.uarId} // <-- Use store value
              options={[...new Set(divisionUserHeaders.map((uar) => uar.uarId))]}
              onChange={async (v) => {
                // Use store action; this also resets page to 1
                setDivisionUserFilters({ uarId: v });
                if (v) await logFilterChange("uarId", v);
              }}
              // options removed - data is no longer local
              placeholder="UAR ID"
            />
            <SearchableDropdown
              label="Division Owner"
              value={ownerFilter} // <-- Use local value
              options={[...new Set(divisionUserHeaders.map((uar) => uar.divisionOwner))]}

              onChange={async (v) => {
                setOwnerFilter(v);
                setDivisionUserCurrentPage(1); // <-- Manually reset page
                if (v) await logFilterChange("divisionOwner", v);
              }}
              // options removed - data is no longer local
              placeholder="Division Owner"
            />
            <div className="relative">
              <input
                type={createDateFilter ? "date" : "text"}
                placeholder="Create Date"
                value={createDateFilter} // <-- Use local value
                onChange={async (e) => {
                  const v = e.target.value;
                  setCreateDateFilter(v);
                  setDivisionUserCurrentPage(1); // <-- Manually reset page
                  if (v) await logFilterChange("createdDate", v);
                }}
                onFocus={(e) => {
                  e.target.type = "date";
                }}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = "text";
                }}
                className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="relative">
              <input
                type={completedDateFilter ? "date" : "text"}
                placeholder="Completed Date"
                value={completedDateFilter} // <-- Use local value
                onChange={async (e) => {
                  const v = e.target.value;
                  setCompletedDateFilter(v);
                  setDivisionUserCurrentPage(1); // <-- Manually reset page
                  if (v) await logFilterChange("completedDate", v);
                }}
                onFocus={(e) => {
                  e.target.type = "date";
                }}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = "text";
                }}
                className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <SearchableDropdown
              label="Status"
              value={statusFilter} // <-- Use local value
              onChange={async (v) => {
                setStatusFilter(v);
                setDivisionUserCurrentPage(1); // <-- Manually reset page
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
                  "Division Owner",
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
              {error ? (
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
                    key={record.uarId} // Assuming UarHeader has an 'ID' property
                    className="bg-white border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-gray-900 text-sm">
                      {record.uarId}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {record.divisionOwner}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {record.percentComplete}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {formatDateTime(record.createdDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {formatDateTime(record.completedDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <StatusPill status={record.status === "1" ? "Finished" : "InProgress"} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <div className="group relative">
                          {/* Button Review */}
                          <ActionReview
                            onClick={() => handleReviewClick(record)}
                          />
                        </div>
                        <div className="group relative">
                          {/* Button download */}
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

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={divisionUserItemsPerPage}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (!Number.isNaN(value) && value > 0) {
                    setDivisionUserItemsPerPage(value);
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
              {/* Use derived pagination values */}
              Showing {totalItems === 0 ? 0 : `${startItem}-${endItem}`} of{" "}
              {totalItems}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setDivisionUserCurrentPage(
                    Math.max(1, divisionUserCurrentPage - 1)
                  )
                }
                disabled={divisionUserCurrentPage <= 1}
                className="px-2 py-1 border bg-white border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                aria-label="Previous Page"
              >
                &lt;
              </button>
              <button
                onClick={() =>
                  // Use store action and value
                  setDivisionUserCurrentPage(
                    Math.min(totalPages, divisionUserCurrentPage + 1)
                  )
                }
                disabled={divisionUserCurrentPage >= totalPages}
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

export default UarDivisionUserPage;