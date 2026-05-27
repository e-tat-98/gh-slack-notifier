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
import { postSlackMessage } from "../services/slack";

/**
 * pull_request イベントを処理する
 */
export async function handlePullRequestEvent(
  payload: PullRequestEvent,
  slackChannel: string,
): Promise<void> {
  const usersMap = usersConfig;
  const message = formatPullRequestEvent(payload, usersMap);
  if (!message) {
    console.log(`pull_request[${payload.action}]: Skipping non-target action.`);
    return;
  }
  await postSlackMessage(slackChannel, message);
}

/**
 * pull_request_review イベントを処理する
 */
export async function handlePullRequestReviewEvent(
  payload: PullRequestReviewEvent,
  slackChannel: string,
): Promise<void> {
  const usersMap = usersConfig;
  const message = formatPullRequestReviewEvent(payload, usersMap);
  if (!message) {
    console.log(
      `pull_request_review[${payload.action}/${payload.review.state}]: Skipping non-target action.`,
    );
    return;
  }
  await postSlackMessage(slackChannel, message);
}

/**
 * pull_request_review_comment イベントを処理する
 */
export async function handlePullRequestReviewCommentEvent(
  payload: PullRequestReviewCommentEvent,
  slackChannel: string,
): Promise<void> {
  const usersMap = usersConfig;
  const message = formatPullRequestReviewCommentEvent(payload, usersMap);
  if (!message) {
    console.log(`pull_request_review_comment[${payload.action}]: Skipping non-target action.`);
    return;
  }
  await postSlackMessage(slackChannel, message);
}
