import React, { useState, useMemo, useEffect } from 'react';
import type { User } from '../../../../types';
import type { Comment } from '../../../../data'; // Keep Comment type
import { ChevronDownIcon } from '../../icons/ChevronDownIcon';
import { CommentIcon } from '../../icons/CommentIcon';
import RoleInfoModal from '../../common/Modal/RoleInfoModal';
import CommentModal from '../../common/Modal/CommentModal';
import { AuditAction } from '@/src/constants/auditActions';
import { useAuthStore } from '@/src/store/authStore';
import { postLogMonitoringApi } from '@/src/api/log_monitoring';
import { useUarStore } from '@/src/store/uarStore'; // <-- Import store
import type {
  SystemOwnerUarHeader, // <-- Use new store type for prop
  SystemOwnerUarDetailItem, // <-- Use new store type for data
  SystemOwnerBatchUpdatePayload, // <-- Use new store type for submit
} from '@/src/types/uarSystemOwner';

// 1. Updated ApprovalStatus to match reference
type ApprovalStatus = 'Approved' | 'Revoked' | null;

// 2. Updated TableData to match reference structure
type TableData = {
  ID: string; // Composite key `USERNAME-ROLE_ID`
  username: string;
  noreg: string | null;
  name: string | null;
  company: string | null;
  division: string | null;
  position: string | null;
  roleId: string;
  roleDescription: string | null;
  // Local state
  approvalStatus: ApprovalStatus;
  comments: Comment[];
};

interface UarSystemOwnerDetailPageProps {
  record: SystemOwnerUarHeader; // <-- 3. Use store type for prop
  onBack: () => void;
  user: User;
}

const UarSystemOwnerDetailPage: React.FC<UarSystemOwnerDetailPageProps> = ({
  record,
  onBack,
  user,
}) => {
  const { currentUser } = useAuthStore();

  // --- Store State & Actions ---
  const {
    systemOwnerDetails, // <-- Get data from store
    isLoading: isStoreLoading, // <-- Get loading state from store
    error: storeError, // <-- Get error state from store
    getSystemOwnerDetails,
    clearSystemOwnerDetails,
    batchUpdateSystemOwner,
  } = useUarStore();

  // --- Local Component State ---
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]); // <-- 4. Changed to string[]

  // State for modals
  const [isRoleInfoModalOpen, setIsRoleInfoModalOpen] = useState(false);
  const [selectedRoleInfo, setSelectedRoleInfo] =
    useState<SystemOwnerUarDetailItem | null>(null); // <-- 5. Use store type

  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentTarget, setCommentTarget] = useState<TableData | null>(null);

  // Local Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- Data Fetching & Mapping ---

  // 6. Fetch data from store on mount
  useEffect(() => {
    if (record.uarId && record.applicationId) {
      const abortController = new AbortController();
      console.log("TEST")
      getSystemOwnerDetails(
        record.uarId,
        record.applicationId,
        abortController.signal
      );
    }
  }, [record.uarId, record.applicationId, getSystemOwnerDetails]);

  // 7. Populate local tableData when store's systemOwnerDetails changes
  useEffect(() => {
    const initialData: TableData[] = systemOwnerDetails.map(
      (item: SystemOwnerUarDetailItem) => {
        const uniqueId = `${item.USERNAME}-${item.ROLE_ID}`; // Create composite key

        return {
          ID: uniqueId,
          username: item.USERNAME,
          noreg: item.NOREG,
          name: item.NAME,
          company: item.COMPANY_NAME,
          division: item.DIVISION_NAME,
          position: item.POSITION_NAME,
          roleId: item.ROLE_ID,
          roleDescription: item.ROLE_NAME,
          // Map API status to local state
          approvalStatus:
            item.SO_APPROVAL_STATUS === '0'
              ? null
              : item.SO_APPROVAL_STATUS === '1'
                ? 'Approved'
                : 'Revoked',
          comments: [], // Comments are managed locally
        };
      }
    );
    setTableData(initialData);
    setSelectedRows([]); // Reset selection
    setCurrentPage(1); // Reset pagination
  }, [systemOwnerDetails]);

  // --- Event Handlers ---

  const handleRowApprovalChange = (id: string, status: ApprovalStatus) => {
    setTableData((prev) =>
      prev.map((row) => (row.ID === id ? { ...row, approvalStatus: status } : row))
    );

    // Logging logic can stay
    const action =
      status === 'Approved' ? AuditAction.DATA_KEEP : AuditAction.DATA_REVOKE;

  };

  const handleBulkAction = (status: ApprovalStatus) => {
    if (selectedRows.length === 0) return;

    // Just update local UI state (per reference)
    setTableData((prev) =>
      prev.map((row) =>
        selectedRows.includes(row.ID)
          ? { ...row, approvalStatus: status }
          : row
      )
    );
    setSelectedRows([]); // Clear selection

    // Logging logic can stay
    const action =
      status === 'Approved'
        ? AuditAction.DATA_KEEP_ALL
        : AuditAction.DATA_REVOKE_ALL;

  };

  const handleBackClick = () => {
    clearSystemOwnerDetails(); // <-- 8. Clean up store state
    onBack();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(currentData.map((d) => d.ID));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string) => { // <-- 9. ID is string
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleRoleInfoClick = (row: TableData) => {
    // Find the original API item to pass to the modal (per reference)
    const originalItem = systemOwnerDetails.find(
      (item) =>
        item.USERNAME === row.username && item.ROLE_ID === row.roleId
    );
    if (originalItem) {
      setSelectedRoleInfo(originalItem);
      setIsRoleInfoModalOpen(true);
    }
  };

  const handleOpenCommentModal = async (row: TableData) => {
    setCommentTarget(row);
    setIsRoleInfoModalOpen(true);
    // Logging logic can stay
    try {

    } catch (err) {
      console.warn('Gagal mencatat log buka comment:', err);
    }
  };

  const handleCloseCommentModal = () => {
    setCommentTarget(null);
    setIsCommentModalOpen(false);
  };

  const handleSubmitComment = async (newCommentText: string) => {
    if (commentTarget) {
      const newComment: Comment = {
        user: `${user.name} (${user.role})`,
        text: newCommentText,
        timestamp: new Date(),
      };

      setTableData((prev) =>
        prev.map((row) =>
          row.ID === commentTarget.ID
            ? { ...row, comments: [...(row.comments || []), newComment] }
            : row
        )
      );
      // Logging logic can stay
      try {

      } catch (err) {
        console.warn('Gagal mencatat log submit comment:', err);
      }
    }
    handleCloseCommentModal();
  };

  // --- Utility Functions ---

  // --- Pagination (Derived from local state) ---
  const totalItems = tableData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  // 10. Added safeCurrentPage logic from reference
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const { currentData, startItem, endItem } = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const paginatedData = tableData.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    return {
      currentData: paginatedData,
      startItem: totalItems > 0 ? startIndex + 1 : 0,
      endItem: Math.min(startIndex + itemsPerPage, totalItems),
    };
  }, [tableData, safeCurrentPage, itemsPerPage, totalItems]);

  const isAllSelectedOnPage =
    currentData.length > 0 &&
    currentData.every((d) => selectedRows.includes(d.ID));

  // --- Render ---
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">UAR System Owner</h2>
        <div className="text-sm text-gray-500 mt-1 flex items-center flex-wrap">
          <button
            onClick={handleBackClick} // <-- 11. Use new handler
            className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
            aria-label="Back to UAR System Owner list"
          >
            UAR System Owner
          </button>
          <span className="mx-2">&gt;</span>
          <span className="text-gray-700 font-medium">{record.uarId}</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleBulkAction('Approved')}
              disabled={selectedRows.length === 0 || isStoreLoading} // <-- 12. Add loading state
              className="px-6 py-2 text-sm font-semibold text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              Keep
            </button>
            <button
              onClick={() => handleBulkAction('Revoked')}
              disabled={selectedRows.length === 0 || isStoreLoading} // <-- 12. Add loading state
              className="px-6 py-2 text-sm font-semibold text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              Revoke
            </button>
          </div>
          <button
            onClick={async () => {
              const changedItems = tableData
                .filter((row) => row.approvalStatus !== null)
                .map((row) => ({
                  username: row.username,
                  roleId: row.roleId,
                  decision: row.approvalStatus!, // 'Approved' or 'Revoked'
                }));


              const payload: SystemOwnerBatchUpdatePayload = {
                source: record.source as 'SYSTEM_OWNER' | 'DIVISION_USER',
                uarId: record.uarId,
                applicationId: record.applicationId,
                items: changedItems,
              };

              // Call the store action
              const { error } = await batchUpdateSystemOwner(payload);



            }}
            disabled={isStoreLoading} // <-- 12. Add loading state
            className="px-8 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isStoreLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-sm text-left text-gray-700">
            <thead className="text-sm text-black font-bold">
              <tr className="border-b-2 border-gray-200">
                <th scope="col" className="px-4 py-3 w-12 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={isAllSelectedOnPage}
                    onChange={handleSelectAll}
                    aria-label="Select all rows on this page"
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Username
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  NOREG
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Company
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Division
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Position
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Role ID
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Role Description
                </th>
                <th scope="col" className="px-4 py-3 text-center w-48 text-sm">
                  Approval
                </th>
                <th scope="col" className="px-4 py-3 text-sm">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {/* --- 14. Handle Store Loading/Error States --- */}
              {isStoreLoading ? (
                <tr>
                  <td colSpan={11} className="text-center p-6 text-gray-500">
                    Loading details...
                  </td>
                </tr>
              ) : storeError ? (
                <tr>
                  <td colSpan={11} className="text-center p-6 text-red-600">
                    Error: {storeError}
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center p-6 text-gray-500">
                    No details found for this UAR.
                  </td>
                </tr>
              ) : (
                // --- Render Table Rows ---
                currentData.map((row) => (
                  <tr
                    key={row.ID}
                    className="bg-white border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedRows.includes(row.ID)}
                        onChange={() => handleSelectRow(row.ID)} // <-- ID is string
                        aria-label={`Select row ${row.ID}`}
                      />
                    </td>
                    <td className="px-4 py-2 text-sm">{row.username}</td>
                    <td className="px-4 py-2 text-sm">{row.noreg}</td>
                    <td className="px-4 py-2 text-sm">{row.name}</td>
                    <td className="px-4 py-2 text-sm">{row.company}</td>
                    <td className="px-4 py-2 text-sm">{row.division}</td>
                    <td className="px-4 py-2 text-sm">{row.position}</td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => handleRoleInfoClick(row)}
                        className="text-blue-600 hover:underline cursor-pointer"
                      >
                        {row.roleId}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {row.roleDescription}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            handleRowApprovalChange(row.ID, 'Approved') // <-- ID is string
                          }
                          className={`px-3 py-1 text-xs font-semibold rounded-md min-w-[70px] transition-colors ${ // <-- 15. Matched button style from reference
                            row.approvalStatus === 'Approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-white text-gray-500 border border-gray-300 hover:bg-gray-100'
                            }`}
                        >
                          Keep
                        </button>
                        <button
                          onClick={() =>
                            handleRowApprovalChange(row.ID, 'Revoked') // <-- ID is string
                          }
                          className={`px-3 py-1 text-xs font-semibold rounded-md min-w-[70px] transition-colors ${ // <-- 15. Matched button style from reference
                            row.approvalStatus === 'Revoked'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-white text-gray-500 border border-gray-300 hover:bg-gray-100'
                            }`}
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <div className="group relative flex justify-center">
                        <button
                          onClick={() => handleOpenCommentModal(row)}
                          className={
                            row.comments && row.comments.length > 0
                              ? 'text-blue-600 hover:text-blue-800'
                              : 'text-gray-400 hover:text-blue-600'
                          }
                        >
                          <CommentIcon />
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-blue-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {row.comments && row.comments.length > 0
                            ? 'View Comments'
                            : 'Add Comment'}
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
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
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
              Showing {startItem}-{endItem} of {totalItems}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={safeCurrentPage === 1} // <-- Use safeCurrentPage
                className="px-2 py-1 border bg-white border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                aria-label="Previous Page"
              >
                &lt;
              </button>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={safeCurrentPage >= totalPages} // <-- Use safeCurrentPage
                className="px-2 py-1 border bg-white border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                aria-label="Next Page"
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
          // @ts-expect-error // TODO: fix this type
          roleInfo={selectedRoleInfo}
        />
      )}

      {isCommentModalOpen && commentTarget && (
        <CommentModal
          onClose={handleCloseCommentModal}
          onSubmit={handleSubmitComment}
          targetUser={"Hesti"}
          commentingUser={`${user.name} (${user.role})`}
          comments={commentTarget.comments || []}
        />
      )}
    </div>
  );
};

export default UarSystemOwnerDetailPage;