import { Workspace } from "@/components/workspace";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadWorkspace } from "@/lib/workspace-data";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <Workspace userEmail={session.user.email} initialData={await loadWorkspace(session.userId)} />
  );
}
