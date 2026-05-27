import { defineNitroPlugin } from "nitropack/runtime";
import { loadSecrets } from "../services/secrets";

/**
 * Nitro プラグイン: サーバー起動時にシークレットをロードする
 */
export default defineNitroPlugin(async () => {
  await loadSecrets();
});
