import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In production, publish one service: Express serves both the API and the
// built customer experience (including /dashboard). Development continues to
// use Vite and its /api proxy.
if (process.env.NODE_ENV === "production") {
  const clientBuild = path.resolve(
    process.cwd(),
    "artifacts/restaurant-feedback/dist/public",
  );

  app.use(express.static(clientBuild));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

export default app;
