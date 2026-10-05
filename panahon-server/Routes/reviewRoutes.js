const express = require('express');
const router = express.Router();
const reviewController = require('../Controllers/reviewController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const {
    reviewValidation,
    reviewUpdateValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');

/**
 * @openapi
 * /reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: List reviews, optionally for one product
 *     parameters:
 *       - { name: product, in: query, schema: { type: string }, description: Product id. An invalid id returns an empty list. }
 *     responses:
 *       200:
 *         description: Reviews and the average rating
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Reviews retrieved successfully. }
 *                 count: { type: integer, example: 2 }
 *                 averageRating: { type: number, example: 4.5 }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Review' } }
 *       500: { $ref: '#/components/responses/ServerError' }
 *   post:
 *     tags: [Reviews]
 *     summary: Post a review (one per user per product)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product, rating, comment]
 *             properties:
 *               product: { $ref: '#/components/schemas/ObjectId' }
 *               rating: { type: integer, minimum: 1, maximum: 5, example: 5 }
 *               comment: { type: string, minLength: 3, maxLength: 500, example: Great quality and fast pickup! }
 *     responses:
 *       201:
 *         description: Review posted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Review posted successfully. }
 *                 data: { $ref: '#/components/schemas/Review' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Product does not exist
 *         content:
 *           application/json:
 *             example: { success: false, message: Product not found. }
 *       409:
 *         description: This user already reviewed the product
 *         content:
 *           application/json:
 *             example: { success: false, message: You have already reviewed this product. Edit your existing review instead. }
 */
router.get('/', reviewController.getAllReviews);

router.post('/', authentication, authorize('Admin', 'Customer'), reviewValidation, reviewController.createReview);

/**
 * @openapi
 * /reviews/{id}:
 *   put:
 *     tags: [Reviews]
 *     summary: Edit a review (author or Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5, example: 4 }
 *               comment: { type: string, minLength: 3, maxLength: 500, example: Still good after a month of use. }
 *     responses:
 *       200:
 *         description: Review updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Review updated successfully. }
 *                 data: { $ref: '#/components/schemas/Review' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Not the author
 *         content:
 *           application/json:
 *             example: { success: false, message: Access denied. You can only edit your own review. }
 *       404:
 *         description: No review with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Review not found. }
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete a review (author or Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Review deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: Review deleted successfully. }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Not the author
 *         content:
 *           application/json:
 *             example: { success: false, message: Access denied. You can only delete your own review. }
 *       404:
 *         description: No review with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Review not found. }
 */
router.put('/:id', authentication, authorize('Admin', 'Customer'), reviewUpdateValidation, reviewController.updateReview);
router.delete('/:id', authentication, authorize('Admin', 'Customer'), objectIdParam('id', 'review'), reviewController.deleteReview);

module.exports = router;
