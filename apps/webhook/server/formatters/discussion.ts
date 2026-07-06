import type {
  DiscussionCommentCreatedEvent,
  DiscussionCreatedEvent,
} from "@octokit/webhooks-types";
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
 * discussion イベントを Slack メッセージに変換する
 */
export function formatDiscussionEvent(
  payload: DiscussionCreatedEvent,
  usersMap: Record<string, string>,
): SlackMessage | null {
  const { action, discussion, repository } = payload;
  const repoName = repository.full_name;
  const discussionLink = `<${discussion.html_url}|${discussion.title} #${discussion.number}>`;
  const author = toMention(discussion.user.login, usersMap);

  if (action === "created") {
    return {
      text: `[${repoName}] Discussion #${discussion.number} が作成されました: ${discussion.title}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "💬 Discussion が作成されました", emoji: true },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${discussionLink}*\nby ${author}`,
          },
        },
        ...(discussion.body
          ? [
              {
                type: "section" as const,
                text: { type: "mrkdwn" as const, text: truncate(discussion.body, 150) },
              },
            ]
          : []),
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Discussion を確認する", emoji: true },
              url: discussion.html_url,
              action_id: "view_discussion",
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
 * discussion_comment イベントを Slack メッセージに変換する
 */
export function formatDiscussionCommentEvent(
  payload: DiscussionCommentCreatedEvent,
  usersMap: Record<string, string>,
): SlackMessage | null {
  const { action, comment, discussion, repository } = payload;
  const repoName = repository.full_name;

  if (action !== "created") {
    return null;
  }

  const discussionLink = `<${discussion.html_url}|${discussion.title} #${discussion.number}>`;
  const commenter = toMention(comment.user.login, usersMap);
  const author = toMention(discussion.user.login, usersMap);

  return {
    text: `[${repoName}] Discussion #${discussion.number} にコメントが届きました: ${discussion.title}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `💬 *Discussion にコメントが届きました*\n*${discussionLink}*\n\n${author} さん、${commenter} さんからコメントがあります`,
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `> ${truncate(comment.body, 200)}` },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "コメントを確認する", emoji: true },
            url: comment.html_url,
            action_id: "view_discussion_comment",
          },
        ],
      },
    ],
  };
}
