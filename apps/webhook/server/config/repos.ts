import type { ReposConfig } from "../types/config";

/** リポジトリごとの Slack チャンネルとイベント・アクション設定 */
export const reposConfig: ReposConfig = {
  "gh-slack-notifier": {
    slackChannel: "C0B6B274EE8",
    events: {
      pull_request: ["opened", "closed", "reopened", "review_requested"],
      pull_request_review: ["submitted"],
      pull_request_review_comment: ["created"],
      issues: ["opened", "closed", "reopened", "assigned"],
      issue_comment: ["created"],
      discussion: ["created"],
      discussion_comment: ["created"],
    },
  },
};
