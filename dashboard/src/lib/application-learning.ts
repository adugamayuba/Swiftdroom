import { db } from "./db";

export interface SubmittedAnswer {
  label: string;
  value: string;
  draftValue?: string;
  source?: string;
  isOpenEnded?: boolean;
}

export async function getSubmissionExamplesForAI(
  userId: string,
  limit = 8
): Promise<{ question: string; answer: string }[]> {
  const applications = await db.application.findMany({
    where: { userId },
    orderBy: { appliedAt: "desc" },
    take: 20,
    select: { submittedAnswers: true },
  });

  const examples: { question: string; answer: string }[] = [];

  for (const app of applications) {
    const answers = app.submittedAnswers as SubmittedAnswer[] | null;
    if (!Array.isArray(answers)) continue;

    for (const entry of answers) {
      if (!entry.isOpenEnded) continue;
      const question = entry.label?.trim();
      const answer = entry.value?.trim();
      if (!question || !answer || answer.length < 40) continue;
      examples.push({ question, answer });
      if (examples.length >= limit) return examples;
    }
  }

  return examples;
}
