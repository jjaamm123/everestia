const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Token missing or malformed.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.adminId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Token invalid or expired.',
    });
  }
}

module.exports = authMiddleware;
