import { defineNitroConfig } from "nitropack/config";

// https://nitro.build/config
export default defineNitroConfig({
  compatibilityDate: "latest",
  preset: "aws-lambda",
  srcDir: "server",
  imports: false,
});
