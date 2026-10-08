import { AuthPage } from "@/components/auth-page";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return <AuthPage mode="login" />;
}
