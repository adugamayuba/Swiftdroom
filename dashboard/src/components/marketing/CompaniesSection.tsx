const COMPANIES = [
  { name: "Google", logo: "/logos/companies/google.png" },
  { name: "Meta", logo: "/logos/companies/meta.png" },
  { name: "Amazon", logo: "/logos/companies/amazon.webp" },
  { name: "Microsoft", logo: "/logos/companies/microsoft.webp" },
  { name: "Apple", logo: "/logos/companies/apple.png" },
  { name: "Stripe", logo: "/logos/companies/stripe.png" },
  { name: "Salesforce", logo: "/logos/companies/salesforce.png" },
  { name: "Netflix", logo: "/logos/companies/netflix.svg" },
  { name: "Spotify", logo: "/logos/companies/spotify.png" },
  { name: "HubSpot", logo: "/logos/companies/hubspot.png" },
  { name: "Airbnb", logo: "/logos/companies/airbnb.png" },
  { name: "Coinbase", logo: "/logos/companies/coinbase.png" },
];

export function CompaniesSection() {
  return (
    <section className="border-y border-white/10 bg-[var(--brand-dark-elevated)] py-20 text-white">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-white/45">
          Where our users landed
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          Hired at companies you know
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          Swiftdroom users have received offers from top tech, finance, and growth-stage companies.
        </p>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {COMPANIES.map(({ name, logo }) => (
            <div
              key={name}
              className="flex h-16 items-center justify-center rounded-md border border-white/10 bg-white px-4 py-3"
              title={name}
            >
              <img
                src={logo}
                alt={`${name} logo`}
                className="max-h-9 w-full max-w-[7.5rem] object-contain object-center"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-white/35">
          Company names shown represent reported outcomes from Swiftdroom users. Not affiliated with or endorsed by listed companies.
        </p>
      </div>
    </section>
  );
}
