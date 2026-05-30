import { Suspense } from "react";
import SubscribePageContent from "./SubscribeContent";

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-50">
          <p className="text-neutral-500">Loading...</p>
        </div>
      }
    >
      <SubscribePageContent />
    </Suspense>
  );
}
