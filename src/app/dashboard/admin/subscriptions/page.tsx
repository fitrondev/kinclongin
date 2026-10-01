import { redirect } from "next/navigation";

export default function DashboardAdminSubscriptionsRedirect() {
  redirect("/dashboard/membership");
}
