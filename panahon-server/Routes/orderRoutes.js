const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/orderController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const {
    orderValidation,
    orderStatusValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');

router.use(authentication);

// Customer

/**
 * @openapi
 * /orders/me:
 *   get:
 *     tags: [Orders]
 *     summary: List my orders, newest first
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: My orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Orders retrieved successfully. }
 *                 count: { type: integer, example: 1 }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Order' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/me', orderController.getMyOrders);

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Check out my cart
 *     description: Builds the order from the server-side cart, reserves stock atomically, then empties the cart. Add items with POST /carts/items first.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethod]
 *             properties:
 *               paymentMethod: { type: string, enum: [Cash on Pickup, GCash, Bank Transfer, Maya], example: GCash }
 *               shippingAddress: { type: string, minLength: 5, maxLength: 200, default: NU Campus Pickup Counter, example: NU Campus Pickup Counter }
 *     responses:
 *       201:
 *         description: Order placed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Order placed successfully. }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: Validation failed, empty cart, or not enough stock
 *         content:
 *           application/json:
 *             example: { success: false, message: Your cart is empty. Add a product before checking out. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   get:
 *     tags: [Orders]
 *     summary: List all orders (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: status, in: query, schema: { type: string, enum: [Pending, Confirmed, Ready for Claiming, Claimed, Cancelled] } }
 *     responses:
 *       200:
 *         description: Orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Orders retrieved successfully. }
 *                 count: { type: integer, example: 4 }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Order' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post('/', orderValidation, orderController.createOrder);

/**
 * @openapi
 * /orders/{id}/cancel:
 *   patch:
 *     tags: [Orders]
 *     summary: Cancel my Pending order
 *     description: Only the owner can cancel, and only while the order is Pending. Stock is restored.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Order cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Order cancelled. }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: Invalid id, or the order is no longer Pending
 *         content:
 *           application/json:
 *             example: { success: false, message: This order is already "Confirmed" and can no longer be cancelled. Please contact the store. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Not the owner
 *         content:
 *           application/json:
 *             example: { success: false, message: Access denied. You can only cancel your own orders. }
 *       404:
 *         description: No order with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Order not found. }
 *       409:
 *         description: The store changed the order at the same moment
 *         content:
 *           application/json:
 *             example: { success: false, message: This order was just updated by the store. Refresh to see its current status. }
 */
router.patch('/:id/cancel', objectIdParam('id', 'order'), orderController.cancelOrder);

// Admin
router.get('/', authorize('Admin'), orderController.getAllOrders);

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Move an order to its next status (Admin)
 *     description: |
 *       Allowed transitions:
 *       - Pending → Confirmed or Cancelled
 *       - Confirmed → Ready for Claiming or Cancelled
 *       - Ready for Claiming → Claimed or Cancelled
 *       - Claimed and Cancelled are final.
 *
 *       Cancelling restores stock.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderStatus]
 *             properties:
 *               orderStatus: { type: string, enum: [Pending, Confirmed, Ready for Claiming, Claimed, Cancelled], example: Confirmed }
 *     responses:
 *       200:
 *         description: Status changed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Order marked as "Confirmed". }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: Validation failed or transition not allowed
 *         content:
 *           application/json:
 *             example: { success: false, message: 'An order that is "Pending" can only move to: Confirmed, Cancelled.' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: No order with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Order not found. }
 *       409:
 *         description: Someone else changed the order at the same moment
 *         content:
 *           application/json:
 *             example: { success: false, message: This order was just updated by someone else. Refresh to see its current status. }
 */
router.patch('/:id/status', authorize('Admin'), orderStatusValidation, orderController.updateOrderStatus);

// Owner or Admin

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get one order (owner or Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Order retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Order retrieved successfully. }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Not the owner
 *         content:
 *           application/json:
 *             example: { success: false, message: Access denied. You can only view your own orders. }
 *       404:
 *         description: No order with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Order not found. }
 */
router.get('/:id', objectIdParam('id', 'order'), orderController.getOrderById);

module.exports = router;
