const jwt = require("jsonwebtoken");
const User = require("../Models/userModel.js");
const { HttpStatus } = require("../config/constants.js");

module.exports = async (request, response, next) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  }

  // get the token from the authorization header
  const token = authHeader.split(" ")[1];

  if (!token) {
    return response.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  }

  let decodedToken;
  try {
    //check if the token matches the supposed origin
    decodedToken = jwt.verify(token, process.env.SECRET_KEY);
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Your session has expired. Please log in again."
        : "Invalid session token. Please log in again.";

    return response.status(HttpStatus.UNAUTHORIZED).json({ success: false, message });
  }

  try {
    // Re-read the account so a deactivated or deleted user loses access immediately,
    // without having to wait for the token to expire.
    const account = await User.findById(decodedToken.userId).select('role isActive name email');

    if (!account) {
      return response.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: "This account no longer exists.",
      });
    }

    if (!account.isActive) {
      return response.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: "This account has been deactivated. Please contact an administrator.",
      });
    }

    // pass the user down to the endpoints here (role comes from the DB, not the token)
    request.user = {
      userId: account._id.toString(),
      role: account.role,
      name: account.name,
      email: account.email,
    };

    // pass down functionality to the endpoint
    next();
  } catch (error) {
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Could not verify your session. Please try again.",
    });
  }
};
