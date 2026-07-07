#!/usr/bin/env bash
# cdk deploy 後に実行し、機密パラメータの型を SecureString に矯正するスクリプト。
# CloudFormation の AWS::SSM::Parameter は SecureString を直接作成できないため、
# CDK は placeholder 値の String 型パラメータを作成する。このスクリプトは既存の値を
# 保持したまま SecureString に変換することで、手動での型変換忘れを防ぐ。
set -euo pipefail

PARAMETERS=(
  "/gh-slack-notifier/slack-bot-token"
  "/gh-slack-notifier/github-webhook-secret"
  "/gh-slack-notifier/github-app-private-key"
)

for name in "${PARAMETERS[@]}"; do
  current_type=$(aws ssm get-parameter --name "$name" --query "Parameter.Type" --output text)

  if [ "$current_type" = "SecureString" ]; then
    echo "OK: ${name} is already SecureString"
    continue
  fi

  value=$(aws ssm get-parameter --name "$name" --with-decryption --query "Parameter.Value" --output text)
  aws ssm put-parameter --name "$name" --type SecureString --value "$value" --overwrite >/dev/null
  echo "Fixed: ${name} converted ${current_type} -> SecureString"
done
