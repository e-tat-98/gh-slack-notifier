import { join } from "node:path";
import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

export class GhSlackNotifierStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -----------------------------------------------------------
    // SSM Parameter Store
    // 機密値は SecureString (KMS暗号化)、非機密値は String で管理
    // デプロイ後に AWS Console または CLI で値を設定する
    // -----------------------------------------------------------

    // SecureString は CDK では直接作成できないため、デプロイ後に手動で上書きする
    const slackBotTokenParam = new ssm.StringParameter(this, "SlackBotToken", {
      parameterName: "/gh-slack-notifier/slack-bot-token",
      stringValue: "placeholder",
      description: "Slack Bot Token for gh-slack-notifier",
      tier: ssm.ParameterTier.STANDARD,
    });

    // SecureString は CDK では直接作成できないため、デプロイ後に手動で上書きする
    const githubWebhookSecretParam = new ssm.StringParameter(this, "GitHubWebhookSecret", {
      parameterName: "/gh-slack-notifier/github-webhook-secret",
      stringValue: "placeholder",
      description: "GitHub Webhook Secret for gh-slack-notifier",
      tier: ssm.ParameterTier.STANDARD,
    });

    // SecureString は CDK では直接作成できないため、デプロイ後に手動で上書きする
    const githubAppPrivateKeyParam = new ssm.StringParameter(this, "GitHubAppPrivateKey", {
      parameterName: "/gh-slack-notifier/github-app-private-key",
      stringValue: "placeholder",
      description: "GitHub App Private Key for gh-slack-notifier",
      tier: ssm.ParameterTier.STANDARD,
    });

    const githubAppIdParam = new ssm.StringParameter(this, "GitHubAppId", {
      parameterName: "/gh-slack-notifier/github-app-id",
      stringValue: "placeholder",
      description: "GitHub App ID for gh-slack-notifier",
      tier: ssm.ParameterTier.STANDARD,
    });

    // -----------------------------------------------------------
    // Lambda Function
    // Nitro ビルド成果物 (.output/server/) をデプロイ
    // -----------------------------------------------------------

    const webhookFn = new lambda.Function(this, "WebhookHandler", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(join(import.meta.dirname, "../../webhook/.output/server")),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        NODE_ENV: "production",
        SLACK_BOT_TOKEN_PARAM: slackBotTokenParam.parameterName,
        GITHUB_WEBHOOK_SECRET_PARAM: githubWebhookSecretParam.parameterName,
        GITHUB_APP_PRIVATE_KEY_PARAM: githubAppPrivateKeyParam.parameterName,
        GITHUB_APP_ID_PARAM: githubAppIdParam.parameterName,
      },
    });

    // Lambda への権限付与
    slackBotTokenParam.grantRead(webhookFn);
    githubWebhookSecretParam.grantRead(webhookFn);
    githubAppPrivateKeyParam.grantRead(webhookFn);
    githubAppIdParam.grantRead(webhookFn);

    // SecureString の復号に必要な KMS 権限を付与（SSM マネージドキー）
    const ssmManagedKey = kms.Alias.fromAliasName(this, "SsmManagedKey", "alias/aws/ssm");
    ssmManagedKey.grantDecrypt(webhookFn);

    // -----------------------------------------------------------
    // HTTP API (API Gateway v2)
    // -----------------------------------------------------------

    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: "gh-slack-notifier",
      description: "GitHub Webhook → Slack Notifier",
    });

    // APIコール防止策: 悪意あるリクエストによるコスト増大を防ぐためスロットリングを設定
    const cfnStage = httpApi.defaultStage?.node.defaultChild as apigwv2.CfnStage;
    cfnStage.defaultRouteSettings = {
      throttlingBurstLimit: 10,
      throttlingRateLimit: 5,
    };

    httpApi.addRoutes({
      path: "/webhook",
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration("WebhookIntegration", webhookFn),
    });

    httpApi.addRoutes({
      path: "/health",
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration("HealthIntegration", webhookFn),
    });

    // -----------------------------------------------------------
    // Outputs
    // -----------------------------------------------------------

    new cdk.CfnOutput(this, "WebhookUrl", {
      value: `${httpApi.apiEndpoint}/webhook`,
      description: "GitHub Webhook に設定する URL",
    });
  }
}
