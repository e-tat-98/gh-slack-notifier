import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

/** シークレットのロード済みフラグ */
let loaded = false;

const secretsClient = new SecretsManagerClient({});
const ssmClient = new SSMClient({});

/**
 * AWS Secrets Manager からシークレットを取得して process.env に注入する。
 * Lambda コールドスタート時に一度だけ実行される。
 * ローカル開発時（NODE_ENV !== 'production'）はスキップする。
 */
export async function loadSecrets(): Promise<void> {
  if (loaded) return;
  if (process.env.NODE_ENV !== "production") {
    loaded = true;
    return;
  }

  try {
    // GitHub / Slack シークレットを一括取得
    const secretArn = process.env.GH_SLACK_SECRETS_ARN;
    if (secretArn) {
      const result = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
      if (result.SecretString) {
        const secrets = JSON.parse(result.SecretString) as Record<string, string>;
        if (secrets.SLACK_BOT_TOKEN) process.env.SLACK_BOT_TOKEN = secrets.SLACK_BOT_TOKEN;
        if (secrets.GITHUB_WEBHOOK_SECRET)
          process.env.GITHUB_WEBHOOK_SECRET = secrets.GITHUB_WEBHOOK_SECRET;
        if (secrets.GITHUB_APP_PRIVATE_KEY)
          process.env.GITHUB_APP_PRIVATE_KEY = secrets.GITHUB_APP_PRIVATE_KEY;
      }
    }

    // GitHub App ID を SSM から取得
    const appIdParam = process.env.GITHUB_APP_ID_PARAM;
    if (appIdParam) {
      const result = await ssmClient.send(new GetParameterCommand({ Name: appIdParam }));
      if (result.Parameter?.Value) {
        process.env.GITHUB_APP_ID = result.Parameter.Value;
      }
    }

    loaded = true;
    console.log("Secrets loaded successfully.");
  } catch (error) {
    console.error("Failed to load secrets:", error);
    throw error;
  }
}
