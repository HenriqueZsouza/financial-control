import { Router } from 'express';
import { login, me, register } from './controller';
import { authenticate } from '../../shared/middleware/authenticate';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
export default router;
