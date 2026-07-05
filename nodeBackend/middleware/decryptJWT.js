const jwt = require("jsonwebtoken");
const logger = require("../logging/logger");

// Function to decrypt and return the content of the JWT
const decryptJWT = (token) => {
  try {
    // Replace "your-secret-key" with the actual secret key used to sign the JWT
    const secretKey = process.env.ACCESS_TOKEN_SECRET ; // Secret key used to sign the JWT
    const decoded = jwt.verify(token, secretKey); // Verifies and decodes the token
    return decoded; // Return the decoded content of the JWT
  } catch (error) {
    console.error("Failed to decrypt JWT:", error.message);
    logger.error("Failed to decrypt JWT:", error.message);
    return null; // Return null if token is invalid or an error occurs
  }
};

module.exports = decryptJWT;
