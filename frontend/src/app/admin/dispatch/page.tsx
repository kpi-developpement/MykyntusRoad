import { Suspense } from "react";
import { DispatchPage } from "@/admin/pages/DispatchPage/DispatchPage";

export default function Page() {
  return (
    <Suspense>
      <DispatchPage />
    </Suspense>
  );
}
