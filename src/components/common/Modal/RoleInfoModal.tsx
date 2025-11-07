import React from 'react';
import { roleInformationData } from '../../../../data';
import { CloseIcon } from '../../icons/CloseIcon';

// FIX: Define a more generic interface for role information to make the modal reusable.
interface RoleInfo {
    name: string;
    noreg: string;
    roleId: string;
}

interface RoleInfoModalProps {
    onClose: () => void;
    roleInfo: RoleInfo;
}

const RoleInfoModal: React.FC<RoleInfoModalProps> = ({ onClose, roleInfo }) => {
    const roleDetails = roleInformationData[roleInfo.roleId] || [];

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-900">Information Role</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close modal">
                        <CloseIcon />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500">User</p>
                            <p className="font-semibold text-gray-800">{roleInfo.name} ({roleInfo.noreg})</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Role ID</p>
                            <p className="font-semibold text-gray-800">{roleInfo.roleId}</p>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="text-md font-semibold text-gray-800 mb-3">Role Details:</h3>
                        {roleDetails.length > 0 ? (
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-sm text-left text-gray-600">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-2 w-16">App Name</th>
                                            <th scope="col" className="px-4 py-2">Role Name</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roleDetails.map((role, index) => (
                                            <tr key={index} className="bg-white border-b last:border-b-0 hover:bg-gray-50">
                                                <td className="px-4 py-2 text-gray-900">{index + 1}</td>
                                                <td className="px-4 py-2">{role}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-4 px-3 bg-gray-50 rounded-md">
                                <p className="text-sm text-gray-500">No additional role information available.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end items-center p-4 bg-gray-50 border-t rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleInfoModal;
