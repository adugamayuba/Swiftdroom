const TESTIMONIALS = [
  {
    quote:
      "I was applying to 15 roles a week and burning out on the same Workday forms. Swiftdroom cut my time per application from 35 minutes to under 5.",
    name: "Marcus Chen",
    role: "Software Engineer",
    location: "Austin, TX",
    hiredAt: "Stripe",
  },
  {
    quote:
      "The AI answers actually sound like me — not generic ChatGPT fluff. I landed three interviews in two weeks after switching from manual applications.",
    name: "Jessica Morales",
    role: "Product Manager",
    location: "Denver, CO",
    hiredAt: "HubSpot",
  },
  {
    quote:
      "As a career switcher, I had to rewrite my story for every role. Personas let me keep a PM version and an ops version without starting from scratch.",
    name: "Tyler Brennan",
    role: "Operations Lead",
    location: "Chicago, IL",
    hiredAt: "Salesforce",
  },
  {
    quote:
      "Greenhouse and Lever both worked on the first try. I stopped dreading Sunday application sessions entirely.",
    name: "Amanda Foster",
    role: "Marketing Manager",
    location: "Nashville, TN",
    hiredAt: "Spotify",
  },
  {
    quote:
      "I'm a recruiter by day and was job searching at night. Swiftdroom paid for itself after the first week — no exaggeration.",
    name: "David Okonkwo",
    role: "HR Business Partner",
    location: "Atlanta, GA",
    hiredAt: "Microsoft",
  },
  {
    quote:
      "My wife thought I was exaggerating until she watched me fill a 40-field Workday app in under three minutes. She signed up the same day.",
    name: "Ryan Patterson",
    role: "Data Analyst",
    location: "Columbus, OH",
    hiredAt: "Amazon",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative overflow-hidden bg-[var(--brand-dark)] py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-dark-elevated)] to-[var(--brand-dark)]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-white/50">
            Testimonials
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Real people. Real offers.
          </h2>
          <p className="mt-4 text-white/65">
            Job seekers using Swiftdroom across engineering, product, marketing, and ops.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map(({ quote, name, role, location, hiredAt }) => (
            <figure
              key={name}
              className="flex flex-col rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <blockquote className="flex-1 text-sm leading-relaxed text-white/85">
                &ldquo;{quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 border-t border-white/10 pt-4">
                <p className="font-semibold text-white">{name}</p>
                <p className="text-xs text-white/50">
                  {role} · {location}
                </p>
                <p className="mt-2 text-xs font-medium text-[var(--brand-lavender)]">
                  Now at {hiredAt}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
