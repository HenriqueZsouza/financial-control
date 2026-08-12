import { Router } from 'express';
import { registerHandler, loginHandler, meHandler } from './controller';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.get('/me', meHandler);

export default router;