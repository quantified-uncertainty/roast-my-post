import { redirect } from "next/navigation";

export default function ExplorePage() {
  // For now, redirect to the existing /docs page
  // In the future, this could be its own page with different filtering
  redirect("/docs");
}