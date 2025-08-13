import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "" // 32 bytes
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error("API_KEY_SECRET must be exactly 32 characters long");
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Store as: IV + ciphertext + authTag
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

