const { HttpStatus } = require("../config/constants");

module.exports = (...roles) => {
    return (request, response, next) => {
        if (!request.user) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Authentication required. Please log in.",
            });
        }

        if (!roles.includes(request.user.role)) {
            return response.status(HttpStatus.FORBIDDEN).json({
                success: false,
                message: `Access denied. This action requires the ${roles.join(" or ")} role.`,
            });
        }

        next();
    };
};
