import { Router } from 'express';
import { getTransactionHistory } from '../controllers/transactionController';

const router = Router();

/**
 * @swagger
 * /v1/users/{userId}/transactions:
 *   get:
 *     summary: Get transaction history for a user
 *     tags:
 *       - Transactions
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED]
 *         description: Filter by transaction status
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       transactionId:
 *                         type: string
 *                       senderId:
 *                         type: string
 *                       receiverId:
 *                         type: string
 *                       amount:
 *                         type: string
 *                       currency:
 *                         type: string
 *                       status:
 *                         type: string
 *                       failureReason:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       completedAt:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/users/:userId/transactions', getTransactionHistory);

export default router;
