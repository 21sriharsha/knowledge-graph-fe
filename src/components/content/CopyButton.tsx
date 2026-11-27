"use client";

/**
 * Copy button (modern-web-guidance: copy-button). Declares its target with Invoker Commands
 * (command="--copy" commandfor=id); one document-level listener (CopyCommands) performs the copy, with a
 * click fallback where CommandEvent is missing. The status bubble is the live region and sits outside
 * the button so it is announced reliably.
 */
import { Icon } from "@/components/ui/Icon";
import styles from "./content.module.css";

export function CopyButton({ targetId, label, testId }: { targetId: string; label: string; testId?: string }) {
  return (
    <span className={styles.copy}>
      <button
        type="button"
        className={`icon-btn ${styles.copyButton}`}
        // Invoker Commands attributes (React passes unknown lowercase attributes through).
        {...({ command: "--copy", commandfor: targetId } as Record<string, string>)}
        aria-label={label}
        data-testid={testId}
      >
        <Icon name="copy" size={16} />
      </button>
      <span className={styles.copyTip} role="status" />
    </span>
  );
}
