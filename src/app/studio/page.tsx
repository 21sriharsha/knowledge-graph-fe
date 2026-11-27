import { redirect } from "next/navigation";

/** Session-gated (see studio/layout.tsx): opt out of instant-navigation validation for this segment. */
export const instant = false;

/** /studio → the first section. */
export default function StudioIndex() {
  redirect("/studio/articles");
}
