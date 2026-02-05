"use client";

import { useState, useRef, KeyboardEvent, useEffect, useCallback } from "react";
import { Chip } from "@heroui/chip";

// Hoist RegExp to module scope (rule 7.9)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TEmailRecipientInputProps = {
    label: string;
    value: string[];
    onChange: (emails: string[]) => void;
    isInvalid?: boolean;
    errorMessage?: string;
    isRequired?: boolean;
    description?: string;
    suggestions?: string[];
    placeholder?: string;
    /** Gọi khi user gõ để parent fetch suggestions theo search (VD: API profiles?search=...) */
    onSearchChange?: (query: string) => void;
    /** false = chỉ thêm bằng cách chọn từ danh sách (không Enter/blur thêm email ngoài danh sách) */
    allowCustomEmail?: boolean;
};

export function EmailRecipientInput({
    label,
    value,
    onChange,
    isInvalid,
    errorMessage,
    isRequired,
    description,
    suggestions = [],
    placeholder = "Nhập email...",
    onSearchChange,
    allowCustomEmail = true,
}: TEmailRecipientInputProps) {
    const [inputValue, setInputValue] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Filter suggestions based on input
    const filteredSuggestions = suggestions.filter(
        (suggestion) =>
            suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
            !value.includes(suggestion)
    );

    // Handle adding email
    const handleAddEmail = useCallback(
        (email: string) => {
            const trimmedEmail = email.trim();
            if (!trimmedEmail) return false;

            // Validate email format
            if (!EMAIL_REGEX.test(trimmedEmail)) {
                return false;
            }

            // Check for duplicates
            if (value.includes(trimmedEmail)) {
                return false;
            }

            onChange([...value, trimmedEmail]);
            setInputValue("");
            setShowSuggestions(false);
            setFocusedIndex(-1);
            return true;
        },
        [value, onChange]
    );

    // Handle removing email
    const handleRemoveEmail = useCallback(
        (emailToRemove: string) => {
            onChange(value.filter((email) => email !== emailToRemove));
            inputRef.current?.focus();
        },
        [value, onChange]
    );

    // Handle paste event
    const handlePaste = useCallback(
        (e: React.ClipboardEvent<HTMLInputElement>) => {
            e.preventDefault();
            const pastedText = e.clipboardData.getData("text");

            // Split by comma, semicolon, or newline
            const emails = pastedText
                .split(/[,;\n\r]+/)
                .map((email) => email.trim())
                .filter((email) => email && EMAIL_REGEX.test(email));

            if (emails.length > 0) {
                const newEmails = emails.filter((email) => !value.includes(email));
                if (newEmails.length > 0) {
                    onChange([...value, ...newEmails]);
                    setInputValue("");
                }
            }
        },
        [value, onChange]
    );

    // Handle keyboard events
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            // Arrow down/up for suggestions navigation
            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (showSuggestions && filteredSuggestions.length > 0) {
                    setFocusedIndex((prev) =>
                        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
                    );
                }
                return;
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();
                if (showSuggestions) {
                    setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                }
                return;
            }

            // Enter: chỉ thêm khi chọn từ danh sách (hoặc thêm email tự gõ nếu allowCustomEmail)
            if (e.key === "Enter") {
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < filteredSuggestions.length) {
                    handleAddEmail(filteredSuggestions[focusedIndex]);
                } else if (allowCustomEmail && inputValue.trim()) {
                    handleAddEmail(inputValue);
                }
                return;
            }

            // Escape to close suggestions
            if (e.key === "Escape") {
                setShowSuggestions(false);
                setFocusedIndex(-1);
                return;
            }

            // Backspace to remove last chip when input is empty
            if (e.key === "Backspace" && !inputValue && value.length > 0) {
                handleRemoveEmail(value[value.length - 1]);
                return;
            }

            // Comma or semicolon to add email (chỉ khi allowCustomEmail)
            if (allowCustomEmail && (e.key === "," || e.key === ";") && inputValue.trim()) {
                e.preventDefault();
                handleAddEmail(inputValue);
                return;
            }
        },
        [
            inputValue,
            value,
            showSuggestions,
            focusedIndex,
            filteredSuggestions,
            allowCustomEmail,
            handleAddEmail,
            handleRemoveEmail,
        ]
    );

    // Handle input change
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            onSearchChange?.(newValue.trim());
            setShowSuggestions(newValue.length > 0 && filteredSuggestions.length > 0);
            setFocusedIndex(-1);
        },
        [filteredSuggestions.length, onSearchChange]
    );

    // Handle focus – show dropdown khi có suggestions (select + search)
    const handleFocus = useCallback(() => {
        setIsFocused(true);
        if (filteredSuggestions.length > 0) {
            setShowSuggestions(true);
        }
    }, [filteredSuggestions.length]);

    // Handle blur (with delay to allow click on suggestions)
    const handleBlur = useCallback(() => {
        setTimeout(() => {
            setIsFocused(false);
            setShowSuggestions(false);
            setFocusedIndex(-1);
            if (allowCustomEmail && inputValue.trim()) {
                handleAddEmail(inputValue);
            }
        }, 200);
    }, [inputValue, allowCustomEmail, handleAddEmail]);

    // Click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
                setFocusedIndex(-1);
            }
        };

        if (showSuggestions) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [showSuggestions]);

    // Scroll focused suggestion into view
    useEffect(() => {
        if (focusedIndex >= 0 && suggestionsRef.current) {
            const focusedElement = suggestionsRef.current.children[
                focusedIndex
            ] as HTMLElement;
            if (focusedElement) {
                focusedElement.scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                });
            }
        }
    }, [focusedIndex]);

    return (
        <div className="w-full">
            {/* Label - giống HeroUI Input */}
            <label className="block text-sm font-medium text-foreground mb-1.5">
                {label}
                {isRequired && <span className="text-danger ml-1">*</span>}
            </label>

            <div className="relative">
                {/* Input container với chips - giống HeroUI Input wrapper styling */}
                <div
                    ref={containerRef}
                    className={`
            group
            relative
            w-full
            inline-flex
            flex-wrap
            items-center
            gap-1.5
            tap-highlight-transparent
            shadow-sm
            px-3
            min-h-[56px]
            h-auto
            py-2
            rounded-medium
            bg-default-100
            data-[hover=true]:bg-default-200
            group-data-[focus=true]:bg-default-100
            border-medium
            border-default-200
            data-[hover=true]:border-default-400
            group-data-[focus=true]:border-primary
            ${isInvalid
                            ? "!border-danger !bg-danger-50 data-[hover=true]:!bg-danger-100"
                            : ""
                        }
            ${isFocused || showSuggestions
                            ? "!border-primary ring-2 ring-primary ring-offset-1"
                            : ""
                        }
            transition-colors
            motion-reduce:transition-none
            ${isFocused ? "bg-default-100" : ""}
          `}
                    onClick={() => inputRef.current?.focus()}
                    data-hover={true}
                    data-focus={isFocused}
                    aria-autocomplete="none"
                >
                    {/* Chips */}
                    {value.map((email, index) => (
                        <Chip
                            key={`${email}-${index}`}
                            onClose={() => handleRemoveEmail(email)}
                            variant="flat"
                            color="primary"
                            size="sm"
                            classNames={{
                                base: "h-6 px-2 m-0",
                                content: "text-xs font-medium px-0",
                                closeButton: "ml-1 text-xs w-3 h-3 min-w-3",
                            }}
                        >
                            {email}
                        </Chip>
                    ))}

                    {/* Input field */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onPaste={handlePaste}
                        placeholder={value.length === 0 ? placeholder : ""}
                        className="
              w-full
              bg-transparent
              border-none
              outline-none
              text-sm
              text-foreground
              placeholder:text-default-400
              file:border-0
              file:bg-transparent
              file:text-sm
              file:font-medium
              file:text-foreground
              file:mr-4
              file:disabled:opacity-50
              disabled:opacity-50
              flex-1
              min-w-[120px]
            "
                        autoComplete="off"
                    />
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                    <div
                        ref={suggestionsRef}
                        className="
              absolute
              z-50
              w-full
              mt-1
              bg-content1
              border
              border-default-200
              rounded-lg
              shadow-lg
              max-h-60
              overflow-auto
            "
                    >
                        {filteredSuggestions.map((suggestion, index) => (
                            <div
                                key={suggestion}
                                className={`
                  px-4
                  py-2
                  cursor-pointer
                  text-sm
                  transition-colors
                  ${index === focusedIndex
                                        ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                                        : "hover:bg-default-100 dark:hover:bg-default-800"
                                    }
                `}
                                onClick={() => {
                                    handleAddEmail(suggestion);
                                    inputRef.current?.focus();
                                }}
                                onMouseEnter={() => setFocusedIndex(index)}
                            >
                                {suggestion}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Error message - giống HeroUI Input */}
            {isInvalid && errorMessage && (
                <p className="text-xs text-danger mt-1.5">{errorMessage}</p>
            )}

            {/* Description - giống HeroUI Input */}
            {description && !isInvalid && (
                <p className="text-xs text-default-500 mt-1.5">{description}</p>
            )}

            {/* Inline validation for invalid email */}
            {inputValue &&
                !EMAIL_REGEX.test(inputValue.trim()) &&
                inputValue.trim().length > 0 &&
                !isInvalid && (
                    <p className="text-xs text-warning mt-1.5">
                        Email không hợp lệ
                    </p>
                )}
        </div>
    );
}
