"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SubscribeSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Subscription active
        </h1>
        <p className="mt-4 text-neutral-600">
          Your plan is now active. Install the Chrome extension from Settings and
          start applying.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-block rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
