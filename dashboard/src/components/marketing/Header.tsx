import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
          Swiftdroom
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm text-neutral-600 hover:text-neutral-900">
            Features
          </Link>
          <Link href="#testimonials" className="text-sm text-neutral-600 hover:text-neutral-900">
            Testimonials
          </Link>
          <Link href="#blog" className="text-sm text-neutral-600 hover:text-neutral-900">
            Blog
          </Link>
          <Link href="#pricing" className="text-sm text-neutral-600 hover:text-neutral-900">
            Pricing
          </Link>
          <Link href="#faq" className="text-sm text-neutral-600 hover:text-neutral-900">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Start free setup
          </Link>
        </div>
      </div>
    </header>
  );
}

