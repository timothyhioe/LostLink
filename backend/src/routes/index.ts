import { Router } from "express";

import { healthRouter } from "./health.routes";
import { authRouter } from "./auth";
import { itemsRouter } from "./items";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/items", itemsRouter);
