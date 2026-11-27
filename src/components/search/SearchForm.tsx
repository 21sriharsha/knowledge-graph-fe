"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Switch } from "@/components/ui/Switch";
import styles from "./search.module.css";

/** Results-page search form (F05-FR-4/5). The URL is the state; changing the AI switch re-runs the search. */
export function SearchForm({ q, understand }: { q: string; understand: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  const go = (nextQ: string, nextUnderstand: boolean) => {
    const clean = nextQ.trim().slice(0, 200);
    if (!clean) return;
    router.push(`/search?q=${encodeURIComponent(clean)}${nextUnderstand ? "" : "&understand=false"}`);
  };
  return (
    <form
      role="search"
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        go(value, understand);
      }}
    >
      <label className="sr-only" htmlFor="search-q">
        Search articles
      </label>
      <input
        id="search-q"
        type="search"
        value={value}
        maxLength={200}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search articles, e.g. postgres by Anita"
        data-testid="search-input"
      />
      <button className="btn" data-variant="primary" type="submit" data-testid="search-submit">
        Search
      </button>
      <span className={styles.ai}>
        <Switch checked={understand} onChange={(next) => go(value || q, next)} label="Understand my query (AI)" testId="search-understand" />
      </span>
    </form>
  );
}
