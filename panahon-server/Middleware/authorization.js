const { HttpStatus } = require("../config/constants");

module.exports = (...roles) => {
    return async (request, response, next) => {
        try {
            if (!roles.includes(request.user.role)) {
                return response.status(HttpStatus.FORBIDDEN).json({
                    error: new Error("Access denied"),
                });
            }
            next();
        } catch (error) {
            response.status(HttpStatus.FORBIDDEN).json({
                error: new Error("Access denied"),
            });
        }
    };
};
