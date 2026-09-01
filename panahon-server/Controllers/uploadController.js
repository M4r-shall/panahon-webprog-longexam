const fs = require('fs');
const path = require('path');
const { HttpStatus } = require('../config/constants');
const { UPLOADS_DIR, UPLOADS_ROUTE } = require('../Middleware/uploadMiddleware');
const { failServer } = require('../Middleware/errorHandler');

// POST /api/v1/uploads  (Admin) - multipart/form-data, field name "image"
exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Please choose an image to upload.',
                errors: [{ field: 'image', message: 'Please choose an image to upload.' }],
            });
        }

        res.status(HttpStatus.CREATED).json({
            success: true,
            message: 'Image uploaded successfully.',
            data: {
                url: `${UPLOADS_ROUTE}/${req.file.filename}`,
                filename: req.file.filename,
                size: req.file.size,
            },
        });
    } catch (error) {
        failServer(res, error, 'uploadImage', 'The image could not be uploaded.');
    }
};

// DELETE /api/v1/uploads/:filename  (Admin) - discards a file the admin replaced or removed
exports.deleteImage = async (req, res) => {
    try {
        // Rebuild the path from our own directory so "../" cannot escape it.
        const filename = path.basename(req.params.filename);
        const target = path.join(UPLOADS_DIR, filename);

        if (!target.startsWith(UPLOADS_DIR)) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Invalid file name.',
            });
        }

        try {
            await fs.promises.unlink(target);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            // Already gone - treat as success so the UI is not blocked.
        }

        res.status(HttpStatus.OK).json({ success: true, message: 'Image removed.' });
    } catch (error) {
        failServer(res, error, 'deleteImage', 'The image could not be removed.');
    }
};
