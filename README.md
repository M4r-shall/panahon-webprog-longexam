# CTADWEBL Advanced Web Programming - Long Exam 1

**Bulldogs Exchange** - a full-stack campus marketplace for National University.
Marius Clarence P. Panahon &middot; INF233

The React frontend (`panahon-client`) is fully integrated with the Express/MongoDB
REST API (`panahon-server`). Every product, category, cart, order, review, and user
account shown in the UI is read from and written to the database through the API -
there is no mock data left in the client.

## Tech Stack

**Client** - React 19, Vite, React Router DOM 7, Tailwind CSS 4, ESLint
**Server** - Node.js, Express 5, Mongoose, MongoDB Atlas, JWT, bcrypt, express-validator, helmet, express-rate-limit

## Features

### Session handling and RBAC
- JWT login/register; the token is kept in `localStorage` and the session is rehydrated
  on every page load through `GET /users/me`
- `ProtectedRoute` guards routes by role, `GuestRoute` keeps signed-in users out of the
  auth screens, and a 401 from an expired or revoked token logs the session out
  everywhere at once (a rejected form field never does — see Change Password below)
- Two roles - `Customer` and `Admin`. Self-registration is always a Customer; only an
  Admin can promote an account

### Customer
- Register / log in / log out
- Browse products with keyword search, category filter, sorting, and pagination
- Product detail page with stock, average rating, and all customer reviews
- Post, edit, and delete your own review (one review per product)
- Account-backed cart: add, change quantity, remove, clear
- Checkout with pickup location and payment method, then track the order status
- Cancel an order while it is still Pending
- Profile: view details, edit information, change password

### Admin
- Dashboard with live product, order, user, and review counts
- Products: create, view, edit, delete — with a **drag-free image upload** (pick a PNG/JPG/WEBP/GIF
  up to 2MB, preview it before saving) and a category picker
- Orders: filter by status and drive fulfilment - **Confirm Order** &rarr;
  **Ready for Claiming** &rarr; **Mark Claimed**, or cancel (which returns stock)
- Reviews: view all, edit, delete
- Manage Users: search and filter, edit details and role, set Active / Inactive

### Input validation and error handling
| Case | Handling |
|---|---|
| 400 validation | Field-level messages under each input, mapped from the API's `errors[]` |
| 401 authentication | Inline banner; an expired token force-logs-out and returns to sign-in. A wrong **current password** on the Change Password form is deliberately a 400 field error, so mistyping it cannot be mistaken for a dead session and sign the user out mid-form |
| 403 authorization | `/forbidden` page for routes, toast for a blocked action, distinct message for a deactivated account |
| 404 | Not-found page for routes, "Product not found" state for a bad id |
| 409 | Duplicate email and duplicate review messages |
| 429 | The login lockout countdown is shown verbatim |
| 500 / network | "Cannot reach the server" banner with a Retry button |

Client-side checks mirror the server validators so common mistakes never round-trip.
Every input is validated **again** on the server — the client's checks are a convenience,
never the enforcement point. `ApiError.fieldErrors` maps the API's `errors[{field,message}]`
back onto the matching input, so a rule that only exists server-side (max lengths, image
URL format) still lands under the right field.

### Security measures

| Area | Measure |
|---|---|
| Passwords | bcrypt (10 rounds); a `toJSON` transform strips the hash so no endpoint can return it |
| Sessions | JWT (24h). Every request re-reads the account, so a deactivated or deleted user loses access immediately instead of when the token expires |
| Privilege escalation | `role` and `isActive` are ignored on register and on a Customer's own profile update; `seller` and review `user` always come from the token, never the body |
| Self-lockout | An admin cannot deactivate, delete, or demote their own account |
| NoSQL injection | Query values are coerced to strings, so `?search[$ne]=x` cannot smuggle an operator into the filter |
| Regex injection / ReDoS | Search and category terms are regex-escaped — `?search=[` used to crash the endpoint with a 500 and `?category=.*` matched everything |
| Race conditions | Checkout reserves stock with a conditional `$inc` (no overselling); order transitions are claimed atomically (a double-cancel can no longer duplicate the stock refund) |
| Input bounds | Max lengths on every string, capped page size, 100kb body limit, `imageUrl` restricted to a relative path or an http(s) URL |
| File uploads | Admin-only; MIME whitelist (PNG/JPG/WEBP/GIF) and a 2MB cap; the stored filename is generated server-side with a random suffix and the extension comes from the MIME type, so a client-supplied name can never set the path; the delete route rebuilds the path with `basename()` so `../` cannot escape `uploads/` |
| Whitelisting | Payment method, order status, role, and sort field are all enum-checked |
| Error leakage | Mongoose/Mongo errors are logged server-side and replaced with a generic message; every `:id` is validated before it reaches Mongoose so no CastError reaches the client |
| Brute force | Progressive login lockout (3/5/30 min after 5/8/10 failures) plus a per-IP limiter on registration |
| Transport | Helmet headers; CORS restricted to the configured client origins |

**Known limitation:** the JWT lives in `localStorage`, so it is readable by any script
running on the page. That is the conventional trade-off for a token-based SPA at this
scope; a production deployment would move it to an httpOnly cookie with CSRF protection.

## Project Setup

### 1. Server

```bash
cd panahon-server
npm install
```

Create `panahon-server/.env`:

```env
PORT=5000
MONGO_URI=<your MongoDB Atlas connection string>
SECRET_KEY=<any long random string>
CLIENT_URL=http://localhost:5173,http://localhost:5174
```

`.env` is gitignored — copy `panahon-server/.env.example` and fill in your own values.
Real environment variables take precedence, so `PORT=5001 npm start` works without
editing the file.

Load the demo catalog and accounts, then start the API:

```bash
npm run seed
npm run dev
```

### 2. Client

```bash
cd panahon-client
npm install
npm run dev
```

`panahon-client/.env` points the app at the API:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Open http://localhost:5173.

### Demo accounts (created by `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@nu.edu.ph | Admin123! |
| Customer | student@nu.edu.ph | Student123! |
| Customer | maria@nu.edu.ph | Student123! |

### Other commands

```bash
npm run build   # production build (client)
npm run lint    # eslint (client)
npm run seed    # reset the database to the demo dataset (server)
```

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/users/register` | Public |
| POST | `/users/login` | Public |
| GET | `/users/me` | Authenticated |
| PATCH | `/users/change-password` | Authenticated |
| GET | `/users` | Admin |
| GET | `/users/:id` | Admin or owner |
| PATCH | `/users/update/:id` | Admin or owner |
| PATCH | `/users/:id/status` | Admin |
| DELETE | `/users/remove/:id` | Admin |
| GET | `/categories` | Public |
| POST / PUT / DELETE | `/categories`, `/categories/:id` | Admin |
| GET | `/products`, `/products/:id` | Public |
| POST / PUT / DELETE | `/products`, `/products/:id` | Admin |
| GET | `/reviews?product=:id` | Public |
| POST | `/reviews` | Authenticated |
| PUT / DELETE | `/reviews/:id` | Admin or author |
| GET / DELETE | `/carts/me` | Authenticated |
| POST | `/carts/items` | Authenticated |
| PATCH / DELETE | `/carts/items/:productId` | Authenticated |
| GET | `/orders/me` | Authenticated |
| POST | `/orders` | Authenticated |
| PATCH | `/orders/:id/cancel` | Owner |
| GET | `/orders` | Admin |
| PATCH | `/orders/:id/status` | Admin |
| POST | `/uploads` | Admin |
| DELETE | `/uploads/:filename` | Admin |

`GET /products` supports `?search=&category=&sort=&page=&limit=&minPrice=&maxPrice=`
(`category` accepts a category id or a category name).

### Product images

An admin uploads a file from the New/Edit Product form. It is sent on its own to
`POST /api/v1/uploads` (multipart, field name `image`), which stores it in
`panahon-server/uploads/` under a **server-generated** name and returns a path like
`/uploads/1788249843-2f747d.png`. That path is what the product's `imageUrl` holds, and Express
serves the folder statically, so the image appears on the catalog card, product page, cart row and
order row. Replacing a product's image or deleting the product removes the old file.

Two origins are in play: uploads are served by the **API**, while the 8 seeded images
(`/img/*.png`) are served by the **client** from `public/`. `resolveImageUrl()` in
`src/utils/format.js` prepends the API origin to `/uploads/...` paths only, so both kinds render
from the same `<img>` code.

## Routes

| Route | Access |
|---|---|
| `/` | Public - home with live catalog stats |
| `/about` | Public |
| `/products` | Public - search, filter, sort, paginate |
| `/products/:id` | Public - detail + reviews |
| `/auth/signin`, `/auth/signup` | Guests only |
| `/cart` | Customer |
| `/orders` | Customer |
| `/profile` | Customer, Admin |
| `/admin` | Admin - dashboard |
| `/admin/products` | Admin |
| `/admin/orders` | Admin |
| `/admin/reviews` | Admin |
| `/admin/users` | Admin |
| `/forbidden` | 403 page |
| anything else | 404 page |

## Order Status Flow

```
Pending -> Confirmed -> Ready for Claiming -> Claimed
   |            |                |
   +------------+----------------+--> Cancelled  (restores stock)
```

A customer may cancel only while the order is Pending. The server rejects any
transition outside this flow.

## File Structure

```text
panahon-webprog-longexam/
├── README.md
├── panahon-server/
│   ├── server.js
│   ├── seed.js
│   ├── config/constants.js
│   ├── Middleware/
│   │   ├── authentication.js        JWT verify + active-account check
│   │   ├── authorization.js         role gate
│   │   ├── validationMiddleware.js  express-validator chains
│   │   ├── errorHandler.js          404 + catch-all JSON errors
│   │   ├── rateLimiterMiddleware.js
│   │   └── auditLoggerMiddleware.js
│   ├── Models/       user, product, category, cart, order, review, log, loginAttempt
│   ├── Controllers/  one per resource
│   └── Routes/       one per resource
└── panahon-client/
    ├── .env
    ├── public/img/                  product images served by URL
    └── src/
        ├── App.jsx                  route table + guards
        ├── main.jsx                 Toast -> Auth -> Cart providers
        ├── api/                     client.js (fetch wrapper + ApiError) + one module per resource
        ├── context/                 contexts.js, AuthContext, CartContext, ToastContext
        ├── hooks/                   useAuth, useCart, useToast, useDebounce
        ├── routes/                  ProtectedRoute, GuestRoute
        ├── utils/format.js          peso, date, stock label helpers
        ├── components/              Button, Alert, FormField, Modal, ConfirmDialog,
        │                            Spinner, EmptyState, Pagination, StatusBadge,
        │                            StarRating, NavBar, Footer, ProductCard, ProductList
        ├── layouts/                 Layout, AuthLayout, AdminLayout
        └── pages/
            ├── AuthPages/           SignInPage, SignUpPage
            ├── LandingPages/        HomePage, AboutPage, ProductListPage, ProductPage
            ├── CustomerPages/       CartPage, OrdersPage, ProfilePage
            ├── AdminPages/          Dashboard, Products, Orders, Reviews, Users
            ├── NotFoundPage.jsx
            └── ForbiddenPage.jsx
```

## Notes

- `node_modules/` and `dist/` are generated and not listed above.
- Product routes use the MongoDB `_id` as the URL parameter.
- Totals, stock deductions, and order prices are always computed on the server; the
  client never sends a price.
- Passwords are hashed with bcrypt and are never returned by any endpoint.
