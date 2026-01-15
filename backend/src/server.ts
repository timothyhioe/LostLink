import http from "http";
import { Server as SocketIOServer } from "socket.io";

import { app } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { registerChatGateway } from "./websocket/chatGateway";
import { ensureBucketExists } from "./config/minio";

async function bootstrap(): Promise<void> {
  await connectDatabase();
  await ensureBucketExists();
  logger.info("MinIO bucket ready");

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
      credentials: true,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    transports: ["polling", "websocket"],
    pingInterval: 25000,
    pingTimeout: 60000,
    upgradeTimeout: 10000,
    allowEIO3: true,
  });

  registerChatGateway(io);

  server.listen(env.PORT, () => {
    logger.info(`LostLink API listening on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
