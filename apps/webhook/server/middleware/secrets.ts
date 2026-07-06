import { defineEventHandler } from "h3";
import { loadSecrets } from "../services/secrets";

export default defineEventHandler(async () => {
  await loadSecrets();
});
