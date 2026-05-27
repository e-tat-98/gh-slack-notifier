import type { Block, KnownBlock } from "@slack/web-api";

/** Slack に投稿するメッセージ */
export interface SlackMessage {
  /** 通知プレビュー・フォールバック用テキスト */
  text: string;
  /** Block Kit ブロック */
  blocks: (KnownBlock | Block)[];
}
