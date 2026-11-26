import { redirect } from "next/navigation";

/** The planification team no longer exists: its dossiers ("Cellule plani" open) are in the follow-up. */
export default function Page() {
  redirect("/admin/suivi?route=PLANIFICATION");
}
