const express = require('express');
const router = express.Router();
const uploadController = require('../Controllers/uploadController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const { uploadSingleImage } = require('../Middleware/uploadMiddleware');

// Only a signed-in Admin may put files on this server.

/**
 * @openapi
 * /uploads:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload an image to the server disk (Admin)
 *     description: The file is renamed on the server and served statically at `http://localhost:5000/uploads/<filename>` (outside `/api/v1`).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image: { type: string, format: binary, description: 'PNG, JPG, WEBP or GIF, max 2MB' }
 *     responses:
 *       201:
 *         description: Image stored
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Image uploaded successfully.
 *               data: { url: /uploads/1788251189440-d6dac9cdfc78.jpg, filename: 1788251189440-d6dac9cdfc78.jpg, size: 48213 }
 *       400:
 *         description: No file, wrong type, or too large
 *         content:
 *           application/json:
 *             example: { success: false, message: Please choose an image to upload., errors: [{ field: image, message: Please choose an image to upload. }] }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post('/', authentication, authorize('Admin'), uploadSingleImage, uploadController.uploadImage);

/**
 * @openapi
 * /uploads/{filename}:
 *   delete:
 *     tags: [Uploads]
 *     summary: Delete an uploaded image (Admin)
 *     description: A file that is already gone still counts as success.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: filename, in: path, required: true, schema: { type: string, example: 1788251189440-d6dac9cdfc78.jpg } }
 *     responses:
 *       200:
 *         description: Image removed
 *         content:
 *           application/json:
 *             example: { success: true, message: Image removed. }
 *       400:
 *         description: Invalid file name
 *         content:
 *           application/json:
 *             example: { success: false, message: Invalid file name. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.delete('/:filename', authentication, authorize('Admin'), uploadController.deleteImage);

module.exports = router;
