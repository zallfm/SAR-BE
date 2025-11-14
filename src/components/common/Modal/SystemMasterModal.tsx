import React, { useState, useEffect, useMemo } from "react";
import type { User } from "../../../../types";
import { CloseIcon } from "../../icons/CloseIcon";
import { SystemMaster } from "@/src/types/systemMaster";

interface SystemMasterModalProps {
  onClose: () => void;
  onSave: (
    record: Omit<
      SystemMaster,
      "CREATED_BY" | "CHANGED_BY" | "CREATED_DT" | "CHANGED_DT"
    >
  ) => Promise<void>;
  recordToEdit?: SystemMaster | null;
  user: User;
}

const toInputDate = (dateStr: string): string => {
  if (!dateStr) return "";

  if (dateStr.includes("T")) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  }

  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";

  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
};

const fromInputDate = (dateStr: string): string => {
  if (!dateStr) return "";
  // Handles YYYY-MM-DD format from input
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY for display
};

const SystemMasterModal: React.FC<SystemMasterModalProps> = ({
  onClose,
  onSave,
  recordToEdit,
  user,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!recordToEdit;

  const [formData, setFormData] = useState({
    SYSTEM_TYPE: "",
    SYSTEM_CD: "",
    VALID_FROM_DT: "",
    VALID_TO_DT: "",
    VALUE_TEXT: "",
    VALUE_NUM: "",
    VALUE_TIME: "",
  });

  const [dateError, setDateError] = useState("");

  useEffect(() => {
    if (isEditMode && recordToEdit) {
      setFormData({
        SYSTEM_TYPE: recordToEdit.SYSTEM_TYPE,
        SYSTEM_CD: recordToEdit.SYSTEM_CD,
        VALID_FROM_DT: toInputDate(recordToEdit.VALID_FROM_DT),
        VALID_TO_DT: toInputDate(recordToEdit.VALID_TO_DT),
        VALUE_TEXT: recordToEdit.VALUE_TEXT || "",
        VALUE_NUM:
          recordToEdit.VALUE_NUM === null ? "" : String(recordToEdit.VALUE_NUM),

        VALUE_TIME: recordToEdit.VALUE_TIME || "",
      });
    }
  }, [recordToEdit, isEditMode]);

  useEffect(() => {
    if (formData.VALID_FROM_DT && formData.VALID_TO_DT) {
      const from = new Date(formData.VALID_FROM_DT);
      const to = new Date(formData.VALID_TO_DT);
      if (to < from) {
        setDateError("Valid To date cannot be earlier than Valid From date.");
      } else {
        setDateError("");
      }
    } else {
      setDateError("");
    }
  }, [formData.VALID_FROM_DT, formData.VALID_TO_DT]);

  const isFormValid = useMemo(() => {
    return (
      formData.SYSTEM_TYPE.trim() !== "" &&
      formData.SYSTEM_CD.trim() !== "" &&
      formData.VALID_FROM_DT !== "" &&
      formData.VALID_TO_DT !== "" &&
      dateError === ""
    );
  }, [
    formData.SYSTEM_TYPE,
    formData.SYSTEM_CD,
    formData.VALID_FROM_DT,
    formData.VALID_TO_DT,
    dateError,
  ]);

  const handleSave = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const finalRecord: Omit<
        SystemMaster,
        "CREATED_BY" | "CHANGED_BY" | "CREATED_DT" | "CHANGED_DT"
      > = {
        SYSTEM_TYPE: formData.SYSTEM_TYPE.trim(),
        SYSTEM_CD: formData.SYSTEM_CD.trim(),
        VALID_FROM_DT:
          recordToEdit && recordToEdit.VALID_FROM_DT
            ? new Date(recordToEdit.VALID_FROM_DT).toISOString()
            : new Date(formData.VALID_FROM_DT).toISOString(),
        VALID_TO_DT: new Date(formData.VALID_TO_DT).toISOString(),
        VALUE_TEXT: formData.VALUE_TEXT.trim(),
        VALUE_NUM: Number(formData.VALUE_NUM) || 0,
        VALUE_TIME: formData.VALUE_TIME || null,
      };
      if (isEditMode && recordToEdit) {
        finalRecord.NEW_VALID_FROM_DT = new Date(
          formData.VALID_FROM_DT
        ).toISOString();
      }

      await onSave(finalRecord);
      onClose();
    } catch (error) {
      console.error("Failed to save record:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === "VALUE_NUM") {
      if (value === "" || /^\d+$/.test(value)) {
        setFormData((prev) => ({ ...prev, [id]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-full overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditMode ? "Edit" : "Add"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>
        <fieldset disabled={isSubmitting}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="SYSTEM_TYPE"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  System Type
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="SYSTEM_TYPE"
                  type="text"
                  placeholder="System Type"
                  value={formData.SYSTEM_TYPE}
                  onChange={handleChange}
                  disabled={isEditMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label
                  htmlFor="SYSTEM_CD"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  System Code
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="SYSTEM_CD"
                  type="text"
                  placeholder="System Code"
                  value={formData.SYSTEM_CD}
                  onChange={handleChange}
                  disabled={isEditMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label
                  htmlFor="VALID_FROM_DT"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Valid From <span className="text-red-500">*</span>
                </label>
                <input
                  id="VALID_FROM_DT"
                  type="date"
                  value={formData.VALID_FROM_DT}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="VALID_TO_DT"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Valid To <span className="text-red-500">*</span>
                </label>
                <input
                  id="VALID_TO_DT"
                  type="date"
                  value={formData.VALID_TO_DT}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {dateError && (
                  <p className="mt-1 text-xs text-red-600">{dateError}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="VALUE_TEXT"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  System Value Text
                </label>
                <input
                  id="VALUE_TEXT"
                  type="text"
                  placeholder="System Value Text"
                  value={formData.VALUE_TEXT}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="VALUE_NUM"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  System Value Num
                </label>
                <input
                  id="VALUE_NUM"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="System Value Num"
                  value={formData.VALUE_NUM}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="VALUE_TIME"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  System Value Time
                </label>
                <input
                  id="VALUE_TIME"
                  type="time"
                  step="1"
                  value={formData.VALUE_TIME}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end items-center px-6 py-4 bg-gray-50 border-t gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </fieldset>
      </div>
    </div>
  );
};

export default SystemMasterModal;
