import type { Metadata } from "next";
import { StudioArticles } from "@/components/studio/StudioArticles";

/** Session-gated (see studio/layout.tsx): opt out of instant-navigation validation for this segment. */
export const instant = false;

export const metadata: Metadata = { title: "Articles" };

/** Studio: articles (F07). */
export default function StudioArticlesPage() {
  return <StudioArticles />;
}
