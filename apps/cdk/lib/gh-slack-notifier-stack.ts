import { join } from "node:path";
import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

export class GhSlackNotifierStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -----------------------------------------------------------
    // シークレット (Secrets Manager)
    // デプロイ後に AWS Console または CLI で値を設定する
    // -----------------------------------------------------------

    /** GitHub / Slack の各種シークレットをまとめて管理する */
    const ghSlackSecrets = new secretsmanager.Secret(this, "GhSlackSecrets", {
      secretName: "/gh-slack-notifier/secrets",
      description: "GitHub App & Slack Bot Token for gh-slack-notifier",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          SLACK_BOT_TOKEN: "xoxb-placeholder",
          GITHUB_WEBHOOK_SECRET: "placeholder",
          GITHUB_APP_PRIVATE_KEY: "placeholder",
        }),
        generateStringKey: "_unused",
      },
    });

    // -----------------------------------------------------------
    // SSM Parameter Store (非機密設定値)
    // -----------------------------------------------------------

    const githubAppIdParam = new ssm.StringParameter(this, "GitHubAppId", {
      parameterName: "/gh-slack-notifier/github-app-id",
      stringValue: "placeholder",
      description: "GitHub App ID for gh-slack-notifier",
    });

    // -----------------------------------------------------------
    // Lambda Function
    // Nitro ビルド成果物 (.output/server/) をデプロイ
    // -----------------------------------------------------------

    const webhookFn = new lambda.Function(this, "WebhookHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      // Nitro の aws-lambda プリセットのビルド成果物
      code: lambda.Code.fromAsset(join(import.meta.dirname, "../../webhook/.output/server")),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        NODE_ENV: "production",
        // Secrets Manager の ARN を渡す（起動時に SDK で取得）
        GH_SLACK_SECRETS_ARN: ghSlackSecrets.secretArn,
        // SSM Parameter の名前を渡す
        GITHUB_APP_ID_PARAM: githubAppIdParam.parameterName,
      },
    });

    // Lambda への権限付与
    ghSlackSecrets.grantRead(webhookFn);
    githubAppIdParam.grantRead(webhookFn);

    // -----------------------------------------------------------
    // HTTP API (API Gateway v2)
    // -----------------------------------------------------------

    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: "gh-slack-notifier",
      description: "GitHub Webhook → Slack Notifier",
    });

    httpApi.addRoutes({
      path: "/webhook",
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration("WebhookIntegration", webhookFn),
    });

    // -----------------------------------------------------------
    // Outputs
    // -----------------------------------------------------------

    new cdk.CfnOutput(this, "WebhookUrl", {
      value: `${httpApi.apiEndpoint}/webhook`,
      description: "GitHub Webhook に設定する URL",
    });

    new cdk.CfnOutput(this, "SecretArn", {
      value: ghSlackSecrets.secretArn,
      description: "シークレット ARN（AWS Console で値を設定してください）",
    });
  }
}
