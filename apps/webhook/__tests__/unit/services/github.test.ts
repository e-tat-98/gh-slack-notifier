import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "../../../server/services/github";

const SECRET = "test-secret";
const BODY = JSON.stringify({ action: "opened" });

/** 正しい署名を生成するヘルパー */
function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    // biome-ignore lint/performance/noDelete: process.env のクリーンアップには delete が必要
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it("正しい署名の場合はエラーをスローしない", () => {
    expect(() => verifyWebhookSignature(BODY, sign(BODY))).not.toThrow();
  });

  it("署名が不正な場合はエラーをスロー", () => {
    expect(() => verifyWebhookSignature(BODY, "sha256=invalidhash")).toThrow(
      "Webhook signature verification failed",
    );
  });

  it("署名が空文字の場合はエラーをスロー", () => {
    expect(() => verifyWebhookSignature(BODY, "")).toThrow(
      "X-Hub-Signature-256 header is missing",
    );
  });

  it("シークレットが異なる場合はエラーをスロー", () => {
    const wrongSign = sign(BODY, "wrong-secret");
    expect(() => verifyWebhookSignature(BODY, wrongSign)).toThrow(
      "Webhook signature verification failed",
    );
  });

  it("GITHUB_WEBHOOK_SECRET 未設定の場合はエラーをスロー", () => {
    // biome-ignore lint/performance/noDelete: process.env のクリーンアップには delete が必要
    delete process.env.GITHUB_WEBHOOK_SECRET;
    expect(() => verifyWebhookSignature(BODY, sign(BODY))).toThrow(
      "GITHUB_WEBHOOK_SECRET is not configured",
    );
  });
});
