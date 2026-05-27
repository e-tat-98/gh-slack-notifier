import type {
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
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
 * pull_request イベントを Slack メッセージに変換する
 */
export function formatPullRequestEvent(
  payload: PullRequestEvent,
  usersMap: Record<string, string>,
): SlackMessage | null {
  const { action, pull_request: pr, repository } = payload;
  const repoName = repository.full_name;
  const prLink = `<${pr.html_url}|${pr.title} #${pr.number}>`;
  const author = toMention(pr.user.login, usersMap);

  if (action === "opened") {
    return {
      text: `[${repoName}] PR #${pr.number} がオープンされました: ${pr.title}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "🔔 Pull Request がオープンされました", emoji: true },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${prLink}*\nby ${author}  |  ${repoName}`,
          },
        },
        ...(pr.body
          ? [
              {
                type: "section" as const,
                text: { type: "mrkdwn" as const, text: truncate(pr.body) },
              },
            ]
          : []),
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "PR を確認する", emoji: true },
              url: pr.html_url,
              action_id: "view_pr",
            },
          ],
        },
      ],
    };
  }

  if (action === "closed") {
    const isMerged = pr.merged;
    const emoji = isMerged ? "✅" : "🚫";
    const label = isMerged ? "マージされました" : "クローズされました";
    const mergedBy =
      isMerged && pr.merged_by ? `  →  merged by ${toMention(pr.merged_by.login, usersMap)}` : "";

    return {
      text: `[${repoName}] PR #${pr.number} が${label}: ${pr.title}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} Pull Request が${label}`,
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${prLink}*\nby ${author}${mergedBy}  |  ${repoName}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "PR を確認する", emoji: true },
              url: pr.html_url,
              action_id: "view_pr",
            },
          ],
        },
      ],
    };
  }

  if (action === "review_requested") {
    // review_requested イベントは requested_reviewer が存在する
    const reviewer =
      "requested_reviewer" in payload && payload.requested_reviewer
        ? toMention(payload.requested_reviewer.login, usersMap)
        : "レビュワー";

    return {
      text: `[${repoName}] PR #${pr.number} のレビューが依頼されました: ${pr.title}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `👀 *レビューをお願いします*\n*${prLink}*\n\n${reviewer} さん、レビューをお願いします\nby ${author}  |  ${repoName}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "PR を確認する", emoji: true },
              url: pr.html_url,
              action_id: "view_pr",
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
 * pull_request_review イベントを Slack メッセージに変換する
 * approved のみ通知する
 */
export function formatPullRequestReviewEvent(
  payload: PullRequestReviewEvent,
  usersMap: Record<string, string>,
): SlackMessage | null {
  const { action, review, pull_request: pr, repository } = payload;
  const repoName = repository.full_name;

  if (action !== "submitted" || review.state !== "approved") {
    return null;
  }

  const prLink = `<${pr.html_url}|${pr.title} #${pr.number}>`;
  const reviewer = toMention(review.user.login, usersMap);
  const author = toMention(pr.user.login, usersMap);

  return {
    text: `[${repoName}] PR #${pr.number} が Approve されました: ${pr.title}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ *Pull Request が Approve されました*\n*${prLink}*\n\n${author} さん、${reviewer} さんが承認しました  |  ${repoName}`,
        },
      },
      ...(review.body
        ? [
            {
              type: "context" as const,
              elements: [{ type: "mrkdwn" as const, text: truncate(review.body, 100) }],
            },
          ]
        : []),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "PR を確認する", emoji: true },
            url: pr.html_url,
            action_id: "view_pr",
          },
        ],
      },
    ],
  };
}

/**
 * pull_request_review_comment イベントを Slack メッセージに変換する
 */
export function formatPullRequestReviewCommentEvent(
  payload: PullRequestReviewCommentEvent,
  usersMap: Record<string, string>,
): SlackMessage | null {
  const { action, comment, pull_request: pr, repository } = payload;
  const repoName = repository.full_name;

  if (action !== "created") {
    return null;
  }

  const prLink = `<${pr.html_url}|${pr.title} #${pr.number}>`;
  const commenter = toMention(comment.user.login, usersMap);
  const author = toMention(pr.user.login, usersMap);

  return {
    text: `[${repoName}] PR #${pr.number} にレビューコメントが届きました: ${pr.title}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `💬 *レビューコメントが届きました*\n*${prLink}*\n\n${author} さん、${commenter} さんからコメントがあります  |  ${repoName}`,
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: truncate(comment.body, 200) },
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
