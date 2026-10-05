const express = require('express');
const router = express.Router();
const cartController = require('../Controllers/cartController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const { cartItemValidation, cartQuantityValidation } = require('../Middleware/validationMiddleware');

// Every cart route is scoped to the signed-in user
router.use(authentication);

/**
 * @openapi
 * components:
 *   responses:
 *     CartResponse:
 *       description: The user's cart with live prices
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success: { type: boolean, example: true }
 *               message: { type: string, example: Cart retrieved successfully. }
 *               data: { $ref: '#/components/schemas/Cart' }
 *   parameters:
 *     ProductIdParam:
 *       name: productId
 *       in: path
 *       required: true
 *       description: Product id of the cart line
 *       schema: { type: string, example: 66f1c2a4b5d6e7f8091a2b3c }
 */

/**
 * @openapi
 * /carts/me:
 *   get:
 *     tags: [Carts]
 *     summary: Get my cart (created on first access)
 *     description: "`totalPrice` is recalculated from current product prices on every response."
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { $ref: '#/components/responses/CartResponse' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   delete:
 *     tags: [Carts]
 *     summary: Remove every item from my cart
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cart cleared
 *         content:
 *           application/json:
 *             example: { success: true, message: Cart cleared., data: { items: [], totalPrice: 0 } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/me', cartController.getMyCart);
router.delete('/me', cartController.clearCart);

/**
 * @openapi
 * /carts/items:
 *   post:
 *     tags: [Carts]
 *     summary: Add a product to my cart
 *     description: If the product is already in the cart, the quantity is added to the existing line.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { $ref: '#/components/schemas/ObjectId' }
 *               quantity: { type: integer, minimum: 1, maximum: 1000, example: 2 }
 *     responses:
 *       201:
 *         description: Item added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Campus Tote Bag added to your cart. }
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       400:
 *         description: Validation failed or not enough stock
 *         content:
 *           application/json:
 *             example: { success: false, message: Only 3 unit(s) of Campus Tote Bag are in stock. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Product does not exist
 *         content:
 *           application/json:
 *             example: { success: false, message: Product not found. }
 */
router.post('/items', cartItemValidation, cartController.addItem);

/**
 * @openapi
 * /carts/items/{productId}:
 *   patch:
 *     tags: [Carts]
 *     summary: Set the quantity of a cart line (0 removes it)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/ProductIdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, minimum: 0, maximum: 1000, example: 3 }
 *     responses:
 *       200:
 *         description: Cart updated (or line removed when quantity is 0)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Cart updated. }
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: The product is not in the cart
 *         content:
 *           application/json:
 *             example: { success: false, message: That item is not in your cart. }
 *   delete:
 *     tags: [Carts]
 *     summary: Remove one product from my cart
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/ProductIdParam' }]
 *     responses:
 *       200:
 *         description: Line removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Item removed from your cart. }
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: The product is not in the cart
 *         content:
 *           application/json:
 *             example: { success: false, message: That item is not in your cart. }
 */
router.patch('/items/:productId', cartQuantityValidation, cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);

/**
 * @openapi
 * /carts:
 *   get:
 *     tags: [Carts]
 *     summary: List every user's cart (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All carts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Carts retrieved successfully. }
 *                 count: { type: integer, example: 2 }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Cart' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', authorize('Admin'), cartController.getAllCarts);

module.exports = router;
