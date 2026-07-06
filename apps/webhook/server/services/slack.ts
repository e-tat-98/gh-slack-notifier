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
export async function postSlackMessage(channel: string, message: SlackMessage): Promise<void> {
  const slackClient = getClient();
  try {
    const result = await slackClient.chat.postMessage({
      channel,
      text: message.text,
      blocks: message.blocks,
      unfurl_links: false,
      unfurl_media: false,
    });
    console.log(`Slack message posted successfully: channel=${channel}, ts=${result.ts}`);
  } catch (error) {
    console.error("Failed to post message to Slack:", error);
    throw error;
  }
}
