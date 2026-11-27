import type { Metadata } from "next";
import { Repositories } from "@/components/studio/Repositories";

/** Session-gated (see studio/layout.tsx): opt out of instant-navigation validation for this segment. */
export const instant = false;

export const metadata: Metadata = { title: "Repositories" };

/** Studio: repositories (F08). */
export default function RepositoriesPage() {
  return <Repositories />;
}
