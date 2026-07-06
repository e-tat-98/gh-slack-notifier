# gh-slack-notifier
GitHub Webhook → Slack API の連携を行うバックエンドアプリケーション

## 利用方法
### 1. Slack Apps の用意
> Ref: https://docs.slack.dev/app-management/quickstart-app-settings/

#### Slack Apps を作成
1. https://api.slack.com/apps?new_app=1 にアクセス
2. 「From scratch」を選択
3. 「App Name」を入力 （ex: GitHub Bot）
4. 「Pick a workspace to develop your app in」でアプリ開発を行うワークスペースを選択
5. 「Create App」で作成

### Slack Apps に権限付与
1. 「OAuth & Permissions」の「スコープ」を確認
2. 「ボットトークンのスコープ」の「OAuthスコープを追加する」をクリック
3. `chat:write`スコープを追加

### Slack Apps のインストールと認証
1. 「install Apps」を選択
2. 「Install to Workspace」をクリックしてインストール
3. 後でSSM Parameterへ登録するため「Bot User OAuth Token」を控えておく



