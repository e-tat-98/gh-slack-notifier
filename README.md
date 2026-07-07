# gh-slack-notifier
GitHub Webhook → Slack API の連携を行うバックエンドアプリケーション

## 概要
GitHub の Pull Request / Issue / Discussion などのイベントを Webhook で受け取り、指定した Slack チャンネルに整形して通知する。同じ PR・Issue に対するコメントなどは Slack のスレッドにまとめて投稿される（PR・Issue の本文に Slack の `ts` を埋め込むことで実現している）。

## 技術スタック
- Runtime: Node.js (v20以上)
- Language: TypeScript
- Framework: Nitro
- Deploy: AWS Lambda + API Gateway (AWS CDK)
- GitHub SDK: octokit
- Slack SDK: @slack/web-api

## 導入手順

### 0. 事前準備
- Node.js v20 以上、pnpm v9 以上
- Slack ワークスペースの管理権限（Slack App を作成できること）
- 通知対象リポジトリへの GitHub App のインストール権限
- デプロイする場合は AWS アカウントと AWS CLI / CDK の実行環境

### 1. リポジトリのクローンと依存関係のインストール
```bash
git clone <このリポジトリのURL>
cd gh-slack-notifier
pnpm install
```

### 2. 🤖 Slack Apps の用意
> Ref: https://docs.slack.dev/app-management/quickstart-app-settings/

#### 2-1. Slack Apps を作成
1. https://api.slack.com/apps?new_app=1 にアクセス
2. 「From scratch」を選択
3. 「App Name」を入力 （ex: GitHub Bot）
4. 「Pick a workspace to develop your app in」でアプリ開発を行うワークスペースを選択
5. 「Create App」で作成

#### 2-2. Slack Apps に権限付与
1. 「OAuth & Permissions」の「スコープ」を確認
2. 「ボットトークンのスコープ」の「OAuthスコープを追加する」をクリック
3. `chat:write` スコープを追加

#### 2-3. Slack Apps のインストールと認証
1. 「install Apps」を選択
2. 「Install to Workspace」をクリックしてインストール
3. 後で SSM Parameter へ登録するため「Bot User OAuth Token」（`xoxb-` から始まる）を控えておく

#### 2-4. 通知先チャンネルにアプリを招待
通知したいチャンネルで `/invite @<App Name>` を実行し、Bot をチャンネルに参加させる（未招待だと `chat:write` があっても投稿に失敗する）。また、後で [`repos.ts`](#repos-ts-リポジトリごとの通知設定) に設定するためチャンネル ID（`C` から始まる ID）を控えておく。

### 3. 👾 GitHub Apps の用意
> Ref: https://docs.github.com/ja/apps/creating-github-apps

#### 3-1. GitHub Apps を作成
1. 対象の Organization もしくは自身のアカウントの Settings → 「Developer settings」→「GitHub Apps」→「New GitHub App」を開く
2. 「GitHub App name」を入力
3. 「Homepage URL」に任意の URL を入力（このリポジトリの URL などで可）
4. 「Webhook」の「Active」にチェックを入れ、「Webhook URL」に `https://<デプロイ先のドメイン>/webhook?repo=<repos.tsで設定するキー>` を入力（デプロイ前は仮の値で作成し、デプロイ後に更新してよい）
5. 「Webhook secret」に任意のランダムな文字列を設定し、控えておく（`GITHUB_WEBHOOK_SECRET` として使用）

#### 3-2. Permissions（権限）を設定
「Repository permissions」で以下を設定する。

| 権限 | アクセスレベル | 用途 |
| --- | --- | --- |
| Issues | Read and write | issue イベントの受信、および Slack スレッド ID を Issue 本文に書き込むため |
| Pull requests | Read and write | pull_request 系イベントの受信、および Slack スレッド ID を PR 本文に書き込むため |
| Discussions | Read-only | discussion 系イベントの受信のため |
| Metadata | Read-only | GitHub App 作成時の必須権限 |

#### 3-3. Subscribe to events（購読イベント）を設定
以下のイベントにチェックを入れる。

- Pull request
- Pull request review
- Pull request review comment
- Issues
- Issue comment
- Discussion
- Discussion comment

#### 3-4. GitHub App を作成してインストール
1. 「Create GitHub App」で作成
2. 作成後の画面で「App ID」を控えておく（`GITHUB_APP_ID` として使用）
3. 「Generate a private key」で秘密鍵（`.pem`）を作成・ダウンロードし、内容を控えておく（`GITHUB_APP_PRIVATE_KEY` として使用）
4. 左メニューの「Install App」から、通知したいリポジトリを選択してインストール

### 4. 環境変数の設定（ローカル開発用）
`apps/webhook/.env.example` を参考に `apps/webhook/.env.local` を作成し、ここまでで控えた値を設定する。

```bash
cp apps/webhook/.env.example apps/webhook/.env.local
```

| 変数名 | 説明 |
| --- | --- |
| `SLACK_BOT_TOKEN` | 手順 2-3 で控えた Bot User OAuth Token |
| `GITHUB_APP_ID` | 手順 3-4 で控えた GitHub App の App ID |
| `GITHUB_APP_PRIVATE_KEY` | 手順 3-4 で控えた GitHub App の秘密鍵の中身 |
| `GITHUB_WEBHOOK_SECRET` | 手順 3-1 で設定した Webhook secret |

ローカル開発時（`NODE_ENV !== "production"`）は AWS SSM Parameter Store からのシークレット取得をスキップし、これらの環境変数をそのまま利用する（[`server/services/secrets.ts`](apps/webhook/server/services/secrets.ts) 参照）。

### 5. 通知設定ファイルの編集
[`repos.ts`](#repos-ts-リポジトリごとの通知設定) と [`users.ts`](#users-ts-メンション先ユーザーのマッピング) を編集する（詳細は下記「設定ファイル」を参照）。

### 6. ローカル開発サーバーの起動
```bash
pnpm dev
```
`http://localhost:3000/webhook?repo=<repos.tsで設定したキー>` が Webhook の受け口になる。ローカルで GitHub からの Webhook を受けたい場合は ngrok などのトンネリングツールを利用する。

### 7. AWS へのデプロイ
```bash
pnpm build
pnpm --filter @gh-slack-notifier/cdk deploy
```
初回デプロイ時は事前に `pnpm --filter @gh-slack-notifier/cdk exec cdk bootstrap` が必要。デプロイすると SSM Parameter Store に以下のパラメータが `placeholder` 値で作成されるので、AWS Console もしくは CLI で実際の値に上書きする（[`apps/cdk/lib/gh-slack-notifier-stack.ts`](apps/cdk/lib/gh-slack-notifier-stack.ts) 参照）。

| パラメータ名 | 値 |
| --- | --- |
| `/gh-slack-notifier/slack-bot-token` | `SLACK_BOT_TOKEN` |
| `/gh-slack-notifier/github-webhook-secret` | `GITHUB_WEBHOOK_SECRET` |
| `/gh-slack-notifier/github-app-private-key` | `GITHUB_APP_PRIVATE_KEY` |
| `/gh-slack-notifier/github-app-id` | `GITHUB_APP_ID`（機密ではないため String パラメータ） |

デプロイ完了後、CDK の Output に表示される `WebhookUrl`（`https://<APIドメイン>/webhook`）を控え、手順 3-1 の GitHub App の Webhook URL を `<WebhookUrl>?repo=<repos.tsで設定したキー>` に更新する。

### 8. 動作確認
対象リポジトリで PR や Issue を作成するなど、`repos.ts` で許可したイベントを発生させ、設定した Slack チャンネルに通知が届くことを確認する。`GET /health` にアクセスするとアプリの死活確認ができる。

## 設定ファイル

### `repos.ts`（リポジトリごとの通知設定）
[`apps/webhook/server/config/repos.ts`](apps/webhook/server/config/repos.ts) で、どのリポジトリのどのイベントをどの Slack チャンネルに通知するかを設定する。

```ts
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
```

- オブジェクトのキー：Webhook を受け付ける際の識別子。GitHub App の Webhook URL に付与する `?repo=` クエリパラメータの値と一致させる（[`server/routes/webhook.post.ts`](apps/webhook/server/routes/webhook.post.ts) 参照）。リポジトリごとに Webhook URL のクエリパラメータを変えることで、1つの Lambda で複数リポジトリを扱える。
- `slackChannel`：通知先の Slack チャンネル ID（`C` から始まる ID）。Bot をそのチャンネルに招待しておく必要がある。
- `events`：受け付けるイベントとアクションのフィルタ。
  - キーが存在しないイベントは無視される（Slack に通知されない）。
  - 値の配列に含まれないアクションは無視される。
  - 設定可能なイベントとアクションは以下の通り（[`server/types/config.ts`](apps/webhook/server/types/config.ts) 参照）。

| イベント | 設定可能なアクション |
| --- | --- |
| `pull_request` | `opened`, `closed`, `reopened`, `review_requested` |
| `pull_request_review` | `submitted` |
| `pull_request_review_comment` | `created` |
| `issues` | `opened`, `closed`, `reopened`, `assigned` |
| `issue_comment` | `created` |
| `discussion` | `created` |
| `discussion_comment` | `created` |

新しいリポジトリを追加する場合は、このオブジェクトに新しいキーを追加し、対応する GitHub App の Webhook URL（`?repo=<追加したキー>`）を設定する。

### `users.ts`（メンション先ユーザーのマッピング）
[`apps/webhook/server/config/users.ts`](apps/webhook/server/config/users.ts) で、GitHub のユーザー名と Slack のユーザー ID を紐付ける。

```ts
export const usersConfig: UsersConfig = {
  "e-tat-98": "U0B61288ZPV",
};
```

- キー：GitHub のユーザー名（`login`）。
- 値：Slack のユーザー ID（`U` から始まる ID。Slack のプロフィール画面などから確認できる）。

PR の作成者やレビュー依頼先、コメント投稿者などを Slack メッセージ内に表示する際、このマッピングに存在すれば `<@U0B61288ZPV>` のような Slack メンション形式に変換され、存在しなければ `@<GitHubのユーザー名>` としてそのまま表示される（[`server/formatters/pullRequest.ts`](apps/webhook/server/formatters/pullRequest.ts) の `toMention` 参照）。通知に関わるメンバーは全員このファイルに追加しておくとよい。

## 主要なコマンド
- 依存関係のインストール: `pnpm install`
- 開発サーバー起動: `pnpm dev`
- プロジェクトのビルド: `pnpm build`
- リンター実行: `pnpm lint`
- テスト実行: `pnpm test`
