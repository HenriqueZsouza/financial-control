import { Router } from 'express';
import { getCategoriesHandler } from './controller';

const router = Router();

router.get('/', getCategoriesHandler);

export default router;