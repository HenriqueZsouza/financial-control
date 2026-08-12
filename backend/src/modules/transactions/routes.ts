import { Router } from 'express';
import { create, getById, list, remove, update } from './controller';
const router = Router();
router.get('/', list);
router.post('/', create);
router.get('/:id', getById);
router.patch('/:id', update);
router.delete('/:id', remove);
export default router;
