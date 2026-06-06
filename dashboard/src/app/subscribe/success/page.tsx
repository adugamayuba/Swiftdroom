import { Suspense } from "react";
import SubscribeSuccessContent from "./SubscribeSuccessContent";

export default function SubscribeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-50">
          <p className="text-neutral-500">Loading...</p>
        </div>
      }
    >
      <SubscribeSuccessContent />
    </Suspense>
  );
}
