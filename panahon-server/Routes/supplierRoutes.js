const express = require('express');
const router = express.Router();
const supplierController = require('../Controllers/supplierController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const {
    supplierValidation,
    supplierUpdateValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');

/**
 * @openapi
 * /suppliers:
 *   get:
 *     tags: [Suppliers]
 *     summary: List all suppliers
 *     responses:
 *       200:
 *         description: Suppliers sorted by name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Suppliers retrieved successfully. }
 *                 count: { type: integer, example: 3 }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Supplier' } }
 *       500: { $ref: '#/components/responses/ServerError' }
 *   post:
 *     tags: [Suppliers]
 *     summary: Create a supplier (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SupplierInput' }
 *     responses:
 *       201:
 *         description: Supplier created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Supplier created successfully. }
 *                 data: { $ref: '#/components/schemas/Supplier' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409:
 *         description: Supplier name already used
 *         content:
 *           application/json:
 *             example: { success: false, message: A supplier with that name already exists. }
 */
router.get('/', supplierController.getAllSuppliers);
router.post('/', authentication, authorize('Admin'), supplierValidation, supplierController.createSupplier);

/**
 * @openapi
 * /suppliers/{id}:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get a supplier by id
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Supplier retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Supplier retrieved successfully. }
 *                 data: { $ref: '#/components/schemas/Supplier' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       404:
 *         description: No supplier with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Supplier not found. }
 *   put:
 *     tags: [Suppliers]
 *     summary: Update a supplier (Admin)
 *     description: Send the full supplier; `supplierName` is required.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SupplierInput' }
 *     responses:
 *       200:
 *         description: Supplier updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Supplier updated successfully. }
 *                 data: { $ref: '#/components/schemas/Supplier' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: No supplier with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Supplier not found. }
 *       409:
 *         description: Supplier name already used
 *         content:
 *           application/json:
 *             example: { success: false, message: A supplier with that name already exists. }
 *   delete:
 *     tags: [Suppliers]
 *     summary: Delete a supplier (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Supplier deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: Supplier deleted successfully. }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: No supplier with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Supplier not found. }
 */
router.get('/:id', objectIdParam('id', 'supplier'), supplierController.getSupplierById);
router.put('/:id', authentication, authorize('Admin'), supplierUpdateValidation, supplierController.updateSupplier);
router.delete('/:id', authentication, authorize('Admin'), objectIdParam('id', 'supplier'), supplierController.deleteSupplier);

module.exports = router;
