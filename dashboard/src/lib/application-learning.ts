import { db } from "./db";

export interface SubmittedAnswer {
  label: string;
  value: string;
  draftValue?: string;
  source?: string;
  isOpenEnded?: boolean;
}

function normalizeQuestion(q: string) {
  return q.toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

function questionSimilarity(a: string, b: string) {
  const na = normalizeQuestion(a);
  const nb = normalizeQuestion(b);
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 80;
  const wordsA = na.split(/\s+/).filter((w) => w.length > 3);
  const overlap = wordsA.filter((w) => nb.includes(w)).length;
  return overlap * 15;
}

export async function getSubmissionExamplesForAI(
  userId: string,
  limit = 8,
  currentQuestion?: string
): Promise<{ question: string; answer: string }[]> {
  const applications = await db.application.findMany({
    where: { userId },
    orderBy: { appliedAt: "desc" },
    take: 30,
    select: { submittedAnswers: true },
  });

  const examples: { question: string; answer: string; score: number }[] = [];

  for (const app of applications) {
    const answers = app.submittedAnswers as SubmittedAnswer[] | null;
    if (!Array.isArray(answers)) continue;

    for (const entry of answers) {
      const question = entry.label?.trim();
      const answer = (entry.value || entry.draftValue || "").trim();
      if (!question || !answer || answer.length < 20) continue;

      const score = currentQuestion
        ? questionSimilarity(currentQuestion, question)
        : entry.isOpenEnded
          ? 50
          : 30;

      examples.push({ question, answer, score });
    }
  }

  examples.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const result: { question: string; answer: string }[] = [];
  for (const ex of examples) {
    const key = normalizeQuestion(ex.question);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ question: ex.question, answer: ex.answer });
    if (result.length >= limit) break;
  }

  return result;
}

export async function findSimilarSavedAnswer(
  userId: string,
  question: string
): Promise<string | null> {
  const examples = await getSubmissionExamplesForAI(userId, 3, question);
  const best = examples[0];
  if (!best) return null;
  if (questionSimilarity(question, best.question) >= 60) return best.answer;
  return null;
}
