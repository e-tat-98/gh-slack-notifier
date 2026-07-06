import type {
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
} from "@octokit/webhooks-types";
import { usersConfig } from "../config/users";
import {
  formatPullRequestEvent,
  formatPullRequestReviewCommentEvent,
  formatPullRequestReviewEvent,
} from "../formatters/pullRequest";
import { appendThreadTs, extractThreadTs } from "../services/github";
import { postSlackMessage } from "../services/slack";

/**
 * pull_request イベントを処理する
 */
export async function handlePullRequestEvent(
  payload: PullRequestEvent,
  slackChannel: string,
): Promise<void> {
  const { action, pull_request: pr, repository } = payload;
  const message = formatPullRequestEvent(payload, usersConfig);
  if (!message) {
    console.log(`pull_request[${action}]: Skipping non-target action.`);
    return;
  }

  if (action === "opened") {
    const ts = await postSlackMessage(slackChannel, message);
    const [owner, repo] = repository.full_name.split("/");
    console.log(`Appending thread_ts to PR #${pr.number}: owner=${owner}, repo=${repo}, ts=${ts}`);
    await appendThreadTs(owner, repo, pr.number, pr.body, ts).catch((e) =>
      console.error("Failed to append thread_ts to PR body:", e),
    );
  } else {
    const threadTs = extractThreadTs(pr.body) ?? undefined;
    console.log(`Extracted thread_ts from PR #${pr.number} body: ${threadTs ?? "not found"}`);
    await postSlackMessage(slackChannel, message, threadTs);
  }
}

/**
 * pull_request_review イベントを処理する
 */
export async function handlePullRequestReviewEvent(
  payload: PullRequestReviewEvent,
  slackChannel: string,
): Promise<void> {
  const { pull_request: pr } = payload;
  const message = formatPullRequestReviewEvent(payload, usersConfig);
  if (!message) {
    console.log(
      `pull_request_review[${payload.action}/${payload.review.state}]: Skipping non-target action.`,
    );
    return;
  }
  const threadTs = extractThreadTs(pr.body) ?? undefined;
  console.log(`Extracted thread_ts from PR #${pr.number} body: ${threadTs ?? "not found"}`);
  await postSlackMessage(slackChannel, message, threadTs);
}

/**
 * pull_request_review_comment イベントを処理する
 */
export async function handlePullRequestReviewCommentEvent(
  payload: PullRequestReviewCommentEvent,
  slackChannel: string,
): Promise<void> {
  const { pull_request: pr } = payload;
  const message = formatPullRequestReviewCommentEvent(payload, usersConfig);
  if (!message) {
    console.log(`pull_request_review_comment[${payload.action}]: Skipping non-target action.`);
    return;
  }
  const threadTs = extractThreadTs(pr.body) ?? undefined;
  console.log(`Extracted thread_ts from PR #${pr.number} body: ${threadTs ?? "not found"}`);
  await postSlackMessage(slackChannel, message, threadTs);
}
