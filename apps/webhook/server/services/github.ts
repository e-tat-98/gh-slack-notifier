import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * GitHub Webhook の署名を検証する。
 * タイミング攻撃対策として timingSafeEqual を使用する。
 *
 * @param rawBody リクエストの生ボディ文字列
 * @param signatureHeader X-Hub-Signature-256 ヘッダーの値
 * @throws 署名が一致しない場合はエラーをスロー
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string): void {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("GITHUB_WEBHOOK_SECRET is not configured");
  }

  if (!signatureHeader) {
    throw new Error("X-Hub-Signature-256 header is missing");
  }

  const expectedSignature = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;

  // Buffer の長さが異なる場合は timingSafeEqual がスローするため先に確認する
  if (expectedSignature.length !== signatureHeader.length) {
    throw new Error("Webhook signature verification failed");
  }

  const expectedBuf = Buffer.from(expectedSignature);
  const actualBuf = Buffer.from(signatureHeader);

  if (!timingSafeEqual(expectedBuf, actualBuf)) {
    throw new Error("Webhook signature verification failed");
  }
}
