import type {
  DiscussionCommentCreatedEvent,
  DiscussionCreatedEvent,
  IssueCommentEvent,
  IssuesEvent,
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
} from "@octokit/webhooks-types";
import { createError, defineEventHandler, getHeader, getQuery, readRawBody } from "h3";
import { reposConfig } from "../config/repos";
import { handleDiscussionCommentEvent, handleDiscussionEvent } from "../handlers/discussion";
import { handleIssueCommentEvent, handleIssuesEvent } from "../handlers/issue";
import {
  handlePullRequestEvent,
  handlePullRequestReviewCommentEvent,
  handlePullRequestReviewEvent,
} from "../handlers/pullRequest";
import { verifyWebhookSignature } from "../services/github";
import type { GitHubEventName } from "../types/config";

export default defineEventHandler(async (event) => {
  // ?repo=owner/repo クエリパラメータを取得
  const query = getQuery(event);
  const repoKey = typeof query.repo === "string" ? query.repo : undefined;

  if (!repoKey) {
    throw createError({ statusCode: 400, message: "Missing required query parameter: repo" });
  }

  // 生ボディと署名ヘッダーを取得
  const rawBody = (await readRawBody(event)) ?? "";
  const signatureHeader = getHeader(event, "x-hub-signature-256") ?? "";
  const githubEvent = getHeader(event, "x-github-event") ?? "";

  console.log(`Received event: repo=${repoKey}, event=${githubEvent}`);

  // Webhook 署名を検証
  try {
    verifyWebhookSignature(rawBody, signatureHeader);
  } catch (error) {
    console.error("Signature verification failed:", error);
    throw createError({ statusCode: 401, message: "Webhook signature verification failed" });
  }

  console.log("Signature verification passed.");

  // リポジトリ設定を確認（未登録リポジトリは 200 で無視）
  const repoConfig = reposConfig[repoKey];
  if (!repoConfig) {
    console.log(`Repository "${repoKey}" is not configured. Skipping.`);
    return { ok: true };
  }

  // このリポジトリで受け付けるイベントか確認
  const allowedActions = repoConfig.events[githubEvent as GitHubEventName];
  if (!allowedActions) {
    console.log(`Repository "${repoKey}" does not accept event "${githubEvent}". Skipping.`);
    return { ok: true };
  }

  const payload: unknown = JSON.parse(rawBody);

  // このリポジトリで受け付けるアクションか確認
  const action = (payload as { action?: string }).action;
  if (action && !(allowedActions as readonly string[]).includes(action)) {
    console.log(
      `Repository "${repoKey}" does not accept action "${githubEvent}[${action}]". Skipping.`,
    );
    return { ok: true };
  }

  const { slackChannel } = repoConfig;

  console.log(`Dispatching event: ${githubEvent}[${action ?? "N/A"}] to channel=${slackChannel}`);

  try {
    switch (githubEvent) {
      case "pull_request":
        await handlePullRequestEvent(payload as PullRequestEvent, slackChannel);
        break;
      case "pull_request_review":
        await handlePullRequestReviewEvent(payload as PullRequestReviewEvent, slackChannel);
        break;
      case "pull_request_review_comment":
        await handlePullRequestReviewCommentEvent(
          payload as PullRequestReviewCommentEvent,
          slackChannel,
        );
        break;
      case "issues":
        await handleIssuesEvent(payload as IssuesEvent, slackChannel);
        break;
      case "issue_comment":
        await handleIssueCommentEvent(payload as IssueCommentEvent, slackChannel);
        break;
      case "discussion":
        await handleDiscussionEvent(payload as DiscussionCreatedEvent, slackChannel);
        break;
      case "discussion_comment":
        await handleDiscussionCommentEvent(payload as DiscussionCommentCreatedEvent, slackChannel);
        break;
      default:
        console.log(`Unhandled event: ${githubEvent}`);
    }
  } catch (error) {
    console.error(`Error processing event [${githubEvent}]:`, error);
    throw createError({ statusCode: 500, message: "An error occurred while processing the event" });
  }

  return { ok: true };
});
