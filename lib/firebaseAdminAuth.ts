import crypto from "crypto";

interface ServiceAccountConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function getServiceAccountConfig(): ServiceAccountConfig | null {
  // 1. Check for single JSON environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      if (parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tenopilot",
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      }
    } catch {}
  }

  // 2. Check for individual environment variables
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "tenopilot";

  if (clientEmail && privateKey) {
    // Handle escaped newlines from .env strings
    privateKey = privateKey.replace(/\\n/g, "\n");
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str, "utf8") : str;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getGoogleAccessToken(config: ServiceAccountConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: config.clientEmail,
    scope: "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const signatureInput = `${encodedHeader}.${encodedClaims}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  const signature = signer.sign(config.privateKey);
  const jwt = `${signatureInput}.${base64UrlEncode(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth2 token exchange failed: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

/**
 * 🗑️ Deletes a user from Firebase Authentication server-side.
 * Resolves UID automatically via email lookup if userId is not provided.
 */
export async function deleteUserFromFirebaseAuth(
  userId?: string,
  email?: string
): Promise<{ success: boolean; deletedUid?: string; message?: string }> {
  const config = getServiceAccountConfig();
  if (!config) {
    return {
      success: false,
      message: "Firebase service account credentials not configured in environment. Auth deletion handled via client self-healing bridge.",
    };
  }

  try {
    const accessToken = await getGoogleAccessToken(config);
    let targetUid = userId;

    // If userId not provided, look up UID by email
    if (!targetUid && email) {
      const lookupRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${config.projectId}/accounts:lookup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: [email.toLowerCase().trim()] }),
        }
      );

      if (lookupRes.ok) {
        const lookupData = await lookupRes.json();
        if (lookupData.users && lookupData.users.length > 0) {
          targetUid = lookupData.users[0].localId;
        }
      }
    }

    if (!targetUid) {
      return {
        success: false,
        message: "User not found in Firebase Authentication or UID not resolvable.",
      };
    }

    // Delete user from Firebase Auth
    const deleteRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${config.projectId}/accounts/${targetUid}:delete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (deleteRes.ok) {
      return {
        success: true,
        deletedUid: targetUid,
        message: `Successfully deleted user ${targetUid} from Firebase Authentication.`,
      };
    } else {
      const errText = await deleteRes.text();
      return {
        success: false,
        message: `Firebase Auth API deletion error: ${errText}`,
      };
    }
  } catch (err: any) {
    console.warn("deleteUserFromFirebaseAuth warning:", err);
    return {
      success: false,
      message: err?.message || "Failed to communicate with Firebase Auth API.",
    };
  }
}
