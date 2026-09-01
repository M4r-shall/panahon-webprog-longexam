const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { auditLoggerMiddleware } = require('./Middleware/auditLoggerMiddleware');
const { notFoundHandler, errorHandler } = require('./Middleware/errorHandler');
// Real environment variables win; .env fills in whatever they do not set. This is what
// lets `PORT=5001 npm start` work locally and a host inject secrets without editing .env.
require('dotenv').config();

const { UPLOADS_DIR, UPLOADS_ROUTE } = require('./Middleware/uploadMiddleware');

const categoryRoutes = require('./Routes/categoryRoutes');
const userRoutes = require('./Routes/userRoutes');
const productRoutes = require('./Routes/productRoutes');
const reviewRoutes = require('./Routes/reviewRoutes');
const cartRoutes = require('./Routes/cartRoutes');
const orderRoutes = require('./Routes/orderRoutes');
const uploadRoutes = require('./Routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// The Vite dev server, not the API itself, is what calls this server.
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((origin) => origin.trim())
  : ["http://localhost:5173", "http://localhost:5174"];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Accept", "Content-Type", "Authorization"],
};

app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));

// This process only serves JSON, so the browser-document protections (CSP, frameguard)
// do not apply. Keep the transport-level headers Helmet sets by default.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// Cap the body size so a single request cannot buffer megabytes of JSON.
// (Uploads are multipart and are bounded separately by multer's own file-size limit.)
app.use(express.json({ limit: '100kb' }));
app.use(auditLoggerMiddleware);

// Admin-uploaded product images. Served as plain static files - no directory listing,
// no dotfiles. helmet's crossOriginResourcePolicy is set to "cross-origin" above, which
// is what lets the client dev server load these images from this origin.
app.use(UPLOADS_ROUTE, express.static(UPLOADS_DIR, {
  index: false,
  dotfiles: 'deny',
  maxAge: '7d',
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bulldogs Exchange API is running.',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Routes
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/carts', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/uploads', uploadRoutes);

// Unknown route + catch-all error responses (must stay last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Accepting requests from: ${allowedOrigins.join(', ')}`);
});
