import type {
  DiscussionCommentCreatedEvent,
  DiscussionCreatedEvent,
} from "@octokit/webhooks-types";
import { usersConfig } from "../config/users";
import { formatDiscussionCommentEvent, formatDiscussionEvent } from "../formatters/discussion";
import { postSlackMessage } from "../services/slack";

/**
 * discussion イベントを処理する
 */
export async function handleDiscussionEvent(
  payload: DiscussionCreatedEvent,
  slackChannel: string,
): Promise<void> {
  const message = formatDiscussionEvent(payload, usersConfig);
  if (!message) {
    console.log(`discussion[${payload.action}]: Skipping non-target action.`);
    return;
  }
  await postSlackMessage(slackChannel, message);
}

/**
 * discussion_comment イベントを処理する
 */
export async function handleDiscussionCommentEvent(
  payload: DiscussionCommentCreatedEvent,
  slackChannel: string,
): Promise<void> {
  const message = formatDiscussionCommentEvent(payload, usersConfig);
  if (!message) {
    console.log(`discussion_comment[${payload.action}]: Skipping non-target action.`);
    return;
  }
  await postSlackMessage(slackChannel, message);
}
