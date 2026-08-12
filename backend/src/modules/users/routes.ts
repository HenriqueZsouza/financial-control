import { Router } from 'express';
import { updateMe } from './controller';
const router = Router();
router.patch('/me', updateMe);
export default router;
