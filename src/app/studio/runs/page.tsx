import type { Metadata } from "next";
import { Suspense } from "react";
import { SyncHistory } from "@/components/studio/SyncHistory";

/** Session-gated (see studio/layout.tsx): opt out of instant-navigation validation for this segment. */
export const instant = false;

export const metadata: Metadata = { title: "Sync history" };

/** Studio: sync history (F09). */
export default function RunsPage() {
  return (
    <Suspense fallback={<div className="skel" style={{ height: 200 }} />}>
      <SyncHistory />
    </Suspense>
  );
}
