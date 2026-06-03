import { SectionLabel, SectionTitle } from "@/components/marketing/marketing-ui";

const TESTIMONIALS = [
  {
    quote:
      "I was applying to 15 roles a week and burning out on the same Workday forms. Swiftdroom cut my time per application from 35 minutes to under 5.",
    name: "Marcus Chen",
    role: "Software Engineer",
    hiredAt: "Stripe",
  },
  {
    quote:
      "The AI answers actually sound like me — not generic ChatGPT fluff. I landed three interviews in two weeks after switching from manual applications.",
    name: "Jessica Morales",
    role: "Product Manager",
    hiredAt: "HubSpot",
  },
  {
    quote:
      "As a career switcher, I had to rewrite my story for every role. Personas let me keep a PM version and an ops version without starting from scratch.",
    name: "Tyler Brennan",
    role: "Operations Lead",
    hiredAt: "Salesforce",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="border-b border-[var(--al-border)] bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionLabel>Testimonials</SectionLabel>
        <SectionTitle className="mt-3">What our users say</SectionTitle>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {TESTIMONIALS.map(({ quote, name, role, hiredAt }) => (
            <figure key={name} className="flex flex-col">
              <blockquote className="font-serif text-xl leading-snug text-[var(--al-black)] md:text-2xl">
                &ldquo;{quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6">
                <p className="font-semibold text-[var(--al-black)]">{name}</p>
                <p className="text-sm text-[var(--al-muted)]">
                  {role} · Now at {hiredAt}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
