/** GitHub ユーザーの最小限の情報 */
export interface GitHubUser {
  login: string;
  html_url: string;
}

/** GitHub リポジトリの最小限の情報 */
export interface GitHubRepository {
  full_name: string;
  html_url: string;
}
