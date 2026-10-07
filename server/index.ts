import { resolveServerConfig } from "./config";
import { analyzeWithGemini } from "./gemini";
import { createAnalyzeServer } from "./http";

let config: ReturnType<typeof resolveServerConfig>;
try {
  config = resolveServerConfig(process.env);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid server configuration");
  process.exit(1);
}

const server = createAnalyzeServer({
  analyze: analyzeWithGemini,
  token: config.token,
});

server.listen(config.port, config.host, () => {
  console.log(`Analysis server listening on http://${config.host}:${config.port}`);
});
