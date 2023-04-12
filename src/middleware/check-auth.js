const HttpError = require("../models/http-error");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  // const { token } = req.cookies;
  let token;
  try {
    token = req.header("Authorization").replace("Bearer ", "");
  } catch (err) {
    const error = new HttpError("Please login first, token missing", 401);
    next(error);
  }

  if (!token) {
    const error = new HttpError("Please login first, token missing", 401);
    next(error);
  }

  let decoded;
  try {
    decoded = await jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new HttpError("Invalid Token", 401));
  }
  try {
    req.userData = await User.findById(decoded._id);

    next();
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }
};

// compare with node_app !
