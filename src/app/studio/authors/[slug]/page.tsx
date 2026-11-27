import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { parseSlug } from "@/lib/validation";
import { AuthorProfile } from "@/components/studio/AuthorProfile";

/** Session-gated (see studio/layout.tsx): opt out of instant-navigation validation for this segment. */
export const instant = false;

export const metadata: Metadata = { title: "Author profile" };

/** Studio: edit any author (admins; the backend returns 404 to non-owners) (F11-FR-1). */
export default function AuthorEditPage({ params }: PageProps<"/studio/authors/[slug]">) {
  return (
    <Suspense fallback={<div className="skel" style={{ height: 240 }} />}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: PageProps<"/studio/authors/[slug]">["params"] }) {
  const slug = parseSlug((await params).slug);
  if (!slug) notFound();
  return <AuthorProfile slug={slug} />;
}
