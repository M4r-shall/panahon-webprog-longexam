const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const PRODUCT_FOLDER = "bulldogs-exchange/products";

/**
 * Uploads an in-memory file (req.file.buffer from multer.memoryStorage) to Cloudinary.
 * memoryStorage has no req.file.path, so the buffer is streamed instead.
 */
const uploadBuffer = (buffer) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: PRODUCT_FOLDER, resource_type: "image" },
            (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(buffer);
    });

/** Deletes an image from Cloudinary. Best effort - a failure never blocks the request. */
const deleteImage = async (publicId) => {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Cloudinary delete failed:", error.message);
    }
};

module.exports = cloudinary;
module.exports.uploadBuffer = uploadBuffer;
module.exports.deleteImage = deleteImage;
