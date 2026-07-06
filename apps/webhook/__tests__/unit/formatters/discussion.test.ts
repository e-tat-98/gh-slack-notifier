import type {
  DiscussionCommentCreatedEvent,
  DiscussionCreatedEvent,
} from "@octokit/webhooks-types";
import { describe, expect, it } from "vitest";
import {
  formatDiscussionCommentEvent,
  formatDiscussionEvent,
} from "../../../server/formatters/discussion";

// テスト用ユーザーマッピング
const USERS_MAP = {
  octocat: "U0123456789",
  "github-user-1": "U9876543210",
};

const discussionCreatedPayload = (await import(
  "../../fixtures/discussion.created.json"
)) as unknown as DiscussionCreatedEvent;
const discussionCommentPayload = (await import(
  "../../fixtures/discussion_comment.created.json"
)) as unknown as DiscussionCommentCreatedEvent;

describe("formatDiscussionEvent", () => {
  describe("created", () => {
    it("Discussion 作成時のメッセージを生成する", () => {
      const msg = formatDiscussionEvent(discussionCreatedPayload, USERS_MAP);
      expect(msg).not.toBeNull();
      expect(msg?.text).toContain("作成");
      expect(msg?.text).toContain("新しいアーキテクチャの提案");
      expect(msg?.blocks[0]).toMatchObject({
        type: "header",
        text: { text: "💬 Discussion が作成されました" },
      });
    });

    it("Slack メンションに変換される", () => {
      const msg = formatDiscussionEvent(discussionCreatedPayload, USERS_MAP);
      const sectionText = JSON.stringify(msg?.blocks);
      expect(sectionText).toContain("<@U0123456789>");
    });

    it("ユーザーマッピングがない場合は @login 形式になる", () => {
      const msg = formatDiscussionEvent(discussionCreatedPayload, {});
      const sectionText = JSON.stringify(msg?.blocks);
      expect(sectionText).toContain("@octocat");
    });

    it("本文が含まれる", () => {
      const msg = formatDiscussionEvent(discussionCreatedPayload, USERS_MAP);
      const sectionText = JSON.stringify(msg?.blocks);
      expect(sectionText).toContain("フロントエンドのアーキテクチャをリファクタリングする提案");
    });
  });

  describe("未対応 action", () => {
    it("null を返す", () => {
      const payload = {
        ...discussionCreatedPayload,
        action: "edited",
      } as unknown as DiscussionCreatedEvent;
      const msg = formatDiscussionEvent(payload, USERS_MAP);
      expect(msg).toBeNull();
    });
  });
});

describe("formatDiscussionCommentEvent", () => {
  it("Discussion コメント作成時のメッセージを生成する", () => {
    const msg = formatDiscussionCommentEvent(discussionCommentPayload, USERS_MAP);
    expect(msg).not.toBeNull();
    expect(msg?.text).toContain("コメント");
    expect(msg?.text).toContain("新しいアーキテクチャの提案");
    const sectionText = JSON.stringify(msg?.blocks);
    expect(sectionText).toContain("💬");
    expect(sectionText).toContain("賛成です。まずは小さい範囲から始めましょう。");
  });

  it("コメント投稿者が Slack メンションに変換される", () => {
    const msg = formatDiscussionCommentEvent(discussionCommentPayload, USERS_MAP);
    const sectionText = JSON.stringify(msg?.blocks);
    expect(sectionText).toContain("<@U9876543210>"); // github-user-1
  });

  it("created 以外は null を返す", () => {
    const payload = {
      ...discussionCommentPayload,
      action: "edited",
    } as unknown as DiscussionCommentCreatedEvent;
    const msg = formatDiscussionCommentEvent(payload, USERS_MAP);
    expect(msg).toBeNull();
  });
});
