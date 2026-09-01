const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Everything an admin uploads lands here, and Express serves this folder statically.
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// The public path prefix these files are served under.
const UPLOADS_ROUTE = '/uploads';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// Only these types are accepted, and the extension is taken from this map rather
// than from the uploaded filename - a client-supplied name is never trusted.
const ALLOWED_TYPES = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        // Generated server-side: no path separators, no traversal, no collisions.
        const extension = ALLOWED_TYPES[file.mimetype] || '.bin';
        const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
        cb(null, `${unique}${extension}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);

    // Surfaced by errorHandler as a 400 against the "image" field.
    const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image');
    error.message = 'Only PNG, JPG, WEBP, or GIF images can be uploaded.';
    cb(error);
};

const uploadSingleImage = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
}).single('image');

/** True only for a path this server actually owns, e.g. "/uploads/172...-a1b2.png". */
const isUploadedFile = (url) => typeof url === 'string' && url.startsWith(`${UPLOADS_ROUTE}/`);

/**
 * Deletes a previously uploaded file. Best effort: a seeded "/img/..." path, an
 * external URL, or an already-missing file is ignored rather than treated as an error.
 */
const removeUploadedFile = (url) => {
    if (!isUploadedFile(url)) return;

    // basename() strips any traversal before the path is rebuilt from our own directory.
    const filename = path.basename(url);
    const target = path.join(UPLOADS_DIR, filename);

    fs.promises.unlink(target).catch(() => {
        /* file already gone - nothing to clean up */
    });
};

module.exports = {
    UPLOADS_DIR,
    UPLOADS_ROUTE,
    MAX_FILE_SIZE,
    ALLOWED_TYPES,
    uploadSingleImage,
    isUploadedFile,
    removeUploadedFile,
};
