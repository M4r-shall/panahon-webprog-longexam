const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { auditLoggerMiddleware } = require('./Middleware/auditLoggerMiddleware');
require('dotenv').config({ override: true });

const categoryRoutes = require('./Routes/categoryRoutes');
const userRoutes = require('./Routes/userRoutes');
const productRoutes = require('./Routes/productRoutes');
const reviewRoutes = require('./Routes/reviewRoutes');
const cartRoutes = require('./Routes/cartRoutes');
const orderRoutes = require('./Routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: "http://localhost:5000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Accept", "Content-Type", "Authorization"],
};

app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:      ["'self'"],
      scriptSrc:       ["'self'"],
      styleSrc:        ["'self'", "'unsafe-inline'"],
      imgSrc:          ["'self'", "data:", "blob:"],
      connectSrc:      ["'self'"],
      fontSrc:         ["'self'", "data:"],
      objectSrc:       ["'none'"],
      frameAncestors:  ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  frameguard:     { action: "sameorigin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

app.use(express.json());
app.use(auditLoggerMiddleware);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/carts', cartRoutes);
app.use('/api/v1/orders', orderRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
