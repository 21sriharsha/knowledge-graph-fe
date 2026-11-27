#!/usr/bin/env python3
"""Claude Code hook: require modern-web-guidance before editing UI files.

Why: CLAUDE.md asks Claude to consult the `modern-web-guidance` skill before building a UI pattern.
Skills are model-invoked, so that rule relies on memory. This hook makes it enforced by the harness:
the first edit of a UI file in a session is blocked until a guide has actually been retrieved.

Modes (first argument):
  record  - PostToolUse on Bash/Read: mark the session once guidance was retrieved, i.e.
            `modern-web-guidance ... search|retrieve` ran successfully, or a bundled guide file
            under `.../modern-web-guidance/guides/` was read.
  gate    - PreToolUse on Write/Edit/MultiEdit: block (exit 2, reason on stderr) when the target is
            a UI file and the session has no marker.

A hook cannot invoke a skill itself; blocking with an explanation is how it makes Claude do it.
Hooks must never break the session on bad input, so any parse error lets the action through.
"""
import json
import os
import re
import sys
import tempfile
from pathlib import Path

UI_FILE = re.compile(r"\.(tsx|jsx|css|scss|html)$", re.IGNORECASE)
NOT_UI = re.compile(r"(\.(test|spec|stories)\.[jt]sx?$)|(/(docs|e2e|tests?)/)", re.IGNORECASE)
MARKER_DIR = Path(tempfile.gettempdir()) / "claude-mwg"


def marker_for(session_id: str) -> Path:
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", session_id or "unknown")
    return MARKER_DIR / safe


def guidance_retrieved(event: dict) -> bool:
    tool = event.get("tool_name", "")
    tool_input = event.get("tool_input") or {}
    if tool == "Read":
        path = str(tool_input.get("file_path", ""))
        return "/modern-web-guidance/" in path and "/guides/" in path and path.endswith(".md")
    if tool == "Bash":
        command = str(tool_input.get("command", ""))
        if not re.search(r"modern-web-guidance(@\S+)?\s+(search|retrieve)\b", command):
            return False
        response = event.get("tool_response") or {}
        stdout = str(response.get("stdout", "")) if isinstance(response, dict) else str(response)
        stderr = str(response.get("stderr", "")) if isinstance(response, dict) else ""
        # A failed run (e.g. npx missing) must not count as having consulted the guidance.
        failed = "command not found" in stderr or "ERR!" in stderr or not stdout.strip()
        return not failed
    return False


def record(event: dict) -> int:
    if guidance_retrieved(event):
        MARKER_DIR.mkdir(parents=True, exist_ok=True)
        marker_for(event.get("session_id", "")).touch()
    return 0


def gate(event: dict) -> int:
    path = str((event.get("tool_input") or {}).get("file_path", ""))
    if not UI_FILE.search(path) or NOT_UI.search(path):
        return 0
    if marker_for(event.get("session_id", "")).exists():
        return 0
    print(
        "Blocked by project hook (.claude/hooks/mwg_gate.py): before editing UI files in this "
        "session, consult the modern-web-guidance skill (CLAUDE.md, UI rules). Load the skill, run "
        "`search` for the UI pattern you are building and `retrieve` the matching guide(s) "
        "(or read the bundled guide file under ~/.claude/plugins/cache/googlechrome/"
        "modern-web-guidance/*/skills/modern-web-guidance/guides/ if the CLI cannot run). "
        "Apply its guidance and fallbacks, then retry this edit.",
        file=sys.stderr,
    )
    return 2


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    if mode == "record":
        return record(event)
    if mode == "gate":
        return gate(event)
    return 0


if __name__ == "__main__":
    sys.exit(main())
