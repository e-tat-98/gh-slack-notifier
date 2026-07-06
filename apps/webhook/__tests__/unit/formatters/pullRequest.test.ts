import type {
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
} from "@octokit/webhooks-types";
import { describe, expect, it } from "vitest";
import {
  formatPullRequestEvent,
  formatPullRequestReviewCommentEvent,
  formatPullRequestReviewEvent,
} from "../../../server/formatters/pullRequest";

// テスト用ユーザーマッピング
const USERS_MAP = {
  octocat: "U0123456789",
  "github-user-1": "U9876543210",
};

// フィクスチャ読み込み
const prOpenedPayload = (await import(
  "../../fixtures/pullRequest.opened.json"
)) as unknown as PullRequestEvent;
const prMergedPayload = (await import(
  "../../fixtures/pullRequest.merged.json"
)) as unknown as PullRequestEvent;
const prClosedPayload = (await import(
  "../../fixtures/pullRequest.closed.json"
)) as unknown as PullRequestEvent;
const prReviewRequestedPayload = (await import(
  "../../fixtures/pullRequest.review_requested.json"
)) as unknown as PullRequestEvent;
const prReviewApprovedPayload = (await import(
  "../../fixtures/pullRequest_review.submitted.approved.json"
)) as unknown as PullRequestReviewEvent;
const prReviewCommentPayload = (await import(
  "../../fixtures/pullRequest_review_comment.created.json"
)) as unknown as PullRequestReviewCommentEvent;

describe("formatPullRequestEvent", () => {
  describe("opened", () => {
    it("PR オープン時のメッセージを生成する", () => {
      const msg = formatPullRequestEvent(prOpenedPayload, USERS_MAP);
      expect(msg).not.toBeNull();
      expect(msg?.text).toContain("オープン");
      expect(msg?.text).toContain("feat: ログイン機能を追加");
      expect(msg?.blocks[0]).toMatchObject({
        type: "header",
        text: { text: "🔔 Pull Request がオープンされました" },
      });
    });

    it("Slack メンションに変換される", () => {
      const msg = formatPullRequestEvent(prOpenedPayload, USERS_MAP);
      const sectionText = JSON.stringify(msg?.blocks);
      expect(sectionText).toContain("<@U0123456789>");
    });

    it("ユーザーマッピングがない場合は @login 形式になる", () => {
      const msg = formatPullRequestEvent(prOpenedPayload, {});
      const sectionText = JSON.stringify(msg?.blocks);
      expect(sectionText).toContain("@octocat");
    });
  });

  describe("closed (merged)", () => {
    it("PR マージ時のメッセージを生成する", () => {
      const msg = formatPullRequestEvent(prMergedPayload, USERS_MAP);
      expect(msg).not.toBeNull();
      expect(msg?.text).toContain("マージ");
      expect(msg?.blocks[0]).toMatchObject({
        type: "header",
        text: { text: "✅ Pull Request がマージされました" },
      });
    });

    it("merged_by のユーザーがメンションに変換される", () => {
      const msg = formatPullRequestEvent(prMergedPayload, USERS_MAP);
      const sectionText = JSON.stringify(msg?.blocks);
      expect(sectionText).toContain("<@U9876543210>");
    });
  });

  describe("closed (not merged)", () => {
    it("PR クローズ時のメッセージを生成する", () => {
      const msg = formatPullRequestEvent(prClosedPayload, USERS_MAP);
      expect(msg).not.toBeNull();
      expect(msg?.text).toContain("クローズ");
      expect(msg?.blocks[0]).toMatchObject({
        type: "header",
        text: { text: "🚫 Pull Request がクローズされました" },
      });
    });
  });

  describe("review_requested", () => {
    it("レビュー依頼時のメッセージを生成する", () => {
      const msg = formatPullRequestEvent(prReviewRequestedPayload, USERS_MAP);
      expect(msg).not.toBeNull();
      expect(msg?.text).toContain("レビュー");
      const sectionText = JSON.stringify(msg?.blocks);
      expect(sectionText).toContain("👀");
      // レビュワーのメンションが含まれる
      expect(sectionText).toContain("<@U9876543210>");
    });
  });

  describe("未対応 action", () => {
    it("null を返す", () => {
      const payload = { ...prOpenedPayload, action: "synchronize" } as unknown as PullRequestEvent;
      const msg = formatPullRequestEvent(payload, USERS_MAP);
      expect(msg).toBeNull();
    });
  });
});

describe("formatPullRequestReviewEvent", () => {
  it("approved のレビュー時のメッセージを生成する", () => {
    const msg = formatPullRequestReviewEvent(prReviewApprovedPayload, USERS_MAP);
    expect(msg).not.toBeNull();
    expect(msg?.text).toContain("Approve");
    const sectionText = JSON.stringify(msg?.blocks);
    expect(sectionText).toContain("✅");
    expect(sectionText).toContain("<@U0123456789>"); // author
    expect(sectionText).toContain("<@U9876543210>"); // reviewer
  });

  it("commented レビュー（body あり）でメッセージを生成する", () => {
    const payload = {
      ...prReviewApprovedPayload,
      review: { ...prReviewApprovedPayload.review, state: "commented" },
    } as unknown as PullRequestReviewEvent;
    const msg = formatPullRequestReviewEvent(payload, USERS_MAP);
    expect(msg).not.toBeNull();
    expect(msg?.text).toContain("レビューコメント");
  });

  it("dismissed など未対応の state は null を返す", () => {
    const payload = {
      ...prReviewApprovedPayload,
      review: { ...prReviewApprovedPayload.review, state: "dismissed" },
    } as unknown as PullRequestReviewEvent;
    const msg = formatPullRequestReviewEvent(payload, USERS_MAP);
    expect(msg).toBeNull();
  });
});

describe("formatPullRequestReviewCommentEvent", () => {
  it("レビューコメント作成時のメッセージを生成する", () => {
    const msg = formatPullRequestReviewCommentEvent(prReviewCommentPayload, USERS_MAP);
    expect(msg).not.toBeNull();
    expect(msg?.text).toContain("レビューコメント");
    const sectionText = JSON.stringify(msg?.blocks);
    expect(sectionText).toContain("💬");
    expect(sectionText).toContain("ここのロジックをもう少し整理できそうです");
  });
});
