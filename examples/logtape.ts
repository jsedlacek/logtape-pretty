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

logger.info("Server started on port {port}", {
  port: 3000,
});
logger.debug("Loading config from {path}", { path: "/etc/app/config.json" });
logger.warn("Deprecated API called", { endpoint: "/api/v1/old" });
logger.error(new Error("Simple Error"));
logger.error(
  new Error("API Error", {
    cause: new Error("Http Error"),
  }),
);
logger.error(
  new AggregateError(
    [new TypeError("Invalid input"), new RangeError("Out of bounds")],
    "Multiple validation failures",
  ),
);
