const express = require('express');
const router = express.Router();
const productController = require('../Controllers/productController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const upload = require('../Middleware/uploadImageMiddleware.js');
const { verifyImage } = require('../Middleware/uploadImageMiddleware.js');
const {
    productValidation,
    productUpdateValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products with search, filters, sorting and pagination
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 50, default: 10 } }
 *       - { name: search, in: query, schema: { type: string }, description: Matches product name or description }
 *       - { name: category, in: query, schema: { type: string }, description: Category id or exact category name }
 *       - { name: minPrice, in: query, schema: { type: number } }
 *       - { name: maxPrice, in: query, schema: { type: number } }
 *       - name: sort
 *         in: query
 *         schema: { type: string, enum: [price, -price, productName, -productName, createdAt, -createdAt], default: -createdAt }
 *     responses:
 *       200:
 *         description: One page of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Products retrieved successfully. }
 *                 count: { type: integer, example: 10 }
 *                 total: { type: integer, example: 24 }
 *                 totalPages: { type: integer, example: 3 }
 *                 currentPage: { type: integer, example: 1 }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Product' } }
 *       500: { $ref: '#/components/responses/ServerError' }
 *   post:
 *     tags: [Products]
 *     summary: Create a product (Admin)
 *     description: Send JSON, or multipart/form-data with an optional `image` file (JPG, PNG or WEBP, max 5MB) that is uploaded to Cloudinary. The seller is set to the logged-in admin.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/ProductMultipartInput' }
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProductInput' }
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Product created successfully. }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       400:
 *         description: Validation failed, category does not exist, or the file is not a real image
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *             example: { success: false, message: The selected category does not exist. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
router.get('/', productController.getAllProducts);

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a product by id
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Product retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Product retrieved successfully. }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       404:
 *         description: No product with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Product not found. }
 *   put:
 *     tags: [Products]
 *     summary: Update a product (Admin)
 *     description: Send every required field again. Attaching a new `image` replaces the old Cloudinary image.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/ProductMultipartInput' }
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProductInput' }
 *     responses:
 *       200:
 *         description: Product updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Product updated successfully. }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: No product with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Product not found. }
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product (Admin)
 *     description: Also removes the product's Cloudinary image.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Product deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: Product deleted successfully., data: null }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: No product with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Product not found. }
 */
router.get('/:id', objectIdParam('id', 'product'), productController.getProductById);

// Create / update accept multipart/form-data with an optional "image" file.
// upload.single() runs before the validators so it can parse the form fields into req.body.
router.post('/', authentication, authorize('Admin'), upload.single('image'), verifyImage, productValidation, productController.createProduct);
router.put('/:id', authentication, authorize('Admin'), upload.single('image'), verifyImage, productUpdateValidation, productController.updateProduct);
router.delete('/:id', authentication, authorize('Admin'), objectIdParam('id', 'product'), productController.deleteProduct);

/**
 * @openapi
 * /products/{id}/upload-image:
 *   post:
 *     tags: [Products]
 *     summary: Upload or replace a product's image (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image: { type: string, format: binary, description: 'JPG, PNG or WEBP, max 5MB' }
 *     responses:
 *       200:
 *         description: Image uploaded to Cloudinary and saved on the product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Product image uploaded successfully. }
 *                 imageUrl: { type: string, example: 'https://res.cloudinary.com/demo/image/upload/v1/bulldogs-exchange/products/abc.jpg' }
 *                 publicId: { type: string, example: bulldogs-exchange/products/abc }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       400:
 *         description: No file, wrong type, too large, or not a real image
 *         content:
 *           application/json:
 *             example: { success: false, message: Please choose an image to upload., errors: [{ field: image, message: Please choose an image to upload. }] }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: No product with that id
 *         content:
 *           application/json:
 *             example: { success: false, message: Product not found. }
 */
router.post('/:id/upload-image', authentication, authorize('Admin'), objectIdParam('id', 'product'),
    upload.single('image'),
    verifyImage,
    productController.uploadProductImage
);

module.exports = router;
