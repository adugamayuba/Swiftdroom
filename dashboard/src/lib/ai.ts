import OpenAI from "openai";
import {
  renderResumeHtml,
  renderPlainText,
  type TailoredResumeData,
} from "./resume-template";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface PastAnswerExample {
  question: string;
  answer: string;
}

interface GenerateParams {
  question: string;
  jobDescription: string;
  resumeText: string;
  personaSummary: string;
  personaFocus: string;
  company?: string;
  role?: string;
  pastAnswers?: PastAnswerExample[];
  type?: "answer" | "cover_letter" | "smart_field";
}

export async function generateAnswer(params: GenerateParams): Promise<string> {
  const {
    question,
    jobDescription,
    resumeText,
    personaSummary,
    personaFocus,
    company,
    role,
    pastAnswers = [],
    type = "answer",
  } = params;

  const styleExamples =
    pastAnswers.length > 0
      ? `\n\nThe candidate's past application answers (match this voice and specificity):\n${pastAnswers
          .map(
            (ex, i) =>
              `Example ${i + 1}\nQ: ${ex.question}\nA: ${ex.answer}`
          )
          .join("\n\n")}`
      : "";

  const isCoverLetter = type === "cover_letter";
  const isSmartField = type === "smart_field";

  const systemPrompt = isCoverLetter
    ? `You are an expert career writer. Write a concise, compelling cover letter for a job application.
Rules:
- 3–4 short paragraphs, professional but human
- Open with genuine interest in the role/company — no "To Whom It May Concern"
- Tie 2–3 specific resume achievements to the job description
- Never invent employers, degrees, or projects not in the resume
- Close with enthusiasm and availability
- No markdown, no placeholders like [Company Name] — use the company name provided or "your team"
- Under 350 words`
    : isSmartField
      ? `You answer a single job application form field based on the candidate's resume.
Rules:
- One concise answer only — no preamble
- Ground every claim in the resume
- Match the field type (years, title, school, skills, etc.)
- Under 80 words unless the field clearly needs more`
      : `You are a job application co-pilot. Write concise, authentic first-person answers for application forms.
Rules:
- Be specific and grounded in the candidate's actual experience
- Match the tone of the question (professional but human)
- Keep answers under 200 words unless the question clearly needs more
- Never invent employers, degrees, or projects not in the resume
- Tailor to the job description and persona focus
- When past answers are provided, mirror the candidate's writing style and level of detail
- Do not use markdown formatting`;

  const userPrompt = isCoverLetter
    ? `Write a cover letter for this application.

${company ? `Company: ${company}` : ""}
${role ? `Role: ${role}` : ""}

Persona focus: ${personaFocus}
Summary: ${personaSummary}

Resume:
${resumeText || "No resume provided"}

Job description:
${jobDescription || "No job description detected"}${styleExamples}`
    : `Question/field: ${question}

${company ? `Company: ${company}` : ""}
${role ? `Role: ${role}` : ""}

Persona focus: ${personaFocus}
Persona summary: ${personaSummary}

Resume:
${resumeText || "No resume provided"}

Job description (from page):
${jobDescription || "No job description detected"}${styleExamples}

Write the answer:`;

  if (!openai) {
    return `[Demo mode — add OPENAI_API_KEY to enable AI]

Based on my ${personaFocus || "professional"} background${company ? ` and interest in ${company}` : ""}, ${personaSummary || "I bring relevant experience that aligns with this role."}

${resumeText ? "My experience includes work detailed in my resume, and I'm excited to contribute to this team's goals." : "I'd welcome the opportunity to discuss how my skills fit this position."}`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

export const FIELD_KEY_MAP: Record<string, string[]> = {
  firstName: ["first name", "given name", "fname", "legal first"],
  lastName: ["last name", "family name", "surname", "lname", "legal last"],
  fullName: ["full name", "name", "legal name"],
  email: ["email", "e-mail"],
  phone: ["phone", "mobile", "telephone", "cell"],
  location: ["location", "city", "address", "where are you located"],
  linkedinUrl: ["linkedin", "linked in"],
  githubUrl: ["github", "git hub"],
  portfolioUrl: ["portfolio", "website", "personal site"],
};

export function matchFieldKey(label: string): string | null {
  const normalized = label.toLowerCase().trim();
  for (const [key, patterns] of Object.entries(FIELD_KEY_MAP)) {
    if (patterns.some((p) => normalized.includes(p))) return key;
  }
  return null;
}

export interface TailoredResumeResult {
  plainText: string;
  html: string;
  fileName: string;
}

export async function tailorResume(params: {
  resumeText: string;
  jobDescription: string;
  company?: string;
  role?: string;
  personaFocus?: string;
}): Promise<TailoredResumeResult> {
  const { resumeText, jobDescription, company, role, personaFocus } = params;

  const systemPrompt = `You are an expert resume writer and ATS optimizer. Extract and rewrite the candidate's resume tailored to a specific job.
Rules:
- Keep all facts truthful — never invent employers, dates, degrees, or tools not in the original resume
- Reorder and emphasize bullets that match the job description keywords
- Use strong action verbs and quantified outcomes where the source resume supports them
- Summary: 2 compelling lines max, tailored to the target role
- 3–5 bullets per recent role; trim older roles
- Skills: 8–14 relevant skills as short strings

Return JSON only with this shape:
{
  "name": "Full Name",
  "contactLine": "email · phone · city · linkedin",
  "summary": "...",
  "experience": [{"title":"","company":"","dates":"","location":"","bullets":["..."]}],
  "education": [{"degree":"","school":"","dates":"","details":""}],
  "skills": ["..."]
}`;

  const userPrompt = `Tailor this resume for the job below.

${company ? `Target company: ${company}` : ""}
${role ? `Target role: ${role}` : ""}
${personaFocus ? `Focus: ${personaFocus}` : ""}

ORIGINAL RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription || "Not provided"}`;

  const slug = (company || role || "resume")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  if (!openai) {
    const fallback: TailoredResumeData = {
      name: "Your Name",
      contactLine: "Add contact details in your profile",
      summary: resumeText.split("\n").slice(0, 2).join(" ").slice(0, 200),
      experience: [],
      education: [],
      skills: [],
    };
    return {
      plainText: renderPlainText(fallback),
      html: renderResumeHtml(fallback),
      fileName: `swiftdroom-resume-${slug || "tailored"}.html`,
    };
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 3500,
    temperature: 0.45,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content?.trim() || "{}";
  try {
    const parsed = JSON.parse(raw) as TailoredResumeData;
    const data: TailoredResumeData = {
      name: parsed.name?.trim() || "Candidate",
      contactLine: parsed.contactLine?.trim() || "",
      summary: parsed.summary?.trim() || "",
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    };
    return {
      plainText: renderPlainText(data),
      html: renderResumeHtml(data),
      fileName: `swiftdroom-resume-${slug || "tailored"}.html`,
    };
  } catch {
    return {
      plainText: resumeText,
      html: renderResumeHtml({
        name: "Resume",
        contactLine: "",
        summary: resumeText.slice(0, 300),
        experience: [],
        education: [],
        skills: [],
      }),
      fileName: `swiftdroom-resume-${slug || "tailored"}.html`,
    };
  }
}
