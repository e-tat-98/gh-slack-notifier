import type {
  DiscussionCommentCreatedEvent,
  DiscussionCreatedEvent,
} from "@octokit/webhooks-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Slack サービスをモック
vi.mock("../../../server/services/slack", () => ({
  postSlackMessage: vi.fn().mockResolvedValue(undefined),
}));

// config/users をモック
vi.mock("../../../server/config/users", () => ({
  usersConfig: {
    octocat: "U0123456789",
    "github-user-1": "U9876543210",
  },
}));

import {
  handleDiscussionCommentEvent,
  handleDiscussionEvent,
} from "../../../server/handlers/discussion";
import { postSlackMessage } from "../../../server/services/slack";

const discussionCreatedPayload = (await import(
  "../../fixtures/discussion.created.json"
)) as unknown as DiscussionCreatedEvent;
const discussionCommentPayload = (await import(
  "../../fixtures/discussion_comment.created.json"
)) as unknown as DiscussionCommentCreatedEvent;

const CHANNEL = "C0123456789";

describe("handleDiscussionEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("created アクションで Slack に投稿する", async () => {
    await handleDiscussionEvent(discussionCreatedPayload, CHANNEL);
    expect(postSlackMessage).toHaveBeenCalledOnce();
    expect(postSlackMessage).toHaveBeenCalledWith(
      CHANNEL,
      expect.objectContaining({
        text: expect.stringContaining("作成"),
      }),
    );
  });

  it("通知対象外のアクションでは Slack に投稿しない", async () => {
    const payload = {
      ...discussionCreatedPayload,
      action: "edited",
    } as unknown as DiscussionCreatedEvent;
    await handleDiscussionEvent(payload, CHANNEL);
    expect(postSlackMessage).not.toHaveBeenCalled();
  });
});

describe("handleDiscussionCommentEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("created アクションで Slack に投稿する", async () => {
    await handleDiscussionCommentEvent(discussionCommentPayload, CHANNEL);
    expect(postSlackMessage).toHaveBeenCalledOnce();
  });

  it("edited アクションでは Slack に投稿しない", async () => {
    const payload = {
      ...discussionCommentPayload,
      action: "edited",
    } as unknown as DiscussionCommentCreatedEvent;
    await handleDiscussionCommentEvent(payload, CHANNEL);
    expect(postSlackMessage).not.toHaveBeenCalled();
  });
});
