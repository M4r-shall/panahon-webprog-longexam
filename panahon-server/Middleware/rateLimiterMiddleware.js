const rateLimit = require("express-rate-limit");
const LoginAttempt = require("../Models/loginAttemptModel.js");

const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests from this IP, please try again after 15 minutes." },
});

//Progressive Rate Limiting for failed logins
const loginLimiter = async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next();
    }

    try {
        const attempt = await LoginAttempt.findOne({ username: email });

        // Check if user is currently locked out
        if (attempt && attempt.lockUntil && attempt.lockUntil > Date.now()) {
            const timeRemaining = Math.ceil((attempt.lockUntil - Date.now()) / 1000 / 60);
            return res.status(429).json({
                message: `Too many login attempts. Please try again in ${timeRemaining} minutes.`
            });
        }

        // Pass to next middleware. The actual check for success/failure needs to happen
        // in the controller, so we will attach a function to req to record failures.
        req.recordFailedLogin = async () => {
            let attemptRecord = await LoginAttempt.findOne({ username: email });

            if (!attemptRecord) {
                attemptRecord = new LoginAttempt({ username: email, attempts: 1 });
            } else {
                attemptRecord.attempts += 1;
            }

            // Determine lockout duration based on attempts
            let lockMinutes = 0;
            if (attemptRecord.attempts >= 10) {
                lockMinutes = 30;
            } else if (attemptRecord.attempts >= 8) {
                lockMinutes = 5;
            } else if (attemptRecord.attempts >= 5) {
                lockMinutes = 3;
            }

            if (lockMinutes > 0) {
                attemptRecord.lockUntil = new Date(Date.now() + lockMinutes * 60000);
            }

            await attemptRecord.save();
        };

        req.recordSuccessfulLogin = async () => {
            await LoginAttempt.deleteOne({ username: email });
        };

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { standardLimiter, loginLimiter };
