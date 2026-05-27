#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { GhSlackNotifierStack } from "../lib/gh-slack-notifier-stack.js";

const app = new cdk.App();

new GhSlackNotifierStack(app, "GhSlackNotifierStack", {
  // AWS アカウント・リージョンは環境変数から取得
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
  },
  description: "gh-slack-notifier: GitHub Webhook → Slack Notifier",
});
