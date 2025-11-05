import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronDownIcon } from '../../icons/ChevronDownIcon';

interface SearchableDropdownProps {
    label: string;
    value: string | undefined;
    onChange: (value: string) => void;
    options: string[];
    searchable?: boolean; // If false, acts like a regular dropdown
    placeholder?: string;
    className?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    label,
    value,
    onChange,
    options,
    searchable = true,
    placeholder,
    className = "w-full sm:w-40"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(value || '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value]);

    const filteredOptions = useMemo(() => {
        if (!searchable || !searchTerm) {
            return options;
        }
        return options.filter(option =>
            option.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm, searchable]);

    const handleSelect = (option: string) => {
        onChange(option);
        setSearchTerm(option);
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (searchable) {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            if (e.target.value === '') {
                onChange('');
            }
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleToggle = () => {
        if (!searchable) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div className="relative">
                <input
                    type="text"
                    placeholder={placeholder || label}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onClick={handleToggle}
                    readOnly={!searchable}
                    autoComplete='off'
                    autoCapitalize='off'
                    autoCorrect='off'
                    spellCheck='false'
                    className={`w-full bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${!searchable ? 'cursor-pointer' : ''
                        }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    {value && (
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
                    <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {isOpen && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <li
                                key={option}
                                onMouseDown={() => handleSelect(option)}
                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-100 ${value === option ? 'bg-blue-100 text-blue-700' : 'text-gray-800'
                                    }`}
                            >
                                {option}
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-2 text-sm text-gray-500">No options found</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default SearchableDropdown;
