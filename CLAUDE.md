# gh-slack-notifier
GitHubのWebhookイベントをキャッチし、適切に整形してSlackの指定チャンネルに通知するバックエンドアプリケーション。

## 技術スタック
**Runtime**: Node.js (v20以上)
**Language**: TypeScript
**Framework**: Nitro
**Deploy**: AWS Lambda + API Gateway
**GitHub SDK**: octokit
**Slack SDK**: @slack/web-api
**AWS CDK*: aws-cdk-lib
**CI/CD**: GitHub Actions
**Test**: vitest
**Format&Lint**: biome

## 主要なコマンド
Claudeがタスクを実行する際、これらのコマンドを必要に応じて自動で選択・実行します。
- 依存関係のインストール: `pnpm install`
- 開発サーバー起動: `pnpm dev`
- プロジェクトのビルド: `pnpm build`
- リンター実行: `pnpm lint`
- テスト実行: `pnpm test`

## 開発ガイドライン & 規約

### 1. 言語とコミュニケーション
- 思考プロセス（Thought）および回答、コミットメッセージはすべて**日本語**で行うこと。
- コード内のコメントやJSDocも原則**日本語**で記述すること。

### 2. コードスタイル
- 型定義は厳格に行い、可能な限り `any` の使用は避けること。
- インターフェースや型定義は、再利用性を考慮して `types/` ディレクトリなどに適切に分離すること。
- エラーハンドリングを徹底し、Slack APIやGitHubからのパースエラー時に適切なログを出力すること。
- consoleやErrorで出力するメッセージは**英語**で記述すること。

### 3. コミットメッセージのルール
Gitコミットを行う際は、以下のプレフィックスを使い、簡潔な**英語**で記述すること。
- `feat:` 新機能
- `fix:` バグ修正
- `docs:` ドキュメントのみの変更
- `refactor:` リファクタリング

### 4. セキュリティに関する注意
- `.env` ファイルや、APIトークンが含まれる可能性のあるファイルを不用意に読み込んだり、ログに出力したりしないこと。
