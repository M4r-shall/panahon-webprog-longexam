const express = require('express');
const router = express.Router();
const uploadController = require('../Controllers/uploadController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const { uploadSingleImage } = require('../Middleware/uploadMiddleware');

// Only a signed-in Admin may put files on this server.
router.post('/', authentication, authorize('Admin'), uploadSingleImage, uploadController.uploadImage);
router.delete('/:filename', authentication, authorize('Admin'), uploadController.deleteImage);

module.exports = router;
