"use client";

/**
 * Header search with suggestions (F05-FR-1…3). React Aria's combobox (ADR 0004: the platform has no
 * native equivalent with correct keyboard + ARIA semantics). "/" focuses it; ↑/↓ move; Enter opens the
 * highlighted article or searches for the typed text; Esc closes. The last option is "Search for …".
 * Input is trimmed, length-limited and only sent after 2+ characters and a 150 ms pause.
 */
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mergeProps, useComboBox, useListBox, useOption } from "react-aria";
import { Item, useComboBoxState, type ComboBoxState } from "react-stately";
import type { components } from "@/lib/api/schema";
import { bff } from "@/lib/bff-client";
import { topicColor } from "@/lib/topic-color";
import { Icon } from "@/components/ui/Icon";
import styles from "./HeaderSearch.module.css";

type Suggestion = components["schemas"]["SearchSuggestion"];
type Option = { key: string; label: string; suggestion?: Suggestion };

const SEARCH_ALL = "__search__";
const MAX = 200;

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function HeaderSearch() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const term = useDebounced(input.trim().slice(0, MAX), 150);
  const inputRef = useRef<HTMLInputElement>(null);
  const listBoxRef = useRef<HTMLUListElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const suggestions = useQuery({
    queryKey: ["suggest", term.toLowerCase()],
    queryFn: () => bff<Suggestion[]>(`/api/bff/search/suggest?q=${encodeURIComponent(term)}&limit=6`),
    enabled: term.length >= 2,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const options: Option[] =
    term.length >= 2
      ? [
          ...(suggestions.data ?? []).filter((s) => s.slug).map((s) => ({ key: s.slug!, label: s.title ?? s.slug!, suggestion: s })),
          { key: SEARCH_ALL, label: `Search for “${term}”` },
        ]
      : [];

  const goSearch = (q: string) => {
    const clean = q.trim().slice(0, MAX);
    if (clean) router.push(`/search?q=${encodeURIComponent(clean)}`);
  };

  const state = useComboBoxState<Option>({
    items: options,
    children: (option) => <Item key={option.key} textValue={option.label}>{option.label}</Item>,
    inputValue: input,
    onInputChange: setInput,
    allowsCustomValue: true,
    allowsEmptyCollection: false,
    menuTrigger: "input",
    onSelectionChange: (key) => {
      if (key == null) return;
      if (key === SEARCH_ALL) goSearch(input);
      else router.push(`/articles/${String(key)}`);
      setInput("");
      inputRef.current?.blur();
    },
  });

  // Suggestions arrive after the debounce; open the list then if the user is still in the box.
  const optionCount = options.length;
  const suggestionsKey = suggestions.dataUpdatedAt;
  useEffect(() => {
    if (optionCount > 0 && document.activeElement === inputRef.current && !state.isOpen) state.open();
    // state identity changes every render; only re-run when new suggestions land.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionCount, suggestionsKey]);

  const { inputProps, listBoxProps, labelProps } = useComboBox(
    { label: "Search articles", inputRef, listBoxRef, popoverRef, allowsCustomValue: true, "aria-label": undefined },
    state,
  );

  // "/" focuses the search box from anywhere except text inputs (F05-FR-1).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || target.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Runs BEFORE React Aria's handler (see mergeProps order): with allowsCustomValue, React Aria commits
  // Enter as custom text and clears the highlight, so the highlighted option must be read first.
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    const focused = state.isOpen ? state.selectionManager.focusedKey : null;
    event.preventDefault();
    if (focused != null && focused !== SEARCH_ALL) router.push(`/articles/${String(focused)}`);
    else goSearch(input); // F05-FR-3: nothing highlighted (or "Search for …") searches the typed text
    setInput("");
    state.close();
  };

  return (
    <div className={styles.search} role="search" data-testid="header-search">
      <label {...labelProps} className="sr-only">
        Search articles
      </label>
      <Icon name="search" size={16} className={styles.icon} />
      <input
        {...mergeProps({ onKeyDown }, inputProps)}
        ref={inputRef}
        type="search"
        maxLength={MAX}
        placeholder="Search articles"
        data-testid="search-box"
      />
      <kbd aria-hidden="true">/</kbd>
      {state.isOpen && options.length > 0 && (
        <div ref={popoverRef} className={styles.popover}>
          <ListBox listBoxProps={listBoxProps} listBoxRef={listBoxRef} state={state} />
        </div>
      )}
    </div>
  );
}

function ListBox({
  listBoxProps,
  listBoxRef,
  state,
}: {
  listBoxProps: object;
  listBoxRef: React.RefObject<HTMLUListElement | null>;
  state: ComboBoxState<Option>;
}) {
  const { listBoxProps: props } = useListBox(listBoxProps, state, listBoxRef);
  return (
    <ul {...props} ref={listBoxRef} className={styles.list} data-testid="suggest-list">
      {[...state.collection].map((node) => (
        <OptionView key={node.key} node={node} state={state} />
      ))}
    </ul>
  );
}

type CollectionNode = ComboBoxState<Option>["collection"] extends Iterable<infer N> ? N : never;

function OptionView({ node, state }: { node: CollectionNode; state: ComboBoxState<Option> }) {
  const ref = useRef<HTMLLIElement>(null);
  const { optionProps, isFocused } = useOption({ key: node.key }, state, ref);
  const option = node.value;
  const isAll = node.key === SEARCH_ALL;
  return (
    <li {...optionProps} ref={ref} className={styles.option} data-focused={isFocused || undefined} data-testid={isAll ? "suggest-all" : "suggest-item"}>
      {isAll ? (
        <span className={styles.all}>{option?.label}</span>
      ) : (
        <>
          <span className="dot" style={{ background: topicColor(option?.suggestion?.topic) }} aria-hidden="true" />
          <span className={styles.title}>{option?.label}</span>
          {option?.suggestion?.authorName && <span className={styles.meta}>{option.suggestion.authorName}</span>}
        </>
      )}
    </li>
  );
}
