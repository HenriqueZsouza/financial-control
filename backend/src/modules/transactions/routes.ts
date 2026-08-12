import { Router } from 'express';
import {
  createTransactionHandler,
  getTransactionsHandler,
  getTransactionByIdHandler,
  updateTransactionHandler,
  deleteTransactionHandler,
} from './controller';

const router = Router();

router.post('/', createTransactionHandler);
router.get('/', getTransactionsHandler);
router.get('/:id', getTransactionByIdHandler);
router.patch('/:id', updateTransactionHandler);
router.delete('/:id', deleteTransactionHandler);

export default router;