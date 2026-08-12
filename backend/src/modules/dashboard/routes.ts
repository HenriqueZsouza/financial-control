import { Router } from 'express';
import { getDashboardSummaryHandler } from './controller';

const router = Router();

router.get('/summary', getDashboardSummaryHandler);

export default router;