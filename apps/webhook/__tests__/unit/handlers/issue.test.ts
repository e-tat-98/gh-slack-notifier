import type { IssueCommentEvent, IssuesEvent } from "@octokit/webhooks-types";
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

import { handleIssueCommentEvent, handleIssuesEvent } from "../../../server/handlers/issue";
import { postSlackMessage } from "../../../server/services/slack";

const issueOpenedPayload = (await import(
  "../../fixtures/issues.opened.json"
)) as unknown as IssuesEvent;
const issueClosedPayload = (await import(
  "../../fixtures/issues.closed.json"
)) as unknown as IssuesEvent;
const issueCommentPayload = (await import(
  "../../fixtures/issue_comment.created.json"
)) as unknown as IssueCommentEvent;

const CHANNEL = "C0123456789";

describe("handleIssuesEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opened アクションで Slack に投稿する", async () => {
    await handleIssuesEvent(issueOpenedPayload, CHANNEL);
    expect(postSlackMessage).toHaveBeenCalledOnce();
    expect(postSlackMessage).toHaveBeenCalledWith(
      CHANNEL,
      expect.objectContaining({
        text: expect.stringContaining("オープン"),
      }),
    );
  });

  it("closed アクションで Slack に投稿する", async () => {
    await handleIssuesEvent(issueClosedPayload, CHANNEL);
    expect(postSlackMessage).toHaveBeenCalledOnce();
    expect(postSlackMessage).toHaveBeenCalledWith(
      CHANNEL,
      expect.objectContaining({
        text: expect.stringContaining("クローズ"),
      }),
    );
  });

  it("通知対象外のアクションでは Slack に投稿しない", async () => {
    const payload = { ...issueOpenedPayload, action: "labeled" } as unknown as IssuesEvent;
    await handleIssuesEvent(payload, CHANNEL);
    expect(postSlackMessage).not.toHaveBeenCalled();
  });
});

describe("handleIssueCommentEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("created アクションで Slack に投稿する", async () => {
    await handleIssueCommentEvent(issueCommentPayload, CHANNEL);
    expect(postSlackMessage).toHaveBeenCalledOnce();
  });

  it("edited アクションでは Slack に投稿しない", async () => {
    const payload = { ...issueCommentPayload, action: "edited" } as unknown as IssueCommentEvent;
    await handleIssueCommentEvent(payload, CHANNEL);
    expect(postSlackMessage).not.toHaveBeenCalled();
  });
});
