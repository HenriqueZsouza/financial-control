import { Router } from 'express';
import {
  updateProfileHandler,
} from './controller';

const router = Router();

router.patch('/me', updateProfileHandler);

export default router;