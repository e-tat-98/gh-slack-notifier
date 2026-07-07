import type { IssueCommentEvent, IssuesEvent } from "@octokit/webhooks-types";
import type { SlackMessage } from "../types/slack";

/** GitHub ユーザー名を Slack メンション形式に変換する */
function toMention(githubLogin: string, usersMap: Record<string, string>): string {
  const slackUserId = usersMap[githubLogin];
  return slackUserId ? `<@${slackUserId}>` : `@${githubLogin}`;
}

/** 本文テキストを指定文字数で切り詰める */
function truncate(text: string | null | undefined, maxLen = 200): string {
  if (!text) return "";
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

/**
 * issues イベントを Slack メッセージに変換する
 */
export function formatIssuesEvent(
  payload: IssuesEvent,
  usersMap: Record<string, string>,
): SlackMessage | null {
  const { action, issue, repository } = payload;
  const repoName = repository.full_name;
  const issueLink = `<${issue.html_url}|${issue.title} #${issue.number}>`;
  const author = toMention(issue.user.login, usersMap);

  if (action === "opened") {
    const labels =
      issue.labels && issue.labels.length > 0
        ? `\nLabels: ${issue.labels.map((l) => `\`${l.name}\``).join("  ")}`
        : "";

    return {
      text: `[${repoName}] Issue #${issue.number} がオープンされました: ${issue.title}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "🐛 Issue がオープンされました", emoji: true },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${issueLink}*\nby ${author}${labels}`,
          },
        },
        ...(issue.body
          ? [
              {
                type: "section" as const,
                text: { type: "mrkdwn" as const, text: truncate(issue.body, 150) },
              },
            ]
          : []),
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Issue を確認する", emoji: true },
              url: issue.html_url,
              action_id: "view_issue",
            },
          ],
        },
      ],
    };
  }

  if (action === "closed") {
    const closer = toMention(payload.sender.login, usersMap);

    return {
      text: `[${repoName}] Issue #${issue.number} がクローズされました: ${issue.title}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `✅ *Issue がクローズされました*\n*${issueLink}*\nby ${closer}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Issue を確認する", emoji: true },
              url: issue.html_url,
              action_id: "view_issue",
            },
          ],
        },
      ],
    };
  }

  // 未対応の action は無視
  return null;
}

/**
 * issue_comment イベントを Slack メッセージに変換する
 */
export function formatIssueCommentEvent(
  payload: IssueCommentEvent,
  usersMap: Record<string, string>,
): SlackMessage | null {
  const { action, comment, issue, repository } = payload;
  const repoName = repository.full_name;

  if (action !== "created") {
    return null;
  }

  const issueLink = `<${issue.html_url}|${issue.title} #${issue.number}>`;
  const commenter = toMention(comment.user.login, usersMap);
  const author = toMention(issue.user.login, usersMap);

  return {
    text: `[${repoName}] Issue #${issue.number} にコメントが届きました: ${issue.title}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `💬 *Issue にコメントが届きました*\n*${issueLink}*\n\n${author} さん、${commenter} さんからコメントがあります`,
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `>>> ${truncate(comment.body, 200)}` },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "コメントを確認する", emoji: true },
            url: comment.html_url,
            action_id: "view_comment",
          },
        ],
      },
    ],
  };
}
