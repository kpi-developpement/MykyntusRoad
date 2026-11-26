import { redirect } from "next/navigation";

/** The admin no longer dispatches: the pilots take their dossiers themselves (column "Pilote"). */
export default function Page() {
  redirect("/admin/suivi");
}
