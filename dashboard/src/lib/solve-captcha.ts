/**
 * reCAPTCHA Enterprise solver.
 *
 * Greenhouse uses reCAPTCHA Enterprise Invisible on all job applications.
 *   Site key:  6LfmcbcpAAAAAChNTbhUShzUOAMj_wY9LQIvLFX0  (same US + EU)
 *   Action:    apply_to_job
 *
 * Provider priority:
 *   1. CapSolver  (CAPSOLVER_API_KEY)  — better Enterprise scores, stealth browser
 *   2. 2captcha   (CAPTCHA_API_KEY)    — fallback
 *
 * Cost: ~$1–3 per 1000 solves.
 *   CapSolver:  https://capsolver.com   (~$0.80/1000 for Enterprise)
 *   2captcha:   https://2captcha.com   (~$2.99/1000 for Enterprise)
 */

const GH_RECAPTCHA_KEY = "6LfmcbcpAAAAAChNTbhUShzUOAMj_wY9LQIvLFX0";
const GH_RECAPTCHA_ACTION = "apply_to_job";

// ---------- CapSolver ----------

async function solveWithCapSolver(pageUrl: string): Promise<string | null> {
  const apiKey = process.env.CAPSOLVER_API_KEY;
  if (!apiKey) return null;

  try {
    const createRes = await fetch("https://api.capsolver.com/createTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientKey: apiKey,
        task: {
          type: "ReCaptchaV3EnterpriseTaskProxyLess",
          websiteURL: pageUrl,
          websiteKey: GH_RECAPTCHA_KEY,
          pageAction: GH_RECAPTCHA_ACTION,
        },
      }),
    });

    const createData = (await createRes.json()) as {
      errorId?: number;
      taskId?: string;
      errorCode?: string;
      errorDescription?: string;
    };

    if (createData.errorId || !createData.taskId) {
      console.warn("[captcha:capsolver] create failed:", createData.errorCode, createData.errorDescription);
      return null;
    }

    const taskId = createData.taskId;
    console.info(`[captcha:capsolver] task ${taskId} created`);

    // Poll every 3s up to 60s
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));

      const res = await fetch("https://api.capsolver.com/getTaskResult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey: apiKey, taskId }),
      });

      const data = (await res.json()) as {
        errorId?: number;
        status?: string;
        solution?: { gRecaptchaResponse?: string };
        errorCode?: string;
      };

      if (data.errorId) {
        console.warn("[captcha:capsolver] poll error:", data.errorCode);
        return null;
      }
      if (data.status === "ready") {
        const token = data.solution?.gRecaptchaResponse;
        if (token) {
          console.info(`[captcha:capsolver] solved — token length ${token.length}`);
          return token;
        }
      }
    }

    console.warn("[captcha:capsolver] timed out");
    return null;
  } catch (err) {
    console.error("[captcha:capsolver] error:", err);
    return null;
  }
}

// ---------- 2captcha ----------

async function solveWith2Captcha(pageUrl: string): Promise<string | null> {
  const apiKey = process.env.CAPTCHA_API_KEY;
  if (!apiKey) return null;

  try {
    const createRes = await fetch("https://api.2captcha.com/createTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientKey: apiKey,
        task: {
          type: "RecaptchaV3TaskProxyless",
          websiteURL: pageUrl,
          websiteKey: GH_RECAPTCHA_KEY,
          minScore: 0.3,
          pageAction: GH_RECAPTCHA_ACTION,
          isEnterprise: true,
        },
      }),
    });

    const createData = (await createRes.json()) as {
      errorId?: number;
      taskId?: number;
      errorDescription?: string;
    };

    if (createData.errorId || !createData.taskId) {
      console.warn("[captcha:2captcha] create failed:", createData.errorDescription);
      return null;
    }

    const taskId = createData.taskId;
    console.info(`[captcha:2captcha] task ${taskId} created`);

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));

      const res = await fetch("https://api.2captcha.com/getTaskResult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey: apiKey, taskId }),
      });

      const data = (await res.json()) as {
        errorId?: number;
        status?: string;
        solution?: { gRecaptchaResponse?: string };
        errorDescription?: string;
      };

      if (data.errorId) {
        console.warn("[captcha:2captcha] poll error:", data.errorDescription);
        return null;
      }
      if (data.status === "ready") {
        const token = data.solution?.gRecaptchaResponse;
        if (token) {
          console.info(`[captcha:2captcha] solved — token length ${token.length}`);
          return token;
        }
      }
    }

    console.warn("[captcha:2captcha] timed out");
    return null;
  } catch (err) {
    console.error("[captcha:2captcha] error:", err);
    return null;
  }
}

// ---------- Public API ----------

/**
 * Solve a Greenhouse reCAPTCHA Enterprise challenge.
 * Tries CapSolver first (better Enterprise scores), falls back to 2captcha.
 */
export async function solveGreenhouseCaptcha(pageUrl: string): Promise<string | null> {
  // CapSolver preferred — uses stealth browser, gets higher Enterprise scores
  const capSolverToken = await solveWithCapSolver(pageUrl);
  if (capSolverToken) return capSolverToken;

  // 2captcha fallback
  const twoCaptchaToken = await solveWith2Captcha(pageUrl);
  return twoCaptchaToken;
}
