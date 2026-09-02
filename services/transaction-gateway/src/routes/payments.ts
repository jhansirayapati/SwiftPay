import { Router } from 'express';
import { postPayment } from '../controllers/paymentController';

const router = Router();

/**
 * @swagger
 * /v1/payments:
 *   post:
 *     summary: Initiate a payment
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transaction_id
 *               - sender_id
 *               - receiver_id
 *               - amount
 *               - currency
 *             properties:
 *               transaction_id:
 *                 type: string
 *                 example: "txn_12345"
 *               sender_id:
 *                 type: string
 *                 example: "user_001"
 *               receiver_id:
 *                 type: string
 *                 example: "user_002"
 *               amount:
 *                 type: number
 *                 example: 500
 *               currency:
 *                 type: string
 *                 example: "INR"
 *     responses:
 *       202:
 *         description: Payment accepted for processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactionId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [PENDING, COMPLETED, FAILED]
 *                 senderId:
 *                   type: string
 *                 receiverId:
 *                   type: string
 *                 amount:
 *                   type: string
 *                 currency:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *       400:
 *         description: Validation error
 *       402:
 *         description: Insufficient funds
 *       404:
 *         description: User not found
 *       409:
 *         description: Duplicate transaction with conflicting payload
 *       500:
 *         description: Server error
 */
router.post('/payments', postPayment);

export default router;
