import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

let app: App | null = null;

function getFirebaseApp(): App | null {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    return null;
  }

  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  });

  return app;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_STORAGE_BUCKET
  );
}

export async function uploadResume(
  userId: string,
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    throw new Error("Firebase is not configured");
  }

  const bucket = getStorage(firebaseApp).bucket();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `resumes/${userId}/${Date.now()}-${safeName}`;
  const file = bucket.file(path);

  await file.save(buffer, {
    metadata: { contentType },
    public: false,
  });

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });

  return signedUrl;
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "txt" || ext === "md") {
    return buffer.toString("utf-8").slice(0, 50000);
  }

  if (ext === "pdf") {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return (data.text || "").slice(0, 50000);
    } catch {
      return "";
    }
  }

  return buffer.toString("utf-8").slice(0, 50000);
}
