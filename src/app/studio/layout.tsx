import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { serverEnv } from "@/lib/env/server";
import { StudioGate } from "@/app/_components/StudioGate";

/**
 * Studio reads the session on every render and redirects when signed out, so it can't be part of an
 * instant (prefetched) navigation shell — opt out of instant validation (Next 16 auth guide).
 */
export const instant = false;

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Studio" }, robots: { index: false, follow: false } };

/** Studio (F07–F11). Never cached; private + noindex headers come from proxy.ts (X04-AC-5). */
export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  if (!serverEnv().FEATURE_STUDIO) notFound();
  return (
    <main id="main" data-view="studio">
      <Suspense fallback={<div className="wrap" style={{ paddingBlock: 32 }}><div className="skel" style={{ height: 240 }} /></div>}>
        <StudioGate>{children}</StudioGate>
      </Suspense>
    </main>
  );
}
