import Link from "next/link";

export function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--brand-dark)] p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-dark-elevated)] to-transparent" />
        <div className="relative">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Swiftdroom
          </Link>
        </div>
        <div className="relative max-w-md">
          <p className="text-3xl font-semibold leading-tight text-[var(--brand-hero-accent)]">
            Stop retyping your resume.
          </p>
          <p className="mt-4 text-lg text-white/70">
            Start getting interviews with autofill built for Workday, Greenhouse, and Lever.
          </p>
        </div>
        <p className="relative text-xs text-white/35">
          Job applications, without the repetition.
        </p>
      </div>

      <div className="flex flex-col bg-[color-mix(in_srgb,var(--brand-mint)_35%,white)]">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Link href="/" className="text-lg font-semibold text-[var(--brand-header)]">
            Swiftdroom
          </Link>
          <Link
            href="/"
            className="text-sm text-[var(--brand-header)]/55 hover:text-[var(--brand-header)]"
          >
            Home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-4 lg:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
