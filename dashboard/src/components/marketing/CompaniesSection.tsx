const COMPANIES = [
  { name: "Google", color: "text-[#4285F4]" },
  { name: "Meta", color: "text-[#0668E1]" },
  { name: "Amazon", color: "text-[#FF9900]" },
  { name: "Microsoft", color: "text-[#00A4EF]" },
  { name: "Apple", color: "text-neutral-900" },
  { name: "Stripe", color: "text-[#635BFF]" },
  { name: "Salesforce", color: "text-[#00A1E0]" },
  { name: "Netflix", color: "text-[#E50914]" },
  { name: "Spotify", color: "text-[#1DB954]" },
  { name: "HubSpot", color: "text-[#FF7A59]" },
  { name: "Airbnb", color: "text-[#FF5A5F]" },
  { name: "Coinbase", color: "text-[#0052FF]" },
];

export function CompaniesSection() {
  return (
    <section className="border-b border-neutral-200 bg-neutral-950 py-20 text-white">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
          Where our users landed
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Hired at companies you know
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-neutral-400">
          Swiftdroom users have received offers from top tech, finance, and growth-stage companies.
        </p>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {COMPANIES.map(({ name, color }) => (
            <div
              key={name}
              className="flex h-16 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 transition hover:border-neutral-700 hover:bg-neutral-900"
            >
              <span className={`text-lg font-bold tracking-tight ${color}`}>
                {name}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-neutral-600">
          Company names shown represent reported outcomes from Swiftdroom users. Not affiliated with or endorsed by listed companies.
        </p>
      </div>
    </section>
  );
}
