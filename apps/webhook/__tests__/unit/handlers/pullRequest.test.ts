import type {
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
} from "@octokit/webhooks-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Slack サービスをモック
vi.mock("../../../server/services/slack", () => ({
  postSlackMessage: vi.fn().mockResolvedValue("1234567890.123456"),
}));

// GitHub サービスをモック
vi.mock("../../../server/services/github", () => ({
  extractThreadTs: vi.fn().mockReturnValue(null),
  appendThreadTs: vi.fn().mockResolvedValue(undefined),
  verifyWebhookSignature: vi.fn(),
}));

// config/users をモック
vi.mock("../../../server/config/users", () => ({
  usersConfig: {
    octocat: "U0123456789",
    "github-user-1": "U9876543210",
  },
}));

import {
  handlePullRequestEvent,
  handlePullRequestReviewCommentEvent,
  handlePullRequestReviewEvent,
} from "../../../server/handlers/pullRequest";
import { postSlackMessage } from "../../../server/services/slack";

const prOpenedPayload = (await import(
  "../../fixtures/pullRequest.opened.json"
)) as unknown as PullRequestEvent;
const prMergedPayload = (await import(
  "../../fixtures/pullRequest.merged.json"
)) as unknown as PullRequestEvent;
const prReviewApprovedPayload = (await import(
  "../../fixtures/pullRequest_review.submitted.approved.json"
)) as unknown as PullRequestReviewEvent;
const prReviewCommentPayload = (await import(
  "../../fixtures/pullRequest_review_comment.created.json"
)) as unknown as PullRequestReviewCommentEvent;

const CHANNEL = "C0123456789";

describe("handlePullRequestEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opened アクションで Slack に投稿する", async () => {
    await handlePullRequestEvent(prOpenedPayload, CHANNEL);
    expect(postSlackMessage).toHaveBeenCalledOnce();
    expect(postSlackMessage).toHaveBeenCalledWith(
      CHANNEL,
      expect.objectContaining({
        text: expect.stringContaining("オープン"),
      }),
    );
  });

  it("closed (merged) アクションで Slack に投稿する", async () => {
    await handlePullRequestEvent(prMergedPayload, CHANNEL);
    expect(postSlackMessage).toHaveBeenCalledOnce();
    expect(postSlackMessage).toHaveBeenCalledWith(
      CHANNEL,
      expect.objectContaining({
        text: expect.stringContaining("マージ"),
      }),
      undefined,
    );
  });

  it("通知対象外のアクションでは Slack に投稿しない", async () => {
    const payload = { ...prOpenedPayload, action: "synchronize" } as unknown as PullRequestEvent;
    await handlePullRequestEvent(payload, CHANNEL);
    expect(postSlackMessage).not.toHaveBeenCalled();
  });
});

describe("handlePullRequestReviewEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approved レビューで Slack に投稿する", async () => {
    await handlePullRequestReviewEvent(prReviewApprovedPayload, CHANNEL);
    expect(postSlackMessage).toHaveBeenCalledOnce();
  });

  it("commented レビュー（body あり）で Slack に投稿する", async () => {
    const payload = {
      ...prReviewApprovedPayload,
      review: { ...prReviewApprovedPayload.review, state: "commented" },
    } as unknown as PullRequestReviewEvent;
    await handlePullRequestReviewEvent(payload, CHANNEL);
    expect(postSlackMessage).toHaveBeenCalledOnce();
  });
});

describe("handlePullRequestReviewCommentEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("created アクションで Slack に投稿する", async () => {
    await handlePullRequestReviewCommentEvent(prReviewCommentPayload, CHANNEL);
    expect(postSlackMessage).toHaveBeenCalledOnce();
  });
});
