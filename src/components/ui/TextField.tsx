"use client";

import { useId } from "react";

/** Labelled input with hint and error wired via aria-describedby / aria-invalid (forms guidance). */
export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  type = "text",
  required,
  maxLength,
  placeholder,
  autoFocus,
  name,
  multiline,
  disabled,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: "text" | "url" | "email" | "password";
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  name: string;
  multiline?: boolean;
  disabled?: boolean;
  testId?: string;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    name,
    value,
    maxLength,
    placeholder,
    autoFocus,
    required,
    disabled,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "data-testid": testId,
  } as const;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {multiline ? (
        <textarea {...common} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type={type} onChange={(e) => onChange(e.target.value)} autoComplete={type === "password" ? "new-password" : "off"} />
      )}
      {hint && (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="error">
          {error}
        </span>
      )}
    </div>
  );
}
