import React, { useState, useEffect, useMemo, useRef } from "react";
import { CloseIcon } from "../../icons/CloseIcon";
import { divisions } from "../../../../data";
import type { PicUser } from "../../../../data";

interface UarPicModalProps {
  onClose: () => void;
  onSave: (pic: PicUser) => void;
  picToEdit?: PicUser | null;
}

const UarPicModal: React.FC<UarPicModalProps> = ({
  onClose,
  onSave,
  picToEdit,
}) => {
  const isEditMode = !!picToEdit;

  const [name, setName] = useState("");
  const [division, setDivision] = useState("");
  const [email, setEmail] = useState("");

  const [divisionQuery, setDivisionQuery] = useState("");
  const [isDivisionDropdownOpen, setIsDivisionDropdownOpen] = useState(false);
  const divisionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        divisionDropdownRef.current &&
        !divisionDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDivisionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditMode && picToEdit) {
      setName(picToEdit.PIC_NAME);
      setDivision(
        picToEdit.DIVISION_ID ? divisions[picToEdit.DIVISION_ID - 1] : ""
      );
      setEmail(picToEdit.MAIL);
      setDivisionQuery(
        picToEdit.DIVISION_ID ? divisions[picToEdit.DIVISION_ID - 1] : ""
      );
    }
  }, [picToEdit, isEditMode]);

  const filteredDivisions = useMemo(() => {
    if (!divisionQuery) return [...new Set(divisions)].sort();
    return [...new Set(divisions)]
      .filter((d) => d.toLowerCase().includes(divisionQuery.toLowerCase()))
      .sort();
  }, [divisionQuery]);

  const handleDivisionSelect = (selectedDivision: string) => {
    setDivision(selectedDivision);
    setDivisionQuery(selectedDivision);
    setIsDivisionDropdownOpen(false);
  };

  const emailError = useMemo(() => {
    const username = email.includes("@") ? email.split('@')[0] : email;

    if (email.length === 0) {
      return null;
    }

    if (!/^[^\s@]+$/.test(username)) {
      return "Invalid email format (check for spaces).";
    }

    if (email.includes("@")) {
      if (!/^[^\s@]+@toyota\.co\E.id$/.test(email)) {
        return "You must use an @toyota.co.id email";
      }
    }

    if (username.length > 30) {
      return "Email username can only contain 30 characters";
    }

    return null;
  }, [email]);

  const nameError = useMemo(() => {
    const invalidChars = /[^a-zA-Z .]/;
    if (name.length > 0) {
      if (invalidChars.test(name)) {
        return "Name can only contain letters and spaces.";
      }
    }
    return null;
  }, [name]);

  const isFormValid = useMemo(() => {
    // Check if email is valid (either with or without domain)
    const isEmailValid = email.trim() && !emailError;
    return name.trim() && division && isEmailValid && !nameError;
  }, [name, division, email, emailError, nameError]);

  const handleClear = () => {
    setDivision("")
    setDivisionQuery("")
  }

  const handleSave = () => {
    if (!isFormValid) return;

    // Auto-append @toyota.co.id domain if not present
    let processedEmail = email.trim();
    if (!processedEmail.includes("@toyota.co.id")) {
      if (processedEmail.includes("@")) {
        // If user entered different domain, we'll reject it
        return; // This won't be reached if form validation is correct
      } else {
        // If no domain was provided, add @toyota.co.id
        processedEmail = processedEmail + "@toyota.co.id";
      }
    }

    const picData: PicUser = {
      ID: isEditMode && picToEdit ? picToEdit.ID : "<NEW_ID>", // ID is handled by parent on creation
      PIC_NAME: name.trim(),
      DIVISION_ID: divisions.findIndex((d) => d === division) + 1,
      MAIL: processedEmail,
    };
    onSave(picData);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditMode ? "Edit" : "Add"}
          </h2>
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-700"
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="picName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="picName"
              type="text"
              placeholder="Enter Name"
              value={name}
              onChange={(e) => {
                const formattedName = e.target.value.replace(/\b\w/g, (char) =>
                  char.toUpperCase()
                );
                setName(formattedName);
              }}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 
              
                ${nameError
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                }  
              
                `}
            />
            {nameError && (
              <p className="text-red-500 text-xs mt-1">{nameError}</p>
            )}
          </div>
          <div ref={divisionDropdownRef}>
            <label
              htmlFor="picDivision"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Division <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="picDivision"
                type="text"
                placeholder="Enter Division"
                value={divisionQuery}
                autoComplete='off'
                autoCapitalize='off'
                autoCorrect='off'
                spellCheck='false'
                onChange={(e) => {
                  const index = divisions.indexOf(e.target.value);
                  setDivisionQuery(e.target.value);
                  setDivision("");
                  setIsDivisionDropdownOpen(true);
                }}
                onFocus={() => setIsDivisionDropdownOpen(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center  z-[999]">
                {(division || divisionQuery) && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 text-gray-400 hover:text-gray-600 mr-1"
                    aria-label="Clear selection"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
              {isDivisionDropdownOpen && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {filteredDivisions.length > 0 ? (
                    filteredDivisions.map((d) => (
                      <li
                        key={d}
                        onMouseDown={() => handleDivisionSelect(d)}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                      >
                        {d}
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-2 text-gray-500">
                      No divisions found
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
          <div>
            <label
              htmlFor="picEmail"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="picEmail"
                type="email"
                placeholder="Enter email (without @toyota.co.id)"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${emailError
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  }`}
              />
              {email && !email.includes("@") && !emailError && (
                <span className="absolute inset-y-0 right-3 flex items-center text-black-400 pointer-events-none">
                  @toyota.co.id
                </span>
              )}
            </div>
            {emailError && (
              <p className="mt-1 text-xs text-red-600">{emailError}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end items-center px-6 py-4 bg-gray-50 border-t gap-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isFormValid}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default UarPicModal;
