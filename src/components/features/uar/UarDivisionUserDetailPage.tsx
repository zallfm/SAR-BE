import React, { useState, useEffect, useMemo } from 'react';
import type { User } from '../../../../types';
import type { Comment } from '../../../../data'; // Keep Comment type
import { ChevronDownIcon } from '../../icons/ChevronDownIcon';
import { CommentIcon } from '../../icons/CommentIcon';
import CommentModal from '../../common/Modal/CommentModal';
import RoleInfoModal from '../../common/Modal/RoleInfoModal';
import { useAuthStore } from '@/src/store/authStore';
import { postLogMonitoringApi } from '@/src/api/log_monitoring';
import { AuditAction } from '@/src/constants/auditActions';
import { useUarStore } from '@/src/store/uarStore';
import type {
    UarHeader,
    UarDetailItem, // <-- From new types
    BatchUpdatePayload, // <-- From new types
} from '@/src/types/uarDivision';

type ApprovalStatus = 'Approved' | 'Revoked' | null;

type TableData = {
    ID: string; // Will be composite key `USERNAME-ROLE_ID`
    username: string;
    noreg: string | null;
    name: string | null;
    roleId: string;
    roleDescription: string | null; // <-- Mapped from APPLICATION_ID
    // Local state
    approvalStatus: ApprovalStatus;
    comments: Comment[];
};

interface UarDivisionUserDetailPageProps {
    uarHeader: UarHeader;
    onBack: () => void;
    user: User;
}

const UarDivisionUserDetailPage: React.FC<UarDivisionUserDetailPageProps> = ({
    uarHeader,
    onBack,
    user,
}) => {
    const { currentUser } = useAuthStore();

    // --- Store State & Actions ---
    const {
        divisionUserDetails, // This will be UarDetailItem[]
        isLoading: isStoreLoading,
        error: storeError,
        getUarDetails,
        clearUarDetails,
        batchUpdate,
    } = useUarStore();

    // --- Local Component State ---
    const [tableData, setTableData] = useState<TableData[]>([]);
    const [selectedRows, setSelectedRows] = useState<string[]>([]); // <-- Use string for new ID

    // State for modals
    const [isRoleInfoModalOpen, setIsRoleInfoModalOpen] = useState(false);
    const [selectedRoleInfo, setSelectedRoleInfo] =
        useState<UarDetailItem | null>(null); // <-- Store the original API item
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [commentTarget, setCommentTarget] = useState<TableData | null>(null);

    // Local Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // --- Data Fetching & Mapping ---
    useEffect(() => {
        // 1. Fetch details
        if (uarHeader.uarId) {
            const abortController = new AbortController();
            getUarDetails(uarHeader.uarId, abortController.signal);
        }
    }, [uarHeader.uarId, getUarDetails]);

    // 2. Populate local tableData when store's divisionUserDetails changes
    useEffect(() => {
        // Map API response (UarDetailItem) to local state (TableData)
        const initialData: TableData[] = divisionUserDetails.map(
            (item: UarDetailItem) => {
                const uniqueId = `${item.USERNAME}-${item.ROLE_ID}`; // Create composite key

                return {
                    ID: uniqueId,
                    username: item.USERNAME,
                    noreg: item.NOREG,
                    name: item.NAME,
                    roleId: item.ROLE_ID,
                    roleDescription: item.APPLICATION_ID, // <-- Map APPLICATION_ID
                    approvalStatus:
                        item.DIV_APPROVAL_STATUS === "0" ? null : item.DIV_APPROVAL_STATUS === "1" ? "Approved" : "Revoked",
                    comments: [], // Comments are managed locally
                };
            }
        );
        setTableData(initialData);
        setSelectedRows([]); // Reset selection
        setCurrentPage(1); // Reset pagination
    }, [divisionUserDetails]);


    // --- Action Handlers ---

    const handleRowApprovalChange = async (id: string, status: ApprovalStatus) => {
        const originalStatus =
            status === 'Approved' ? 'Revoked' : 'Approved';

        // 1. Optimistic UI Update
        setTableData((prev) =>
            prev.map((row) => (row.ID === id ? { ...row, approvalStatus: status } : row))
        );

        // 2. Find row data for payload
        const rowData = tableData.find((row) => row.ID === id);
        if (!rowData) return;

        // 3. Log
        const action =
            status === 'Approved' ? AuditAction.DATA_KEEP : AuditAction.DATA_REVOKE;

        // 4. Prepare and send payload
        const payload: BatchUpdatePayload = {
            uarId: uarHeader.uarId,
            decision: status === 'Approved' ? 'Approve' : 'Revoke',
            comments: rowData.comments?.[rowData.comments.length - 1]?.text, // Send last comment
            items: [{ username: rowData.username, roleId: rowData.roleId }],
        };

        // 5. Call store action
        const { error } = await batchUpdate(payload);
        if (error) {
            // Revert UI on failure
            console.error('Failed to update row:', error.message);
            setTableData((prev) =>
                prev.map((row) =>
                    row.ID === id ? { ...row, approvalStatus: originalStatus } : row
                )
            );
        }
        // On success, store refetches and data is auto-updated
    };

    const handleBulkAction = async (status: ApprovalStatus) => {
        if (selectedRows.length === 0) return;
        const originalStatus =
            status === 'Approved' ? 'Revoked' : 'Approved';

        // 1. Optimistic UI Update
        setTableData((prev) =>
            prev.map((row) =>
                selectedRows.includes(row.ID)
                    ? { ...row, approvalStatus: status }
                    : row
            )
        );

        // 2. Find row data for payload
        const selectedRowData = tableData.filter((row) =>
            selectedRows.includes(row.ID)
        );

        // 3. Log
        const action =
            status === 'Approved'
                ? AuditAction.DATA_KEEP_ALL
                : AuditAction.DATA_REVOKE_ALL;


        // 4. Prepare and send payload
        const payload: BatchUpdatePayload = {
            uarId: uarHeader.uarId,
            decision: status === 'Approved' ? 'Approve' : 'Revoke',
            // No clear way to add a single comment for bulk action
            items: selectedRowData.map((r) => ({
                username: r.username,
                roleId: r.roleId,
            })),
        };

        // 5. Call store action
        const { error } = await batchUpdate(payload);
        if (error) {
            // Revert UI on failure
            console.error('Failed to bulk update:', error.message);
            setTableData((prev) =>
                prev.map((row) =>
                    selectedRows.includes(row.ID)
                        ? { ...row, approvalStatus: originalStatus }
                        : row
                )
            );
        }
        // On success, store refetches.
        setSelectedRows([]); // Clear selection
    };

    const handleSubmitComment = async (newCommentText: string) => {
        if (commentTarget) {
            const newComment: Comment = {
                user: `${user.name} (${user.role})`,
                text: newCommentText,
                timestamp: new Date(),
            };

            // Update local tableData state
            setTableData((prev) =>
                prev.map((row) =>
                    row.ID === commentTarget.ID
                        ? { ...row, comments: [...(row.comments || []), newComment] }
                        : row
                )
            );


        }
        handleCloseCommentModal();
    };

    // --- Navigation & Modal Handlers ---

    const handleBackClick = () => {
        clearUarDetails(); // Clean up store state
        onBack();
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRows(currentData.map((d) => d.ID));
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (id: string) => {
        setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
        );
    };

    const handleRoleInfoClick = (row: TableData) => {
        // Find the original API item to pass to the modal
        const originalItem = divisionUserDetails.find(
            (item) => item.USERNAME === row.username && item.ROLE_ID === row.roleId
        );
        if (originalItem) {
            setSelectedRoleInfo(originalItem);
            setIsRoleInfoModalOpen(true);
        }
    };

    const handleOpenCommentModal = async (row: TableData) => {
        setCommentTarget(row);
        setIsCommentModalOpen(true);

    };

    const handleCloseCommentModal = () => {
        setCommentTarget(null);
        setIsCommentModalOpen(false);
    };

    // --- Pagination (Derived from local state) ---
    const totalItems = tableData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

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
                <h2 className="text-2xl font-bold text-gray-800">UAR Division User</h2>
                <div className="text-sm text-gray-500 mt-1 flex items-center flex-wrap">
                    <button
                        onClick={handleBackClick} // <-- Use new handler
                        className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                        aria-label="Back to UAR Division User list"
                    >
                        UAR Division User
                    </button>
                    <span className="mx-2">&gt;</span>
                    <span className="text-gray-700 font-medium">{uarHeader.uarId}</span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleBulkAction('Approved')}
                            disabled={selectedRows.length === 0 || isStoreLoading}
                            className="px-6 py-2 text-sm font-semibold text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                            Keep
                        </button>
                        <button
                            onClick={() => handleBulkAction('Revoked')}
                            disabled={selectedRows.length === 0 || isStoreLoading}
                            className="px-6 py-2 text-sm font-semibold text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                            Revoke
                        </button>
                    </div>
                    <button
                        onClick={async () => {
                            // Reverted to original logic: just log

                        }}
                        disabled={isStoreLoading} // Disable if store is busy
                        className="px-8 py-2 text-sm font-semibold text-white bg-blue-400 rounded-lg hover:bg-blue-500 transition-colors disabled:bg-blue-200 disabled:cursor-not-allowed"
                    >
                        {isStoreLoading ? 'Loading...' : 'Submit'}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px] text-sm text-left text-gray-700">
                        <thead className="text-sm text-black font-semibold">
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
                                    Role ID
                                </th>
                                <th scope="col" className="px-4 py-3 text-sm">
                                    Role Description
                                </th>
                                {/* <th scope="col" className="px-4 py-3 text-sm">Status</th> <-- REMOVED */}
                                <th scope="col" className="px-4 py-3 text-center w-48 text-sm">
                                    Approval
                                </th>
                                <th scope="col" className="px-4 py-3 text-sm">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* --- Handle Store Loading/Error States --- */}
                            {isStoreLoading ? (
                                <tr>
                                    <td colSpan={8} className="text-center p-6 text-gray-500">
                                        Loading details...
                                    </td>
                                </tr>
                            ) : storeError ? (
                                <tr>
                                    <td colSpan={8} className="text-center p-6 text-red-600">
                                        Error: {storeError}
                                    </td>
                                </tr>
                            ) : currentData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center p-6 text-gray-500">
                                        No details found for this UAR.
                                    </td>
                                </tr>
                            ) : (
                                // --- Render Table Rows ---
                                currentData.map((row) => (
                                    <tr
                                        key={row.ID}
                                        className="bg-white border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-2 text-sm">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedRows.includes(row.ID)}
                                                onChange={() => handleSelectRow(row.ID)}
                                                aria-label={`Select row ${row.ID}`}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-sm">{row.username}</td>
                                        <td className="px-4 py-2 text-sm">{row.noreg}</td>
                                        <td className="px-4 py-2 text-sm">{row.name}</td>
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
                                        {/* <td className="px-4 py-2 text-sm">{row.status}</td> <-- REMOVED */}
                                        <td className="px-4 py-2 text-sm">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() =>
                                                        handleRowApprovalChange(row.ID, 'Approved')
                                                    }
                                                    className={`px-3 py-1 text-xs font-semibold rounded-md min-w-[70px] transition-colors ${row.approvalStatus === 'Approved'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-white text-gray-500 border border-gray-300 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    Keep
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleRowApprovalChange(row.ID, 'Revoked')
                                                    }
                                                    className={`px-3 py-1 text-xs font-semibold rounded-md min-w-[70px] transition-colors ${row.approvalStatus === 'Revoked'
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

                {/* Pagination (Unchanged, uses local state) */}
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
                                disabled={safeCurrentPage === 1}
                                className="px-2 py-1 border bg-white border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                aria-label="Previous Page"
                            >
                                &lt;
                            </button>
                            <button
                                onClick={() => setCurrentPage((p) => p + 1)}
                                disabled={safeCurrentPage >= totalPages}
                                className="px-2 py-1 border bg-white border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                aria-label="Next Page"
                            >
                                &gt;
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isRoleInfoModalOpen && selectedRoleInfo && (
                <RoleInfoModal
                    onClose={() => setIsRoleInfoModalOpen(false)}
                    roleInfo={{
                        name: "test",
                        noreg: "000",
                        roleId: "IPPCS_FD_AR"
                    }}
                />
            )}
            {isCommentModalOpen && commentTarget && (
                <CommentModal
                    onClose={handleCloseCommentModal}
                    onSubmit={handleSubmitComment}
                    targetUser={"IPPCS_FD_AR"}
                    commentingUser={`${user.name} (${user.role})`}
                    comments={commentTarget.comments || []}
                />
            )}
        </div>
    );
};

export default UarDivisionUserDetailPage;