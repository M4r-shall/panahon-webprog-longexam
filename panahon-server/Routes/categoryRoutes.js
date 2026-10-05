const express = require('express');
const router = express.Router();
const categoryController = require('../Controllers/categoryController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const {
    categoryValidation,
    categoryUpdateValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List all categories
 *     responses:
 *       200:
 *         description: Categories sorted by name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Categories retrieved successfully. }
 *                 count: { type: integer, example: 8 }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Category' } }
 *       500: { $ref: '#/components/responses/ServerError' }
 *   post:
 *     tags: [Categories]
 *     summary: Create a category (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CategoryInput' }
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Category created successfully. }
 *                 data: { $ref: '#/components/schemas/Category' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409:
 *         description: Category name already used
 *         content:
 *           application/json:
 *             example: { success: false, message: A category with that name already exists. }
 */
router.get('/', categoryController.getAllCategories);

router.post('/', authentication, authorize('Admin'), categoryValidation, categoryController.createCategory);

/**
 * @openapi
 * /categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update a category (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CategoryInput' }
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Category updated successfully. }
 *                 data: { $ref: '#/components/schemas/Category' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: No category with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Category not found. }
 *       409:
 *         description: Category name already used
 *         content:
 *           application/json:
 *             example: { success: false, message: A category with that name already exists. }
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category (Admin)
 *     description: Refused while any product still uses the category.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Category deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: Category deleted successfully. }
 *       400:
 *         description: Invalid id, or products still use this category
 *         content:
 *           application/json:
 *             example: { success: false, message: This category still has 2 product(s). Reassign them before deleting it. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: No category with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Category not found. }
 */
router.put('/:id', authentication, authorize('Admin'), categoryUpdateValidation, categoryController.updateCategory);
router.delete('/:id', authentication, authorize('Admin'), objectIdParam('id', 'category'), categoryController.deleteCategory);

module.exports = router;
