import type { IssueCommentEvent, IssuesEvent } from "@octokit/webhooks-types";
import { usersConfig } from "../config/users";
import { formatIssueCommentEvent, formatIssuesEvent } from "../formatters/issue";
import { postSlackMessage } from "../services/slack";

/**
 * issues イベントを処理する
 */
export async function handleIssuesEvent(payload: IssuesEvent, slackChannel: string): Promise<void> {
  const usersMap = usersConfig;
  const message = formatIssuesEvent(payload, usersMap);
  if (!message) {
    console.log(`issues[${payload.action}]: Skipping non-target action.`);
    return;
  }
  await postSlackMessage(slackChannel, message);
}

/**
 * issue_comment イベントを処理する
 */
export async function handleIssueCommentEvent(
  payload: IssueCommentEvent,
  slackChannel: string,
): Promise<void> {
  const usersMap = usersConfig;
  const message = formatIssueCommentEvent(payload, usersMap);
  if (!message) {
    console.log(`issue_comment[${payload.action}]: Skipping non-target action.`);
    return;
  }
  await postSlackMessage(slackChannel, message);
}
