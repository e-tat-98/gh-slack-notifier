/**
 * イベント名 → 設定可能なアクション型のマップ
 *
 * ## 設定可能なイベントとアクション一覧
 *
 * | イベント                      | 設定可能なアクション                            |
 * | ----------------------------- | ----------------------------------------------- |
 * | pull_request                  | opened, closed, reopened, review_requested      |
 * | pull_request_review           | submitted                                       |
 * | pull_request_review_comment   | created                                         |
 * | issues                        | opened, closed, reopened, assigned              |
 * | issue_comment                 | created                                         |
 * | discussion                    | created                                         |
 * | discussion_comment            | created                                         |
 */
type EventActionMap = {
  pull_request: "opened" | "closed" | "reopened" | "review_requested";
  pull_request_review: "submitted";
  pull_request_review_comment: "created";
  issues: "opened" | "closed" | "reopened" | "assigned";
  issue_comment: "created";
  discussion: "created";
  discussion_comment: "created";
};

/** サポートする GitHub Webhook イベント名 */
export type GitHubEventName = keyof EventActionMap;

/**
 * リポジトリごとのイベント・アクションフィルタ設定
 * - キーが存在する = そのイベントを受け付ける
 * - キーを省略する = そのイベントを無視する
 * - 値の配列 = 受け付けるアクションの絞り込み
 */
export type EventFilterConfig = {
  [E in GitHubEventName]?: ReadonlyArray<EventActionMap[E]>;
};

/** リポジトリごとの設定 */
export interface RepoConfig {
  /** Slack チャンネル ID (C...) */
  slackChannel: string;
  /** 受け付ける GitHub Webhook イベントとアクション */
  events: EventFilterConfig;
}

/** repos.ts 全体の型: リポジトリのフルネーム (owner/repo) → RepoConfig */
export type ReposConfig = Record<string, RepoConfig>;

/** users.ts 全体の型: GitHub ユーザー名 → Slack ユーザー ID (U...) */
export type UsersConfig = Record<string, string>;
