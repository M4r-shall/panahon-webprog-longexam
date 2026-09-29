const multer = require("multer");

// Files stay in memory and go straight to Cloudinary - nothing is written to disk.
const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            // A MulterError so errorHandler answers with a 400, not a 500.
            const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image");
            error.message = "Only JPG, PNG, or WEBP images are allowed.";
            cb(error);
        }
    }
});

/**
 * The mimetype above comes from the client and can be faked (e.g. a .txt renamed
 * to .jpg). This checks the file's actual first bytes ("magic numbers") so only a
 * real JPG, PNG, or WEBP gets through.
 */
const isRealImage = (buffer) => {
    if (!buffer || buffer.length < 12) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (png.every((byte, index) => buffer[index] === byte)) return true;

    // WEBP: "RIFF" .... "WEBP"
    if (
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) return true;

    return false;
};

// Runs after upload.single("image"). No file is fine - the image is optional.
const verifyImage = (req, res, next) => {
    if (!req.file) return next();

    if (!isRealImage(req.file.buffer)) {
        const message = "File is not a real image. Please upload a valid JPG, PNG, or WEBP.";
        return res.status(400).json({
            success: false,
            message,
            errors: [{ field: "image", message }]
        });
    }

    next();
};

module.exports = upload;
module.exports.verifyImage = verifyImage;
