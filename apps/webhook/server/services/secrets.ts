import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

/** シークレットのロード済みフラグ */
let loaded = false;

const ssmClient = new SSMClient({});

/**
 * SSM Parameter Store からパラメータを取得して process.env に注入する。
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
    const paramMap: Array<{ envKey: string; paramEnvKey: string; withDecryption: boolean }> = [
      { envKey: "SLACK_BOT_TOKEN", paramEnvKey: "SLACK_BOT_TOKEN_PARAM", withDecryption: true },
      {
        envKey: "GITHUB_WEBHOOK_SECRET",
        paramEnvKey: "GITHUB_WEBHOOK_SECRET_PARAM",
        withDecryption: true,
      },
      {
        envKey: "GITHUB_APP_PRIVATE_KEY",
        paramEnvKey: "GITHUB_APP_PRIVATE_KEY_PARAM",
        withDecryption: true,
      },
      { envKey: "GITHUB_APP_ID", paramEnvKey: "GITHUB_APP_ID_PARAM", withDecryption: false },
    ];

    await Promise.all(
      paramMap.map(async ({ envKey, paramEnvKey, withDecryption }) => {
        const paramName = process.env[paramEnvKey];
        if (!paramName) return;
        const result = await ssmClient.send(
          new GetParameterCommand({ Name: paramName, WithDecryption: withDecryption }),
        );
        if (result.Parameter?.Value) {
          process.env[envKey] = result.Parameter.Value;
        }
      }),
    );

    loaded = true;
    console.log("Secrets loaded successfully.");
  } catch (error) {
    console.error("Failed to load secrets:", error);
    throw error;
  }
}
