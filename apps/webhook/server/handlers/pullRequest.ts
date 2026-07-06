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
  const { action, pull_request: pr, repository, installation } = payload;
  const message = formatPullRequestEvent(payload, usersConfig);
  if (!message) {
    console.log(`pull_request[${action}]: Skipping non-target action.`);
    return;
  }

  if (action === "opened") {
    const ts = await postSlackMessage(slackChannel, message);
    if (installation?.id) {
      const [owner, repo] = repository.full_name.split("/");
      await appendThreadTs(installation.id, owner, repo, pr.number, pr.body, ts).catch((e) =>
        console.error("Failed to append thread_ts to PR body:", e),
      );
    }
  } else {
    const threadTs = extractThreadTs(pr.body) ?? undefined;
    await postSlackMessage(slackChannel, message, threadTs);
  }
}

/**
 * pull_request_review イベントを処理する
 * approved のみ通知する
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
  await postSlackMessage(slackChannel, message, threadTs);
}
