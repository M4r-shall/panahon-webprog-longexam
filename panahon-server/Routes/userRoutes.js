const express = require('express');
const router = express.Router();
const userController = require('../Controllers/userController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const {
    registerValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation,
    userStatusValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');
const { loginLimiter, standardLimiter } = require('../Middleware/rateLimiterMiddleware');

// Public

/**
 * @openapi
 * /users/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Log in and receive a JWT
 *     description: |
 *       Returns a 24-hour JWT to send as `Authorization: Bearer <token>`.
 *       Failed attempts are counted per email: 5 failures lock the account for 3 minutes,
 *       8 for 5 minutes, and 10 for 30 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: student@nu.edu.ph }
 *               password: { type: string, example: Student123! }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401:
 *         description: Wrong email or password
 *         content:
 *           application/json:
 *             example: { success: false, message: Invalid email or password. }
 *       403:
 *         description: Account is deactivated
 *         content:
 *           application/json:
 *             example: { success: false, message: This account has been deactivated. Please contact an administrator. }
 *       429:
 *         description: Too many failed attempts, temporarily locked
 *         content:
 *           application/json:
 *             example: { message: Too many login attempts. Please try again in 3 minutes. }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
router.post('/login', loginLimiter, loginValidation, userController.login);

/**
 * @openapi
 * /users/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Create a customer account
 *     description: New accounts always get the `Customer` role. The response includes a token, so the user is logged in right away.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, minLength: 3, maxLength: 80, example: Juan Dela Cruz }
 *               email: { type: string, format: email, maxLength: 120, example: juan.delacruz@nu.edu.ph }
 *               password: { type: string, minLength: 6, maxLength: 72, example: Student123! }
 *               address: { type: string, maxLength: 200, example: 'Block 4 Lot 12, Quezon City' }
 *     responses:
 *       201:
 *         description: Account created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *             example:
 *               success: true
 *               message: Account created successfully.
 *               token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               data: { _id: 66f1c2a4b5d6e7f8091a2b3c, name: Juan Dela Cruz, email: juan.delacruz@nu.edu.ph, role: Customer, address: 'Block 4 Lot 12, Quezon City', isActive: true }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             example: { success: false, message: An account with this email already exists. }
 *       429:
 *         description: More than 100 requests from this IP in 15 minutes
 *         content:
 *           application/json:
 *             example: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
router.post('/register', standardLimiter, registerValidation, userController.registerUser);

// Authenticated (must be declared before '/:id' so 'me' is not read as an id)

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the logged-in user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Profile retrieved successfully. }
 *                 data: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/me', authentication, userController.getMe);

/**
 * @openapi
 * /users/change-password:
 *   patch:
 *     tags: [Users]
 *     summary: Change the logged-in user's password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, example: Student123! }
 *               newPassword: { type: string, minLength: 6, maxLength: 72, description: Must differ from the current password, example: NewPass456! }
 *     responses:
 *       200:
 *         description: Password changed
 *         content:
 *           application/json:
 *             example: { success: true, message: Password changed successfully. }
 *       400:
 *         description: Validation failed, or the current password is wrong
 *         content:
 *           application/json:
 *             example: { success: false, message: Your current password is incorrect., errors: [{ field: currentPassword, message: Your current password is incorrect. }] }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/change-password', authentication, changePasswordValidation, userController.changePassword);

// Admin

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: search, in: query, schema: { type: string }, description: Matches name or email }
 *       - { name: role, in: query, schema: { type: string, enum: [Customer, Admin] } }
 *       - { name: isActive, in: query, schema: { type: string, enum: ['true', 'false'] } }
 *     responses:
 *       200:
 *         description: Users, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Users retrieved successfully. }
 *                 count: { type: integer, example: 3 }
 *                 data: { type: array, items: { $ref: '#/components/schemas/User' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', authentication, authorize('Admin'), userController.getAllUsers);

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate an account (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean, example: false }
 *     responses:
 *       200:
 *         description: Status changed
 *         content:
 *           application/json:
 *             example: { success: true, message: Account deactivated successfully., data: { _id: 66f1c2a4b5d6e7f8091a2b3c, isActive: false } }
 *       400:
 *         description: Validation failed, or the admin tried to deactivate themself
 *         content:
 *           application/json:
 *             example: { success: false, message: You cannot deactivate your own account. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/:id/status', authentication, authorize('Admin'), userStatusValidation, userController.setUserStatus);

/**
 * @openapi
 * /users/remove/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: User deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: User deleted successfully. }
 *       400:
 *         description: Invalid id, or the admin tried to delete themself
 *         content:
 *           application/json:
 *             example: { success: false, message: You cannot delete your own account. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/remove/:id', authentication, authorize('Admin'), objectIdParam('id', 'user'), userController.deleteUser);

// Admin or owner

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by id (Admin, or the account owner)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: User retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: User retrieved successfully. }
 *                 data: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: A customer asked for someone else's account
 *         content:
 *           application/json:
 *             example: { success: false, message: Access denied. You can only view your own account. }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', authentication, authorize('Admin', 'Customer'), objectIdParam('id', 'user'), userController.getUserById);

/**
 * @openapi
 * /users/update/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a profile (Admin, or the account owner)
 *     description: All fields are optional. `role` and `isActive` are only applied when the caller is an Admin.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: Juan P. Dela Cruz }
 *               email: { type: string, format: email, example: student@nu.edu.ph }
 *               address: { type: string, example: 'Espana Blvd, Manila' }
 *               role: { type: string, enum: [Customer, Admin], description: Admin only }
 *               isActive: { type: boolean, description: Admin only }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Profile updated successfully. }
 *                 data: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409:
 *         description: Email taken by another account
 *         content:
 *           application/json:
 *             example: { success: false, message: That email is already used by another account. }
 */
router.patch('/update/:id', authentication, authorize('Admin', 'Customer'), updateProfileValidation, userController.updateUser);

module.exports = router;
