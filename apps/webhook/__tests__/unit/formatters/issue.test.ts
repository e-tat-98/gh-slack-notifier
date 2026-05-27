import type { IssueCommentEvent, IssuesEvent } from "@octokit/webhooks-types";
import { describe, expect, it } from "vitest";
import { formatIssueCommentEvent, formatIssuesEvent } from "../../../server/formatters/issue";

// テスト用ユーザーマッピング
const USERS_MAP = {
  octocat: "U0123456789",
  "github-user-1": "U9876543210",
};

const issueOpenedPayload = (await import(
  "../../fixtures/issues.opened.json"
)) as unknown as IssuesEvent;
const issueClosedPayload = (await import(
  "../../fixtures/issues.closed.json"
)) as unknown as IssuesEvent;
const issueCommentPayload = (await import(
  "../../fixtures/issue_comment.created.json"
)) as unknown as IssueCommentEvent;

describe("formatIssuesEvent", () => {
  describe("opened", () => {
    it("Issue オープン時のメッセージを生成する", () => {
      const msg = formatIssuesEvent(issueOpenedPayload, USERS_MAP);
      expect(msg).not.toBeNull();
      expect(msg?.text).toContain("オープン");
      expect(msg?.text).toContain("ログインページでエラーが発生する");
      expect(msg?.blocks[0]).toMatchObject({
        type: "header",
        text: { text: "🐛 Issue がオープンされました" },
      });
    });

    it("ラベルが表示される", () => {
      const msg = formatIssuesEvent(issueOpenedPayload, USERS_MAP);
      const sectionText = JSON.stringify(msg?.blocks);
      expect(sectionText).toContain("bug");
      expect(sectionText).toContain("high-priority");
    });

    it("Slack メンションに変換される", () => {
      const msg = formatIssuesEvent(issueOpenedPayload, USERS_MAP);
      const sectionText = JSON.stringify(msg?.blocks);
      expect(sectionText).toContain("<@U0123456789>");
    });
  });

  describe("closed", () => {
    it("Issue クローズ時のメッセージを生成する", () => {
      const msg = formatIssuesEvent(issueClosedPayload, USERS_MAP);
      expect(msg).not.toBeNull();
      expect(msg?.text).toContain("クローズ");
      const sectionText = JSON.stringify(msg?.blocks);
      expect(sectionText).toContain("✅");
    });
  });

  describe("未対応 action", () => {
    it("null を返す", () => {
      const payload = { ...issueOpenedPayload, action: "labeled" } as unknown as IssuesEvent;
      const msg = formatIssuesEvent(payload, USERS_MAP);
      expect(msg).toBeNull();
    });
  });
});

describe("formatIssueCommentEvent", () => {
  it("Issue コメント作成時のメッセージを生成する", () => {
    const msg = formatIssueCommentEvent(issueCommentPayload, USERS_MAP);
    expect(msg).not.toBeNull();
    expect(msg?.text).toContain("コメント");
    const sectionText = JSON.stringify(msg?.blocks);
    expect(sectionText).toContain("💬");
    expect(sectionText).toContain("再現手順を教えてもらえますか？");
  });

  it("created 以外は null を返す", () => {
    const payload = { ...issueCommentPayload, action: "edited" } as unknown as IssueCommentEvent;
    const msg = formatIssueCommentEvent(payload, USERS_MAP);
    expect(msg).toBeNull();
  });
});
