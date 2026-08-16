const jwt = require("jsonwebtoken");
const { HttpStatus } = require("../config/constants.js");

module.exports = async (request, response, next) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return response.status(HttpStatus.UNAUTHORIZED).json({
            error: new Error("Invalid Request!"),
        });
    }

    // get the token from the authorization header
    const token = authHeader.split(" ")[1];

    if (!token) {
      return response.status(HttpStatus.UNAUTHORIZED).json({
        error: new Error("Invalid Request!"),
      });
    }

    //check if the token matches the supposed origin
    const decodedToken = await jwt.verify(token, process.env.SECRET_KEY);

    // retrieve the user details of the logged in user
    const user = await decodedToken;

    // pass the user down to the endpoints here
    request.user = user;

    // pass down functionality to the endpoint
    next();
  } catch (error) {
    response.status(HttpStatus.UNAUTHORIZED).json({
      error: new Error("Invalid request!"),
    });
  }
};
