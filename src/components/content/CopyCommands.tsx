"use client";

import { useEffect } from "react";

/**
 * Single page-wide handler for `--copy` invoker commands (modern-web-guidance: copy-button).
 * Mount once per page that has copy buttons.
 */
let lastMessage = "";
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

function report(button: HTMLElement, ok: boolean) {
  const tip = button.nextElementSibling as HTMLElement | null;
  if (!tip) return;
  clearTimeout(timers.get(button));
  button.removeAttribute("data-copied");
  button.removeAttribute("data-failed");
  let message = ok ? "Copied" : "Copy failed";
  // VoiceOver skips identical consecutive messages; a no-break space makes it differ.
  if (message === lastMessage) message += " ";
  lastMessage = message;
  tip.textContent = "";
  button.setAttribute(ok ? "data-copied" : "data-failed", "");
  requestAnimationFrame(() => (tip.textContent = message));
  timers.set(
    button,
    setTimeout(() => {
      button.removeAttribute("data-copied");
      button.removeAttribute("data-failed");
      tip.textContent = "";
    }, 2000),
  );
}

async function copy(button: HTMLElement, target: HTMLElement) {
  const text = target.matches("input, textarea") ? (target as HTMLInputElement).value : target.innerText.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    report(button, true);
  } catch {
    report(button, false);
  }
}

export function CopyCommands() {
  useEffect(() => {
    if ("CommandEvent" in window) {
      const onCommand = (event: Event) => {
        const e = event as Event & { command: string; source: HTMLElement };
        if (e.command === "--copy" && e.target instanceof HTMLElement) void copy(e.source, e.target);
      };
      // `command` events don't bubble: listen in the capture phase.
      document.addEventListener("command", onCommand, true);
      return () => document.removeEventListener("command", onCommand, true);
    }
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const button = (event.target as HTMLElement).closest<HTMLElement>('button[command="--copy"]');
      const target = button && document.getElementById(button.getAttribute("commandfor") ?? "");
      if (button && target) void copy(button, target);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
