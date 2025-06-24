import { redirect } from "next/navigation";

export default function SettingsPage() {
  // Redirect to API keys page by default
  redirect("/settings/keys");
}