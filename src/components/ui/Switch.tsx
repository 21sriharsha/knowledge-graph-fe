"use client";

/**
 * Binary toggle (modern-web-guidance: switch): native <input type="checkbox" switch> with an
 * associated label. role="switch" is rendered explicitly so browsers without native switches (and the
 * CSS fallback in globals.css) still expose switch semantics.
 */
export function Switch({
  checked,
  onChange,
  label,
  testId,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
  testId?: string;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer" }}>
      <input
        type="checkbox"
        {...({ switch: "" } as Record<string, string>)}
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        data-testid={testId}
      />
      {label}
    </label>
  );
}
