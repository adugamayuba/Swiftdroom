/**
 * reCAPTCHA Enterprise solver via 2captcha API.
 *
 * Greenhouse uses reCAPTCHA Enterprise Invisible on all job applications.
 * Site key: 6LfmcbcpAAAAAChNTbhUShzUOAMj_wY9LQIvLFX0 (same for US + EU)
 * Action: "apply_to_job"
 *
 * Requires CAPTCHA_API_KEY env var (2captcha.com API key).
 * Cost: ~$1–2 per 1000 solves. Sign up at https://2captcha.com
 */

const GREENHOUSE_RECAPTCHA_KEY = "6LfmcbcpAAAAAChNTbhUShzUOAMj_wY9LQIvLFX0";
const GREENHOUSE_RECAPTCHA_ACTION = "apply_to_job";

/**
 * Solve a Greenhouse reCAPTCHA Enterprise challenge via 2captcha.
 * Returns the token string to include as `g-recaptcha-enterprise-token` in the POST body.
 * Returns null if no API key is configured or if solving fails.
 */
export async function solveGreenhouseCaptcha(pageUrl: string): Promise<string | null> {
  const apiKey = process.env.CAPTCHA_API_KEY;
  if (!apiKey) {
    console.warn("[captcha] CAPTCHA_API_KEY not set — skipping reCAPTCHA solve");
    return null;
  }

  try {
    // Create task
    const createRes = await fetch("https://api.2captcha.com/createTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientKey: apiKey,
        task: {
          type: "RecaptchaV3TaskProxyless",
          websiteURL: pageUrl,
          websiteKey: GREENHOUSE_RECAPTCHA_KEY,
          minScore: 0.3,
          pageAction: GREENHOUSE_RECAPTCHA_ACTION,
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
      console.warn("[captcha] create task failed:", createData.errorDescription);
      return null;
    }

    const taskId = createData.taskId;
    console.info(`[captcha] task ${taskId} created for ${pageUrl}`);

    // Poll for result (2captcha typically takes 10–30s for reCAPTCHA v3)
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));

      const resultRes = await fetch("https://api.2captcha.com/getTaskResult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey: apiKey, taskId }),
      });

      const resultData = (await resultRes.json()) as {
        errorId?: number;
        status?: string;
        solution?: { gRecaptchaResponse?: string };
        errorDescription?: string;
      };

      if (resultData.errorId) {
        console.warn("[captcha] get result error:", resultData.errorDescription);
        return null;
      }

      if (resultData.status === "ready") {
        const token = resultData.solution?.gRecaptchaResponse;
        if (token) {
          console.info(`[captcha] solved task ${taskId} (token length: ${token.length})`);
          return token;
        }
        return null;
      }
      // status === "processing" — keep polling
    }

    console.warn(`[captcha] task ${taskId} timed out`);
    return null;
  } catch (err) {
    console.error("[captcha] solver error:", err);
    return null;
  }
}
