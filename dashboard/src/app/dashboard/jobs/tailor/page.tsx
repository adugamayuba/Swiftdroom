import { Suspense } from "react";
import TailorResumePage from "./TailorResumePage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-neutral-500">Loading…</div>}>
      <TailorResumePage />
    </Suspense>
  );
}
