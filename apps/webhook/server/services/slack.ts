import { WebClient } from "@slack/web-api";
import type { SlackMessage } from "../types/slack";

/** Slack WebClient のシングルトンインスタンス */
let client: WebClient | null = null;

/** Slack WebClient を取得する（遅延初期化） */
function getClient(): WebClient {
  if (!client) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error("SLACK_BOT_TOKEN is not configured");
    }
    client = new WebClient(token);
  }
  return client;
}

/**
 * Slack チャンネルにメッセージを投稿する
 *
 * @param channel Slack チャンネル ID (C...)
 * @param message 投稿するメッセージ
 */
/**
 * Slack チャンネルにメッセージを投稿する
 *
 * @param channel Slack チャンネル ID (C...)
 * @param message 投稿するメッセージ
 * @param threadTs スレッドに返信する場合は親メッセージの ts
 * @returns 投稿したメッセージの ts
 */
export async function postSlackMessage(
  channel: string,
  message: SlackMessage,
  threadTs?: string,
): Promise<string> {
  const slackClient = getClient();
  try {
    const result = await slackClient.chat.postMessage({
      channel,
      text: message.text,
      blocks: message.blocks,
      thread_ts: threadTs,
      unfurl_links: false,
      unfurl_media: false,
    });
    console.log(`Slack message posted successfully: channel=${channel}, ts=${result.ts}`);
    return result.ts ?? "";
  } catch (error) {
    console.error("Failed to post message to Slack:", error);
    throw error;
  }
}
