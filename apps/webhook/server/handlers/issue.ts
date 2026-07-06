import type { IssueCommentEvent, IssuesEvent } from "@octokit/webhooks-types";
import { usersConfig } from "../config/users";
import { formatIssueCommentEvent, formatIssuesEvent } from "../formatters/issue";
import { appendThreadTs, extractThreadTs } from "../services/github";
import { postSlackMessage } from "../services/slack";

/**
 * issues イベントを処理する
 */
export async function handleIssuesEvent(payload: IssuesEvent, slackChannel: string): Promise<void> {
  const { action, issue, repository, installation } = payload;
  const message = formatIssuesEvent(payload, usersConfig);
  if (!message) {
    console.log(`issues[${action}]: Skipping non-target action.`);
    return;
  }

  if (action === "opened") {
    const ts = await postSlackMessage(slackChannel, message);
    if (installation?.id) {
      const [owner, repo] = repository.full_name.split("/");
      await appendThreadTs(installation.id, owner, repo, issue.number, issue.body, ts).catch((e) =>
        console.error("Failed to append thread_ts to issue body:", e),
      );
    }
  } else {
    const threadTs = extractThreadTs(issue.body) ?? undefined;
    await postSlackMessage(slackChannel, message, threadTs);
  }
}

/**
 * issue_comment イベントを処理する
 */
export async function handleIssueCommentEvent(
  payload: IssueCommentEvent,
  slackChannel: string,
): Promise<void> {
  const { issue } = payload;
  const message = formatIssueCommentEvent(payload, usersConfig);
  if (!message) {
    console.log(`issue_comment[${payload.action}]: Skipping non-target action.`);
    return;
  }
  const threadTs = extractThreadTs(issue.body) ?? undefined;
  await postSlackMessage(slackChannel, message, threadTs);
}
