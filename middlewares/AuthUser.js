const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // Get the token from the Authorization header

  if (!token) {
    return res.status(401).send('Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, 'userToken'); // Replace 'userToken' with your secret key
    req.user = decoded; // Attach the decoded token to the request object
    next();
  } catch (error) {
    res.status(400).send('Invalid token');
  }
}

module.exports = authenticateUser;
