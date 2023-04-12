const HttpError = require('../models/http-error');
const User = require("../models/user");
const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      const error = new HttpError("Please login first", 401);
      throw error;
    }

    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    req.userData = await User.findById(decoded._id);

    next();
  } catch (err) {
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};


// compare with node_app !