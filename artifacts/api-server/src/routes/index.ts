import { Router, type IRouter } from "express";
import healthRouter from "./health";
import metricsRouter from "./metrics";
import financialRouter from "./financial";

const router: IRouter = Router();

router.use(healthRouter);
router.use(metricsRouter);
router.use(financialRouter);

export default router;
