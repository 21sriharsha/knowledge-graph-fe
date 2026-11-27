import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { uuidSchema } from "@/lib/validation";
import { RunDetail } from "@/components/studio/RunDetail";

/** Session-gated (see studio/layout.tsx): opt out of instant-navigation validation for this segment. */
export const instant = false;

export const metadata: Metadata = { title: "Sync run" };

/** Studio: run detail (F09-FR-3). */
export default function RunPage({ params }: PageProps<"/studio/runs/[id]">) {
  return (
    <Suspense fallback={<div className="skel" style={{ height: 240 }} />}>
      <Run params={params} />
    </Suspense>
  );
}

async function Run({ params }: { params: PageProps<"/studio/runs/[id]">["params"] }) {
  const id = uuidSchema.safeParse((await params).id);
  if (!id.success) notFound();
  return <RunDetail id={id.data} />;
}
