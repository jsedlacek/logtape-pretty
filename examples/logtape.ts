import { configure, getConsoleSink, getLogger } from "@logtape/logtape";
import { getPrettyFormatter } from "../src/index.ts";

await configure({
  sinks: {
    pretty: getConsoleSink({
      formatter: getPrettyFormatter({ colorize: true }),
    }),
  },
  loggers: [
    { category: ["logtape", "meta"], lowestLevel: "warning" },
    { category: ["my", "app"], sinks: ["pretty"], lowestLevel: "debug" },
  ],
});

const logger = getLogger(["my", "app"]);

logger.info("Server started on port {port}", { port: 3000 });
logger.debug("Loading config from {path}", { path: "/etc/app/config.json" });
logger.warn("Deprecated API called", { endpoint: "/api/v1/old" });
logger.error("Request failed", {
  error: new Error("Connection refused"),
  url: "https://api.example.com/data",
});
