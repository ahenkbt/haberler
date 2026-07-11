import { createRequire } from "module";
import { readFileSync } from "fs";
import { existsSync } from "fs";

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminApp: any = null;

function parseServiceAccountJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof parsed["project_id"] === "string" &&
      typeof parsed["private_key"] === "string" &&
      typeof parsed["client_email"] === "string"
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** True if server has credentials to verify Firebase ID tokens (new project env). */
export function isFirebaseAdminConfigured(): boolean {
  const credPath = process.env["GOOGLE_APPLICATION_CREDENTIALS"];
  if (credPath && existsSync(credPath)) return true;
  if (process.env["FIREBASE_SERVICE_ACCOUNT_JSON"]?.trim()) return true;
  const projectId = process.env["FIREBASE_PROJECT_ID"];
  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];
  const privateKey = process.env["FIREBASE_PRIVATE_KEY"];
  return !!(projectId && clientEmail && privateKey);
}

function getFirebaseAdmin() {
  if (adminApp) return adminApp;

  const admin = require("firebase-admin");

  if (admin.apps.length > 0) {
    adminApp = admin.apps[0];
    return adminApp;
  }

  const credPath = process.env["GOOGLE_APPLICATION_CREDENTIALS"];
  if (credPath && existsSync(credPath)) {
    try {
      const raw = readFileSync(credPath, "utf8");
      const sa = parseServiceAccountJson(raw);
      if (sa) {
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(sa as never),
          projectId: sa["project_id"] as string,
        });
        return adminApp;
      }
    } catch {
      /* fall through */
    }
  }

  const inlineJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (inlineJson) {
    const sa = parseServiceAccountJson(inlineJson);
    if (sa) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(sa as never),
        projectId: sa["project_id"] as string,
      });
      return adminApp;
    }
  }

  const projectId = process.env["FIREBASE_PROJECT_ID"];
  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];
  const privateKey = process.env["FIREBASE_PRIVATE_KEY"]?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
    return adminApp;
  }

  return adminApp;
}

export async function verifyFirebaseToken(token: string): Promise<{
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  sign_in_provider?: string;
}> {
  const app = getFirebaseAdmin();
  if (!app) throw new Error("Firebase not configured");

  const admin = require("firebase-admin");
  const idToken = token.startsWith("Bearer ") ? token.slice(7) : token;
  const decoded = await admin.auth(app).verifyIdToken(idToken);

  return {
    uid: decoded.uid,
    email: decoded.email,
    name: decoded.name,
    picture: decoded.picture,
    sign_in_provider: decoded.firebase?.sign_in_provider,
  };
}

export default getFirebaseAdmin;
