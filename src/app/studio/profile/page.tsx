import type { Metadata } from "next";
import { AuthorProfile } from "@/components/studio/AuthorProfile";

/** Session-gated (see studio/layout.tsx): opt out of instant-navigation validation for this segment. */
export const instant = false;

export const metadata: Metadata = { title: "Profile" };

/** Studio: your author profile (F11). */
export default function ProfilePage() {
  return <AuthorProfile />;
}
