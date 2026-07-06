import { createHmac, timingSafeEqual } from "node:crypto";
import { App } from "octokit";

/** GitHub App のシングルトンインスタンス */
let app: App | null = null;

/** GitHub App クライアントを取得する（遅延初期化） */
function getApp(): App {
  if (!app) {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
    if (!appId || !privateKey) throw new Error("GitHub App credentials are not configured");
    app = new App({ appId, privateKey });
  }
  return app;
}

const THREAD_TS_REGEX = /slack thread ts: (\S+)/;

/**
 * PR・Issue 本文から Slack スレッド ID を抽出する
 */
export function extractThreadTs(body: string | null | undefined): string | null {
  if (!body) return null;
  return body.match(THREAD_TS_REGEX)?.[1] ?? null;
}

/**
 * PR・Issue 本文末尾に Slack スレッド ID を追記する
 */
export async function appendThreadTs(
  installationId: number,
  owner: string,
  repo: string,
  issueNumber: number,
  currentBody: string | null | undefined,
  ts: string,
): Promise<void> {
  const octokit = await getApp().getInstallationOctokit(installationId);
  await octokit.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    body: `${currentBody ?? ""}\n\nslack thread ts: ${ts}`,
  });
}

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
