# 🐾 Bulldogs Exchange API Documentation

> REST API for **Bulldogs Exchange**, the NU campus marketplace.
> Built with Express 5, MongoDB (Mongoose), JWT authentication, Multer and Cloudinary.

| | |
|---|---|
| **Version** | 1.0.0 |
| **Base URL** | `http://localhost:5000/api/v1` |
| **Interactive docs (Swagger UI)** | [`http://localhost:5000/api-docs`](http://localhost:5000/api-docs) |
| **OpenAPI JSON** | [`http://localhost:5000/api-docs.json`](http://localhost:5000/api-docs.json) |
| **Postman collection** | [`postman/Bulldogs_Exchange_API.postman_collection.json`](postman/Bulldogs_Exchange_API.postman_collection.json) |
| **Postman environment** | [`postman/Bulldogs_Exchange_Local.postman_environment.json`](postman/Bulldogs_Exchange_Local.postman_environment.json) |
| **Author** | Marius Clarence P. Panahon · INF232 |

---

## 📑 Table of Contents

1. [Getting Started](#-getting-started)
2. [Authentication](#-authentication)
3. [Response Format](#-response-format)
4. [Status Codes](#-status-codes)
5. [Endpoint Summary](#-endpoint-summary)
6. [Health](#-health)
7. [Authentication Endpoints](#-authentication-endpoints)
8. [Users](#-users)
9. [Categories](#-categories)
10. [Suppliers](#-suppliers)
11. [Products](#-products)
12. [Reviews](#-reviews)
13. [Carts](#-carts)
14. [Orders](#-orders)
15. [Uploads](#-uploads)
16. [Data Models](#-data-models)
17. [Testing](#-testing)

---

## 🚀 Getting Started

```bash
cd panahon-server
npm install
cp .env.example .env      # fill in MONGO_URI, SECRET_KEY and the Cloudinary keys
npm run seed              # optional: demo catalog + accounts (wipes existing data)
npm start                 # http://localhost:5000
```

**Environment variables**

| Variable | Purpose |
|---|---|
| `PORT` | Port to listen on (default `5000`) |
| `MONGO_URI` | MongoDB Atlas / local connection string |
| `SECRET_KEY` | Secret used to sign JWTs |
| `CLIENT_URL` | Comma-separated origins allowed by CORS |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Product image hosting |

**Seeded demo accounts** (after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@nu.edu.ph` | `Admin123!` |
| Customer | `student@nu.edu.ph` | `Student123!` |
| Customer | `maria@nu.edu.ph` | `Student123!` |

---

## 🔐 Authentication

1. Call `POST /users/login` (or `POST /users/register`).
2. Copy the `token` from the response.
3. Send it on every protected request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- Tokens expire after **24 hours**.
- The user is re-loaded from the database on every request, so a deleted or deactivated account loses access immediately, and a role change takes effect without logging in again.

**Roles**

| Role | Can do |
|---|---|
| *Public* (no token) | Browse products, categories, suppliers and reviews; register; log in |
| `Customer` | Everything public, plus manage own profile, cart, orders and reviews |
| `Admin` | Everything, plus manage users, categories, suppliers, products, all orders, all carts, uploads |

**Rate limits**

| Route | Limit |
|---|---|
| `POST /users/register` | 100 requests per 15 minutes per IP |
| `POST /users/login` | Progressive lockout per email: 5 failures → 3 min, 8 → 5 min, 10 → 30 min |

**Auth errors (any protected route)**

| Status | Message |
|---|---|
| `401` | `Authentication required. Please log in.` (no / malformed header) |
| `401` | `Your session has expired. Please log in again.` |
| `401` | `Invalid session token. Please log in again.` |
| `401` | `This account no longer exists.` |
| `403` | `This account has been deactivated. Please contact an administrator.` |
| `403` | `Access denied. This action requires the Admin role.` |

---

## 📦 Response Format

Every response is JSON with a `success` flag and a human-readable `message`.

**Success**

```json
{
  "success": true,
  "message": "Categories retrieved successfully.",
  "count": 8,
  "data": [ ... ]
}
```

`count` appears on list endpoints. Login and register also return `token`.

**Error**

```json
{
  "success": false,
  "message": "Category not found."
}
```

**Validation error**: the `errors` array names each bad field so a form can highlight it.

```json
{
  "success": false,
  "message": "Validation failed. Please review the highlighted fields.",
  "errors": [
    { "field": "email", "message": "Invalid email address" },
    { "field": "password", "message": "Password must be at least 6 characters long" }
  ]
}
```

---

## 🚦 Status Codes

| Code | Meaning | When |
|---|---|---|
| `200` | OK | Read, update or delete succeeded |
| `201` | Created | A record was created |
| `400` | Bad Request | Validation failed, invalid id, invalid JSON, body over 100 KB, bad file, business rule broken |
| `401` | Unauthorized | Missing, invalid or expired token; wrong login |
| `403` | Forbidden | Wrong role, not the owner, or deactivated account |
| `404` | Not Found | Record or route does not exist |
| `409` | Conflict | Duplicate (email, name, review) or concurrent update |
| `429` | Too Many Requests | Rate limit / login lockout |
| `500` | Internal Server Error | Unexpected server error |

---

## 🗺️ Endpoint Summary

🔓 = public · 🔑 = any logged-in user · 🛡️ = Admin only · 👤 = owner or Admin

| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `GET` | `/health` | 🔓 | API and database status |
| `POST` | `/users/register` | 🔓 | Create a customer account |
| `POST` | `/users/login` | 🔓 | Log in, get a JWT |
| `GET` | `/users/me` | 🔑 | My profile |
| `PATCH` | `/users/change-password` | 🔑 | Change my password |
| `GET` | `/users` | 🛡️ | List users (search / filter) |
| `GET` | `/users/:id` | 👤 | Get a user |
| `PATCH` | `/users/update/:id` | 👤 | Update a profile |
| `PATCH` | `/users/:id/status` | 🛡️ | Activate / deactivate |
| `DELETE` | `/users/remove/:id` | 🛡️ | Delete a user |
| `GET` | `/categories` | 🔓 | List categories |
| `POST` | `/categories` | 🛡️ | Create category |
| `PUT` | `/categories/:id` | 🛡️ | Update category |
| `DELETE` | `/categories/:id` | 🛡️ | Delete category |
| `GET` | `/suppliers` | 🔓 | List suppliers |
| `GET` | `/suppliers/:id` | 🔓 | Get a supplier |
| `POST` | `/suppliers` | 🛡️ | Create supplier |
| `PUT` | `/suppliers/:id` | 🛡️ | Update supplier |
| `DELETE` | `/suppliers/:id` | 🛡️ | Delete supplier |
| `GET` | `/products` | 🔓 | List products (search, filter, sort, paginate) |
| `GET` | `/products/:id` | 🔓 | Get a product |
| `POST` | `/products` | 🛡️ | Create product (JSON or multipart with image) |
| `PUT` | `/products/:id` | 🛡️ | Update product |
| `DELETE` | `/products/:id` | 🛡️ | Delete product |
| `POST` | `/products/:id/upload-image` | 🛡️ | Upload / replace product image |
| `GET` | `/reviews` | 🔓 | List reviews (optionally by product) |
| `POST` | `/reviews` | 🔑 | Post a review |
| `PUT` | `/reviews/:id` | 👤 | Edit a review |
| `DELETE` | `/reviews/:id` | 👤 | Delete a review |
| `GET` | `/carts/me` | 🔑 | My cart |
| `DELETE` | `/carts/me` | 🔑 | Clear my cart |
| `POST` | `/carts/items` | 🔑 | Add to cart |
| `PATCH` | `/carts/items/:productId` | 🔑 | Set quantity |
| `DELETE` | `/carts/items/:productId` | 🔑 | Remove from cart |
| `GET` | `/carts` | 🛡️ | All carts |
| `POST` | `/orders` | 🔑 | Check out my cart |
| `GET` | `/orders/me` | 🔑 | My orders |
| `GET` | `/orders/:id` | 👤 | Get an order |
| `PATCH` | `/orders/:id/cancel` | 👤 | Cancel my Pending order |
| `GET` | `/orders` | 🛡️ | All orders (filter by status) |
| `PATCH` | `/orders/:id/status` | 🛡️ | Advance order status |
| `POST` | `/uploads` | 🛡️ | Upload image to server disk |
| `DELETE` | `/uploads/:filename` | 🛡️ | Delete uploaded image |

> Any `:id` must be a 24-character MongoDB ObjectId, otherwise the API answers `400` with `Invalid <record> id`.

---

## 💓 Health

### `GET /health` 🔓

```json
// 200 OK
{
  "success": true,
  "message": "Bulldogs Exchange API is running.",
  "database": "connected"
}
```

---

## 🔑 Authentication Endpoints

### `POST /users/register` 🔓

Creates a **Customer** account (the role cannot be chosen) and logs the user in.

**Request body**

| Field | Type | Required | Rules |
|---|---|:---:|---|
| `name` | string | ✅ | 3–80 characters |
| `email` | string | ✅ | Valid email, ≤ 120 chars, must be unique |
| `password` | string | ✅ | 6–72 characters |
| `address` | string | | ≤ 200 characters |

```json
{
  "name": "Juan Dela Cruz",
  "email": "juan.delacruz@nu.edu.ph",
  "password": "Student123!",
  "address": "Block 4 Lot 12, Quezon City"
}
```

**✅ 201 Created**

```json
{
  "success": true,
  "message": "Account created successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "_id": "66f1c2a4b5d6e7f8091a2b3c",
    "name": "Juan Dela Cruz",
    "email": "juan.delacruz@nu.edu.ph",
    "role": "Customer",
    "address": "Block 4 Lot 12, Quezon City",
    "isActive": true,
    "createdAt": "2026-09-29T08:00:00.000Z",
    "updatedAt": "2026-09-29T08:00:00.000Z"
  }
}
```

**❌ Errors**

| Status | Message |
|---|---|
| `400` | `Validation failed. Please review the highlighted fields.` + `errors[]` |
| `409` | `An account with this email already exists.` |
| `429` | `Too many requests from this IP, please try again after 15 minutes.` |

---

### `POST /users/login` 🔓

**Request body**

| Field | Type | Required |
|---|---|:---:|
| `email` | string | ✅ |
| `password` | string | ✅ |

```json
{ "email": "student@nu.edu.ph", "password": "Student123!" }
```

**✅ 200 OK**

```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": { "_id": "...", "name": "Juan Dela Cruz", "email": "student@nu.edu.ph", "role": "Customer", "isActive": true }
}
```

**❌ Errors**

| Status | Message |
|---|---|
| `400` | Validation failed + `errors[]` |
| `401` | `Invalid email or password.` |
| `403` | `This account has been deactivated. Please contact an administrator.` |
| `429` | `Too many login attempts. Please try again in N minutes.` |

---

## 👥 Users

### `GET /users/me` 🔑

Returns the logged-in user. **200** `Profile retrieved successfully.` · **404** `User not found.`

### `PATCH /users/change-password` 🔑

| Field | Type | Required | Rules |
|---|---|:---:|---|
| `currentPassword` | string | ✅ | |
| `newPassword` | string | ✅ | 6–72 chars, different from current |

```json
{ "currentPassword": "Student123!", "newPassword": "NewPass456!" }
```

| Status | Response |
|---|---|
| ✅ `200` | `Password changed successfully.` |
| ❌ `400` | `Your current password is incorrect.` (with `errors: [{ field: "currentPassword" }]`) or validation errors |

### `GET /users` 🛡️

| Query | Type | Description |
|---|---|---|
| `search` | string | Matches name or email |
| `role` | `Customer` \| `Admin` | Filter by role |
| `isActive` | `true` \| `false` | Filter by status |

**200** → `{ success, message: "Users retrieved successfully.", count, data: [User] }` (newest first)

### `GET /users/:id` 👤

A customer can only read their own account.

| Status | Message |
|---|---|
| ✅ `200` | `User retrieved successfully.` |
| ❌ `403` | `Access denied. You can only view your own account.` |
| ❌ `404` | `User not found.` |

### `PATCH /users/update/:id` 👤

All fields optional. `role` and `isActive` are only applied for Admins.

```json
{ "name": "Juan P. Dela Cruz", "email": "student@nu.edu.ph", "address": "Espana Blvd, Manila" }
```

| Status | Message |
|---|---|
| ✅ `200` | `Profile updated successfully.` |
| ❌ `400` | `You cannot remove your own Admin role.` / `You cannot deactivate your own account.` / validation |
| ❌ `403` | `Access denied. You can only update your own account.` |
| ❌ `409` | `That email is already used by another account.` |

### `PATCH /users/:id/status` 🛡️

```json
{ "isActive": false }
```

| Status | Message |
|---|---|
| ✅ `200` | `Account deactivated successfully.` / `Account activated successfully.` |
| ❌ `400` | `You cannot deactivate your own account.` |
| ❌ `404` | `User not found.` |

### `DELETE /users/remove/:id` 🛡️

| Status | Message |
|---|---|
| ✅ `200` | `User deleted successfully.` |
| ❌ `400` | `You cannot delete your own account.` |
| ❌ `404` | `User not found.` |

---

## 🏷️ Categories

### `GET /categories` 🔓

**200** → `{ success, message: "Categories retrieved successfully.", count, data: [Category] }` sorted by name.

### `POST /categories` 🛡️ · `PUT /categories/:id` 🛡️

| Field | Type | Required | Rules |
|---|---|:---:|---|
| `categoryName` | string | ✅ | 2–60 chars, unique |
| `description` | string | | ≤ 2000 chars |

```json
{ "categoryName": "Stationery", "description": "Notebooks, pens, and daily class supplies." }
```

| Status | Message |
|---|---|
| ✅ `201` / `200` | `Category created successfully.` / `Category updated successfully.` |
| ❌ `400` | Validation errors |
| ❌ `404` | `Category not found.` (PUT) |
| ❌ `409` | `A category with that name already exists.` |

### `DELETE /categories/:id` 🛡️

| Status | Message |
|---|---|
| ✅ `200` | `Category deleted successfully.` |
| ❌ `400` | `This category still has N product(s). Reassign them before deleting it.` |
| ❌ `404` | `Category not found.` |

---

## 🚚 Suppliers

### `GET /suppliers` 🔓

**200** → `{ success, message: "Suppliers retrieved successfully.", count, data: [Supplier] }` sorted by name.

### `GET /suppliers/:id` 🔓

**200** `Supplier retrieved successfully.` · **404** `Supplier not found.`

### `POST /suppliers` 🛡️ · `PUT /suppliers/:id` 🛡️

| Field | Type | Required | Rules |
|---|---|:---:|---|
| `supplierName` | string | ✅ | 2–80 chars, unique |
| `contactPerson` | string | | ≤ 80 chars |
| `email` | string | | Valid email, stored lowercase |
| `phone` | string | | Digits, spaces, `+ - ( )`, 7–20 chars |
| `address` | string | | ≤ 200 chars |

```json
{
  "supplierName": "Sampaloc School Supplies Co.",
  "contactPerson": "Ana Reyes",
  "email": "sales@sampalocsupplies.ph",
  "phone": "+63 917 123 4567",
  "address": "1234 P. Noval St., Sampaloc, Manila"
}
```

**✅ 201 Created**

```json
{
  "success": true,
  "message": "Supplier created successfully.",
  "data": {
    "_id": "66f1c2a4b5d6e7f8091a2b3c",
    "supplierName": "Sampaloc School Supplies Co.",
    "contactPerson": "Ana Reyes",
    "email": "sales@sampalocsupplies.ph",
    "phone": "+63 917 123 4567",
    "address": "1234 P. Noval St., Sampaloc, Manila",
    "createdAt": "2026-09-29T08:00:00.000Z",
    "updatedAt": "2026-09-29T08:00:00.000Z"
  }
}
```

| Status | Message |
|---|---|
| ❌ `400` | Validation errors |
| ❌ `404` | `Supplier not found.` (PUT) |
| ❌ `409` | `A supplier with that name already exists.` |

### `DELETE /suppliers/:id` 🛡️

**200** `Supplier deleted successfully.` · **404** `Supplier not found.`

---

## 🛍️ Products

### `GET /products` 🔓

| Query | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Page size (max 50) |
| `search` | string | | Matches name or description |
| `category` | string | | Category id **or** exact category name |
| `minPrice` / `maxPrice` | number | | Price range |
| `sort` | string | `-createdAt` | `price`, `-price`, `productName`, `-productName`, `createdAt`, `-createdAt` |

**✅ 200 OK**

```json
{
  "success": true,
  "message": "Products retrieved successfully.",
  "count": 10,
  "total": 24,
  "totalPages": 3,
  "currentPage": 1,
  "data": [
    {
      "_id": "66f1c2a4b5d6e7f8091a2b3c",
      "productName": "Campus Tote Bag",
      "description": "Durable canvas tote that fits a laptop and notebooks.",
      "price": 349,
      "stockQuantity": 25,
      "imageUrl": "https://res.cloudinary.com/.../campus_tote.jpg",
      "category": { "_id": "...", "categoryName": "Bags" },
      "seller": { "_id": "...", "name": "Marius Panahon", "email": "admin@nu.edu.ph" }
    }
  ]
}
```

### `GET /products/:id` 🔓

**200** `Product retrieved successfully.` · **404** `Product not found.`

### `POST /products` 🛡️ · `PUT /products/:id` 🛡️

Accepts `application/json` **or** `multipart/form-data` (add an optional `image` file). All fields are required on both create and update.

| Field | Type | Required | Rules |
|---|---|:---:|---|
| `productName` | string | ✅ | 3–120 chars |
| `description` | string | ✅ | 10–2000 chars |
| `price` | number | ✅ | 0 – 1,000,000 |
| `stockQuantity` | integer | ✅ | 0 – 1,000,000 |
| `category` | ObjectId | ✅ | Must exist |
| `imageUrl` | string | | `/path` or `http(s)://` URL |
| `image` | file | | JPG/PNG/WEBP, ≤ 5 MB → uploaded to Cloudinary |

```json
{
  "productName": "Campus Tote Bag",
  "description": "Durable canvas tote that fits a laptop and notebooks.",
  "price": 349,
  "stockQuantity": 25,
  "category": "66f1c2a4b5d6e7f8091a2b3c"
}
```

| Status | Message |
|---|---|
| ✅ `201` / `200` | `Product created successfully.` / `Product updated successfully.` |
| ❌ `400` | Validation errors · `The selected category does not exist.` · `Only JPG, PNG, or WEBP images are allowed.` · `File is not a real image. Please upload a valid JPG, PNG, or WEBP.` · `Image must be 5MB or smaller.` |
| ❌ `404` | `Product not found.` (PUT) |

### `DELETE /products/:id` 🛡️

Also deletes the product's Cloudinary image.
**200** `{ success: true, message: "Product deleted successfully.", data: null }` · **404** `Product not found.`

### `POST /products/:id/upload-image` 🛡️

`multipart/form-data` with a required `image` file.

```json
// 200 OK
{
  "success": true,
  "message": "Product image uploaded successfully.",
  "imageUrl": "https://res.cloudinary.com/.../bulldogs-exchange/products/abc.jpg",
  "publicId": "bulldogs-exchange/products/abc",
  "data": { "...": "updated Product" }
}
```

| Status | Message |
|---|---|
| ❌ `400` | `Please choose an image to upload.` · file type/size/content errors |
| ❌ `404` | `Product not found.` |

---

## ⭐ Reviews

### `GET /reviews` 🔓

Optional query `product=<productId>`.

```json
// 200 OK
{
  "success": true,
  "message": "Reviews retrieved successfully.",
  "count": 2,
  "averageRating": 4.5,
  "data": [
    {
      "_id": "...",
      "product": { "_id": "...", "productName": "Campus Tote Bag", "imageUrl": "..." },
      "user": { "_id": "...", "name": "Juan Dela Cruz", "email": "student@nu.edu.ph" },
      "rating": 5,
      "comment": "Very sturdy tote."
    }
  ]
}
```

### `POST /reviews` 🔑

One review per user per product.

| Field | Type | Required | Rules |
|---|---|:---:|---|
| `product` | ObjectId | ✅ | Must exist |
| `rating` | integer | ✅ | 1–5 |
| `comment` | string | ✅ | 3–500 chars |

| Status | Message |
|---|---|
| ✅ `201` | `Review posted successfully.` |
| ❌ `404` | `Product not found.` |
| ❌ `409` | `You have already reviewed this product. Edit your existing review instead.` |

### `PUT /reviews/:id` 👤

Body: `rating` and/or `comment` (same rules, both optional).
**200** `Review updated successfully.` · **403** `Access denied. You can only edit your own review.` · **404** `Review not found.`

### `DELETE /reviews/:id` 👤

**200** `Review deleted successfully.` · **403** `Access denied. You can only delete your own review.` · **404** `Review not found.`

---

## 🛒 Carts

Every cart route requires a token. The cart is created on first access, and `totalPrice` is recalculated from live product prices on every response.

### `GET /carts/me` 🔑

```json
// 200 OK
{
  "success": true,
  "message": "Cart retrieved successfully.",
  "data": {
    "_id": "...",
    "user": "...",
    "items": [ { "product": { "_id": "...", "productName": "Campus Tote Bag", "price": 349 }, "quantity": 2 } ],
    "totalPrice": 698
  }
}
```

### `POST /carts/items` 🔑

```json
{ "productId": "66f1c2a4b5d6e7f8091a2b3c", "quantity": 2 }
```

Adds to any quantity already in the cart.

| Status | Message |
|---|---|
| ✅ `201` | `<productName> added to your cart.` |
| ❌ `400` | `<productName> is out of stock.` · `Only N unit(s) of <productName> are in stock.` |
| ❌ `404` | `Product not found.` |

### `PATCH /carts/items/:productId` 🔑

```json
{ "quantity": 3 }
```

`quantity: 0` removes the line.
**200** `Cart updated.` / `Item removed from your cart.` · **400** stock error · **404** `That item is not in your cart.`

### `DELETE /carts/items/:productId` 🔑

**200** `Item removed from your cart.` · **404** `That item is not in your cart.`

### `DELETE /carts/me` 🔑

**200** `Cart cleared.`

### `GET /carts` 🛡️

**200** → `{ success, message: "Carts retrieved successfully.", count, data: [Cart] }`

---

## 📦 Orders

### Order lifecycle

```
Pending ──► Confirmed ──► Ready for Claiming ──► Claimed
   │            │                 │
   └────────────┴─────────────────┴──► Cancelled   (stock restored)
```

### `POST /orders` 🔑

Checks out the **server-side cart**: stock is reserved atomically, then the cart is emptied.

| Field | Type | Required | Rules |
|---|---|:---:|---|
| `paymentMethod` | string | ✅ | `Cash on Pickup`, `GCash`, `Bank Transfer`, `Maya` |
| `shippingAddress` | string | | 5–200 chars · default `NU Campus Pickup Counter` |

```json
{ "paymentMethod": "GCash", "shippingAddress": "NU Campus Pickup Counter" }
```

**✅ 201 Created**

```json
{
  "success": true,
  "message": "Order placed successfully.",
  "data": {
    "_id": "...",
    "user": { "_id": "...", "name": "Juan Dela Cruz", "email": "student@nu.edu.ph" },
    "orderItems": [ { "product": "...", "productName": "Campus Tote Bag", "quantity": 2, "priceAtPurchase": 349 } ],
    "shippingAddress": "NU Campus Pickup Counter",
    "paymentMethod": "GCash",
    "totalPrice": 698,
    "orderStatus": "Pending"
  }
}
```

| Status | Message |
|---|---|
| ❌ `400` | `Your cart is empty. Add a product before checking out.` · `Only N unit(s) of X are still in stock.` · validation |

### `GET /orders/me` 🔑

**200** → my orders, newest first.

### `GET /orders/:id` 👤

**200** `Order retrieved successfully.` · **403** `Access denied. You can only view your own orders.` · **404** `Order not found.`

### `PATCH /orders/:id/cancel` 👤

Owner only, and only while `Pending`. Restores stock.

| Status | Message |
|---|---|
| ✅ `200` | `Order cancelled.` |
| ❌ `400` | `This order is already "Confirmed" and can no longer be cancelled. Please contact the store.` |
| ❌ `403` | `Access denied. You can only cancel your own orders.` |
| ❌ `409` | `This order was just updated by the store. Refresh to see its current status.` |

### `GET /orders` 🛡️

Optional query `status` = one of the lifecycle statuses.

### `PATCH /orders/:id/status` 🛡️

```json
{ "orderStatus": "Confirmed" }
```

| Status | Message |
|---|---|
| ✅ `200` | `Order marked as "Confirmed".` |
| ❌ `400` | `An order that is "Pending" can only move to: Confirmed, Cancelled.` · `An order that is "Claimed" can no longer be updated.` |
| ❌ `409` | `This order was just updated by someone else. Refresh to see its current status.` |

---

## 🖼️ Uploads

Images saved on the server disk and served statically at `http://localhost:5000/uploads/<filename>` (outside `/api/v1`).

### `POST /uploads` 🛡️

`multipart/form-data`, field `image` (PNG, JPG, WEBP or GIF, ≤ 2 MB). The server renames the file.

```json
// 201 Created
{
  "success": true,
  "message": "Image uploaded successfully.",
  "data": { "url": "/uploads/1788251189440-d6dac9cdfc78.jpg", "filename": "1788251189440-d6dac9cdfc78.jpg", "size": 48213 }
}
```

**400** `Please choose an image to upload.` / file type or size error.

### `DELETE /uploads/:filename` 🛡️

**200** `Image removed.` (also when the file was already gone) · **400** `Invalid file name.`

---

## 🧬 Data Models

<details open>
<summary><b>User</b></summary>

| Field | Type | Notes |
|---|---|---|
| `name` | String | required |
| `email` | String | required, unique, lowercase |
| `password` | String | bcrypt hash, **never returned** |
| `role` | String | `Customer` (default) \| `Admin` |
| `address` | String | |
| `isActive` | Boolean | default `true` |
</details>

<details open>
<summary><b>Category</b></summary>

| Field | Type | Notes |
|---|---|---|
| `categoryName` | String | required, unique |
| `description` | String | |
</details>

<details open>
<summary><b>Supplier</b></summary>

| Field | Type | Notes |
|---|---|---|
| `supplierName` | String | required, unique |
| `contactPerson` | String | |
| `email` | String | lowercase |
| `phone` | String | |
| `address` | String | |
</details>

<details open>
<summary><b>Product</b></summary>

| Field | Type | Notes |
|---|---|---|
| `productName` | String | required |
| `description` | String | required |
| `price` | Number | required, ≥ 0 |
| `stockQuantity` | Number | required, ≥ 0 |
| `imageUrl` | String | Cloudinary URL or path |
| `imagePublicId` | String | Cloudinary id |
| `category` | ObjectId → Category | required |
| `seller` | ObjectId → User | set from the token |
</details>

<details open>
<summary><b>Review</b></summary>

| Field | Type | Notes |
|---|---|---|
| `product` | ObjectId → Product | required |
| `user` | ObjectId → User | required · unique together with `product` |
| `rating` | Number | 1–5 |
| `comment` | String | required |
</details>

<details open>
<summary><b>Cart</b></summary>

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → User | unique (one cart per user) |
| `items[]` | `{ product: ObjectId, quantity: Number ≥ 1 }` | |
| `totalPrice` | Number | recalculated on read |
</details>

<details open>
<summary><b>Order</b></summary>

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → User | required |
| `orderItems[]` | `{ product, productName, quantity, priceAtPurchase }` | snapshot at checkout |
| `shippingAddress` | String | default `NU Campus Pickup Counter` |
| `paymentMethod` | String | `Cash on Pickup` \| `GCash` \| `Bank Transfer` \| `Maya` |
| `totalPrice` | Number | |
| `orderStatus` | String | `Pending` → `Confirmed` → `Ready for Claiming` → `Claimed` / `Cancelled` |
</details>

All models include `createdAt` and `updatedAt` timestamps.

---

## 🧪 Testing

### Swagger UI

Open **http://localhost:5000/api-docs**, run **POST /users/login** with *Try it out*, click **Authorize**, paste the token, then try any endpoint.

### Postman

1. Import `postman/Bulldogs_Exchange_API.postman_collection.json` and `postman/Bulldogs_Exchange_Local.postman_environment.json`.
2. Select the **Bulldogs Exchange - Local** environment.
3. Open the collection → **Run** → run all folders in order.

| Folder | Requests | Covers |
|---|:---:|---|
| Authentication | 6 | Health, admin/customer login (stores tokens), 401 cases |
| Users | 18 | REGISTER, LOGIN, profile, password, admin management, cleanup |
| Categories | 8 | Full CRUD + 400/403/404/409 |
| Suppliers | 10 | Full CRUD + 400/403/404/409 |
| Products | 13 | List/search/paginate, CRUD, Cloudinary image upload |
| Reviews | 7 | CRUD, duplicate and validation errors |
| Carts | 9 | Add/update/remove/clear, stock limit, admin view |
| Orders | 16 | Checkout, stock reserve/restore, status transitions, cancel |
| Uploads | 4 | Disk upload, delete, 400/403 |
| Cleanup | 2 | Removes test product and category |

The collection chains data through environment variables (`adminToken`, `customerToken`, `productId`, `orderId`, …) and cleans up after itself, so it can be re-run.

**Command line** (same collection, via Newman):

```bash
npx newman run postman/Bulldogs_Exchange_API.postman_collection.json \
  -e postman/Bulldogs_Exchange_Local.postman_environment.json
```

Last run: **93 requests · 495 assertions · 0 failures**.
