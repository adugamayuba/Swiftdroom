import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface GenerateParams {
  question: string;
  jobDescription: string;
  resumeText: string;
  personaSummary: string;
  personaFocus: string;
  company?: string;
}

export async function generateAnswer(params: GenerateParams): Promise<string> {
  const {
    question,
    jobDescription,
    resumeText,
    personaSummary,
    personaFocus,
    company,
  } = params;

  const systemPrompt = `You are a job application co-pilot. Write concise, authentic first-person answers for application forms.
Rules:
- Be specific and grounded in the candidate's actual experience
- Match the tone of the question (professional but human)
- Keep answers under 200 words unless the question clearly needs more
- Never invent employers, degrees, or projects not in the resume
- Tailor to the job description and persona focus
- Do not use markdown formatting`;

  const userPrompt = `Question: ${question}

${company ? `Company: ${company}` : ""}

Persona focus: ${personaFocus}
Persona summary: ${personaSummary}

Resume:
${resumeText || "No resume provided"}

Job description (from page):
${jobDescription || "No job description detected"}

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
