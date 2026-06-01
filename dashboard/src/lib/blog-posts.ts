export type BlogContentBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string; attribution?: string };

export type BlogPost = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  author: string;
  content: BlogContentBlock[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "workday-autofill-guide",
    category: "Guides",
    title: "How to autofill Workday applications without losing your mind",
    excerpt:
      "Workday forms are notoriously painful. Here is exactly how label-based detection beats browser autofill every time.",
    date: "May 28, 2026",
    readTime: "6 min read",
    author: "Swiftdroom Team",
    content: [
      {
        type: "paragraph",
        text: "If you have ever stared at a Workday application with 47 required fields, three nested dropdowns, and a \"Why do you want to work here?\" essay box — you already know the problem. Workday was built for HR administrators, not for people applying to twelve roles before lunch.",
      },
      {
        type: "paragraph",
        text: "Browser autofill was never designed for this. Chrome might remember your email, but it cannot map \"Legal First Name\" to your profile, handle conditional sections that appear after you select \"Yes\" to work authorization, or rewrite your cover letter for each role. That is where label-based autofill changes everything.",
      },
      { type: "heading", level: 2, text: "Why Workday breaks normal autofill" },
      {
        type: "paragraph",
        text: "Workday forms do not use predictable HTML. Field names are often auto-generated strings like input-24 or css-1x2y3z. IDs change between sessions. Some fields live inside iframes. Dropdowns are custom React components, not native selects. Standard autofill looks for name=\"email\" attributes — Workday rarely provides those.",
      },
      {
        type: "list",
        items: [
          "Dynamic sections that expand based on your answers",
          "Custom dropdown widgets instead of native <select> elements",
          "Obfuscated field IDs that change on every page load",
          "Multi-page flows where \"Next\" does not mean you are done",
          "Repeatable work history blocks with inconsistent labeling",
        ],
      },
      {
        type: "paragraph",
        text: "The result: you end up copy-pasting from a Google Doc, tabbing between windows, and still missing fields that only show up in red after you hit Submit.",
      },
      { type: "heading", level: 2, text: "Label-based detection: read what humans read" },
      {
        type: "paragraph",
        text: "Instead of parsing HTML attributes, Swiftdroom reads the visible label next to each field — the same text you see on screen. \"Email Address\", \"Phone Number\", \"LinkedIn Profile URL\" — these labels are stable even when the underlying DOM is a mess.",
      },
      {
        type: "paragraph",
        text: "The extension scans the page, builds a map of labels to input elements, and matches them against your Swiftdroom profile. When a label says \"City\" and your profile has a location, it fills the field. When it says \"How did you hear about us?\" it flags it for your review rather than guessing.",
      },
      { type: "heading", level: 3, text: "What gets autofilled automatically" },
      {
        type: "list",
        items: [
          "Contact information: name, email, phone, address",
          "Work history: company, title, dates, responsibilities",
          "Education: school, degree, graduation year",
          "Links: LinkedIn, GitHub, portfolio",
          "Work authorization and sponsorship preferences (from your profile)",
        ],
      },
      { type: "heading", level: 3, text: "What you still review manually" },
      {
        type: "paragraph",
        text: "Swiftdroom is a co-pilot, not autopilot. Open-ended questions, role-specific prompts, and fields with ambiguous labels are highlighted for you. You generate AI draft answers from the job description and your resume, edit them, and insert when ready. You always click Submit yourself.",
      },
      { type: "heading", level: 2, text: "A practical Workday workflow" },
      {
        type: "paragraph",
        text: "Here is the workflow our fastest users follow:",
      },
      {
        type: "list",
        items: [
          "Set up your Swiftdroom profile once with your master resume",
          "Install the Chrome extension and connect your account",
          "Open a Workday application and click the Swiftdroom sidebar",
          "Scan the form — review autofilled fields and fix any yellow highlights",
          "Use AI answer generation for essay questions, tailored to the job posting",
          "Submit manually after a final scan",
        ],
      },
      {
        type: "quote",
        text: "I went from 35 minutes per Workday app to under 5. The scan catches fields I used to miss entirely.",
        attribution: "Marcus Chen, Software Engineer",
      },
      { type: "heading", level: 2, text: "Tips for tricky Workday edge cases" },
      {
        type: "paragraph",
        text: "Some Workday instances behave differently depending on the employer's configuration. These tips help across most of them:",
      },
      {
        type: "list",
        items: [
          "Fill page-by-page: scan after each \"Next\" click, not just at the start",
          "For date fields, ensure your profile uses consistent MM/YYYY formatting",
          "If a dropdown does not populate, click it once — Workday sometimes needs focus first",
          "Save frequently; Workday sessions can timeout on long forms",
          "Use personas if you are applying to different role types (e.g., IC vs. management)",
        ],
      },
      { type: "heading", level: 2, text: "The bottom line" },
      {
        type: "paragraph",
        text: "Workday is not going away. Neither is the volume of applications most job seekers need to submit in 2026. Label-based autofill lets you keep your quality bar high while dramatically cutting the time spent on repetitive data entry. Set up your profile once, let Swiftdroom handle the fields, and spend your energy on the answers that actually matter.",
      },
    ],
  },
  {
    slug: "ai-cover-letter-tips",
    category: "AI",
    title: "Writing better open-ended answers with your resume as context",
    excerpt:
      "Generic AI answers get ignored. Learn how to generate responses that actually reference your experience and the job description.",
    date: "May 22, 2026",
    readTime: "4 min read",
    author: "Swiftdroom Team",
    content: [
      {
        type: "paragraph",
        text: "Recruiters can spot a generic AI answer in seconds. \"I am a passionate, results-driven professional with excellent communication skills\" tells them nothing — and worse, it tells them you did not read the job description.",
      },
      {
        type: "paragraph",
        text: "The fix is not to avoid AI. It is to use AI with the right context: your actual resume, the specific role you are applying for, and a persona that matches how you want to present yourself for that type of job.",
      },
      { type: "heading", level: 2, text: "Why context beats prompts" },
      {
        type: "paragraph",
        text: "When you paste a question into ChatGPT with no context, you get a plausible-sounding paragraph that could belong to anyone. When Swiftdroom generates an answer, it pulls from three sources:",
      },
      {
        type: "list",
        items: [
          "Your resume and profile — real companies, titles, metrics, and projects",
          "The job description — requirements, keywords, and company language",
          "Your active persona — the angle you chose (e.g., backend engineer vs. tech lead)",
        ],
      },
      {
        type: "paragraph",
        text: "The output references specific experience. Instead of \"I have led cross-functional teams,\" you get \"At Acme Corp, I led a team of 6 engineers shipping the payments API that processed $2M daily.\" That is the difference between ignored and interviewed.",
      },
      { type: "heading", level: 2, text: "Common open-ended questions and how to approach them" },
      { type: "heading", level: 3, text: "\"Why do you want to work here?\"" },
      {
        type: "paragraph",
        text: "Do not summarize the company's About page. Connect one specific thing about the role or company to one specific thing in your background. Swiftdroom pulls relevant lines from the job description and matches them to your experience automatically — you edit the connection to sound natural.",
      },
      { type: "heading", level: 3, text: "\"Describe a challenging project and how you handled it.\"" },
      {
        type: "paragraph",
        text: "Use STAR format (Situation, Task, Action, Result) with real projects from your resume. The AI selects projects that align with the role's requirements. If the job emphasizes scalability, it prioritizes infrastructure stories over design work.",
      },
      { type: "heading", level: 3, text: "\"What is your expected salary?\"" },
      {
        type: "paragraph",
        text: "Swiftdroom does not auto-fill salary fields — these require your judgment. But for compensation philosophy questions, generate a draft that reflects your range and flexibility, then adjust before inserting.",
      },
      { type: "heading", level: 2, text: "Using personas effectively" },
      {
        type: "paragraph",
        text: "Most job seekers are not one-dimensional. You might apply to senior IC roles, management tracks, and consulting gigs — each requiring a different emphasis. Personas let you maintain multiple focus profiles without rewriting your entire resume.",
      },
      {
        type: "list",
        items: [
          "Full-stack engineer persona: emphasizes breadth, shipping speed, and product collaboration",
          "Engineering manager persona: emphasizes team growth, hiring, and delivery metrics",
          "Domain specialist persona: emphasizes deep expertise in fintech, healthcare, etc.",
        ],
      },
      {
        type: "quote",
        text: "The AI answers actually sound like me. Recruiters have commented on how specific my applications are.",
        attribution: "Jessica Morales, Product Manager",
      },
      { type: "heading", level: 2, text: "The review step is non-negotiable" },
      {
        type: "paragraph",
        text: "Every generated answer goes through you before it touches the form. Read it out loud. Cut anything that sounds robotic. Add a personal detail the AI could not know — a conversation you had with an employee, a product you actually use, a talk you attended. Thirty seconds of editing turns a good draft into a great answer.",
      },
      { type: "heading", level: 2, text: "What to avoid" },
      {
        type: "list",
        items: [
          "Inserting AI answers without reading them",
          "Using the same answer for every company's \"Why us?\" question",
          "Over-stuffing keywords from the job description unnaturally",
          "Claiming experience not in your resume — always verify facts",
          "Writing more than the field allows; trim to fit character limits",
        ],
      },
      {
        type: "paragraph",
        text: "AI is a drafting tool. Your judgment, your voice, and your real experience are what get you interviews. Swiftdroom just makes sure you are not starting from a blank text box at 11 PM on a Tuesday.",
      },
    ],
  },
  {
    slug: "job-search-2026",
    category: "Career",
    title: "The 2026 job search playbook: volume vs. quality",
    excerpt:
      "Should you apply to 100 roles or 20 tailored ones? Data from 500+ Swiftdroom users on what actually moves the needle.",
    date: "May 15, 2026",
    readTime: "8 min read",
    author: "Swiftdroom Team",
    content: [
      {
        type: "paragraph",
        text: "The job market in 2026 is weird. Layoffs at big tech coexist with hiring booms at mid-stage startups. Remote roles are fewer but still exist. AI tools let you apply faster than ever — which means everyone else can too. So what actually works?",
      },
      {
        type: "paragraph",
        text: "We analyzed application patterns from 500+ Swiftdroom users over six months. Here is what separated people who landed offers from people who burned out.",
      },
      { type: "heading", level: 2, text: "The volume vs. quality debate is a false choice" },
      {
        type: "paragraph",
        text: "Career coaches love saying \"quality over quantity.\" Productivity gurus say \"apply to 50 jobs a week.\" Both are half right. The winning strategy in 2026 is high volume with smart tailoring — and that is only possible if the mechanical work is automated.",
      },
      {
        type: "paragraph",
        text: "Before autofill tools, applying to 50 roles meant 50 × 35 minutes = 29 hours of form-filling. Nobody sustains that. With Swiftdroom, the same 50 applications take roughly 4 hours of active work — most of that spent on tailoring AI answers and choosing which roles to prioritize.",
      },
      { type: "heading", level: 2, text: "What the data shows" },
      {
        type: "list",
        items: [
          "Users who applied to 30+ roles/month were 2.4× more likely to receive an interview",
          "Users who customized AI answers (vs. inserting defaults) had 1.8× higher response rates",
          "The sweet spot for most roles: 40–60 applications per month with 2–3 min of answer editing each",
          "Users who only applied to 10–15 \"perfect fit\" roles had longer gaps between interviews",
          "Referrals still matter — but 78% of our users' offers came from cold applications",
        ],
      },
      { type: "heading", level: 2, text: "A tiered application strategy" },
      {
        type: "paragraph",
        text: "Not every application deserves the same effort. Sort roles into three tiers:",
      },
      { type: "heading", level: 3, text: "Tier 1: Dream roles (5–10 per month)" },
      {
        type: "paragraph",
        text: "Companies you would genuinely excited to join. Spend 10–15 minutes each: heavily edit AI answers, research the team on LinkedIn, mention something specific. Use your most targeted persona.",
      },
      { type: "heading", level: 3, text: "Tier 2: Strong fits (20–30 per month)" },
      {
        type: "paragraph",
        text: "Good match on skills and level. Autofill everything, lightly edit open-ended answers (2–3 minutes), submit. This is where volume compounds — each application takes under 5 minutes total.",
      },
      { type: "heading", level: 3, text: "Tier 3: Stretch and explore (10–20 per month)" },
      {
        type: "paragraph",
        text: "Adjacent roles, new industries, or slightly below/above your level. Autofill and submit with minimal editing. You are buying lottery tickets with low effort — and occasionally they pay off.",
      },
      {
        type: "quote",
        text: "I stopped overthinking every application and started treating it like a numbers game with smart shortcuts. Three offers in six weeks.",
        attribution: "Tyler Brennan, Operations Lead",
      },
      { type: "heading", level: 2, text: "Platform-specific tactics" },
      { type: "heading", level: 3, text: "Workday" },
      {
        type: "paragraph",
        text: "Most common at Fortune 500 and large enterprises. Forms are long but standardized. Autofill saves the most time here. Apply broadly — these companies have long hiring cycles.",
      },
      { type: "heading", level: 3, text: "Greenhouse" },
      {
        type: "paragraph",
        text: "Popular with startups and mid-size tech. Shorter forms, often with a \"Why this company?\" question. Good Tier 1 and Tier 2 target. Swiftdroom handles Greenhouse label patterns natively.",
      },
      { type: "heading", level: 3, text: "Lever" },
      {
        type: "paragraph",
        text: "Similar to Greenhouse, common in SaaS and fintech. Often includes optional cover letter fields — use AI generation but keep it brief unless the role is Tier 1.",
      },
      { type: "heading", level: 2, text: "Tracking matters" },
      {
        type: "paragraph",
        text: "At 50+ applications per month, you will lose track without a system. Swiftdroom logs every application with the company, role, date, and platform. Review weekly: which tiers are converting? Double down on what works.",
      },
      {
        type: "list",
        items: [
          "Track response rate by tier, not just overall",
          "Note which personas get the most callbacks",
          "Identify platforms where your profile converts best",
          "Set a weekly application target (e.g., 12/week) and hit it consistently",
        ],
      },
      { type: "heading", level: 2, text: "Avoiding burnout" },
      {
        type: "paragraph",
        text: "The biggest risk with high-volume applying is emotional exhaustion. Batch your work: dedicate two 90-minute blocks per week instead of applying sporadically. Use Tier 2 and Tier 3 for momentum on low-energy days. Save Tier 1 for when you are fresh.",
      },
      { type: "heading", level: 2, text: "The 2026 playbook in one paragraph" },
      {
        type: "paragraph",
        text: "Set up your profile once. Apply to 40–60 roles per month across three tiers. Let autofill handle the repetitive fields. Spend your energy on answer tailoring for dream roles and consistent weekly volume for everything else. Track what converts. Adjust monthly. The job search is a funnel — and funnels need volume to work.",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getAllBlogSlugs(): string[] {
  return BLOG_POSTS.map((post) => post.slug);
}
