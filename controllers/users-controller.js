const User = require("../models/user");
const { body, validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const mongoose = require("mongoose");

const authenticateUser = async (req, res, next) => {
  await Promise.all([
    body("email", "Invalid email").normalizeEmail().isEmail().run(req),
    body("password", "Password is required").isLength({ min: 6 }).run(req),
  ]);

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    message = errors.array()[0]['msg'];
    return next(new HttpError(message, 400));
  }
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email }).select("+password");
  } catch (err) {
    return next(new HttpError(err.message, 400));
  }

  if (!existingUser) {
    // create user for dummy test
    const createdUser = new User({
      username: email.split("@")[0],
      email,
      password,
    });

    try {
      await createdUser.save();
    } catch (err) {
      return next(new HttpError(err.message, 500));
    }
    existingUser = createdUser;
  }

  const isMatch = await existingUser.matchPassword(password);

  if (!isMatch) {
    return next(new HttpError("Invalid password", 401));
  }

  let token;
  try {
    token = await existingUser.generateToken();
  } catch (err) {
    return next(new HttpError("Something went wrong", 500));
  }

  res.status(200).cookie("token", token).json({
    user_id: existingUser._id,
    token,
  });
};

const followUserById = async (req, res, next) => {
  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new HttpError("Valid User ID is required", 400));
  }
  const userToFollowID = req.params.id;
  const currentUserID = req.userData._id;

  if (currentUserID === userToFollowID) {
    return next(new HttpError("You can't follow yourself", 404));
  }

  let userToFollow, loggedInUser;
  try {
    userToFollow = await User.findById(userToFollowID);
    loggedInUser = await User.findById(currentUserID);
  } catch (err) {
    return next(new HttpError(err.message, 500));
  } 

  if (!userToFollow) {
    return next(new HttpError(err.message, 404));
  }

  // Transaction
  const sess = await mongoose.startSession();
  sess.startTransaction();
  try {
    if (!loggedInUser.following.includes(userToFollow._id)) {
      loggedInUser.following.push(userToFollow._id);
      userToFollow.followers.push(loggedInUser._id);

      await loggedInUser.save({ session: sess });
      await userToFollow.save({ session: sess });
    }
    await sess.commitTransaction();
  } catch (err) {
    await sess.abortTransaction();
    return next(new HttpError(err.message, 500));
  } finally {
    sess.endSession();
  }

  res.status(200).json({
    message: "User Followed",
  });
};

const unFollowUserById = async (req, res, next) => {
  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new HttpError("Valid User ID is required", 400));
  }
  const userToUnFollowID = req.params.id;
  const currentUserID = req.userData._id;
  if (currentUserID === userToUnFollowID) {
    return next(new HttpError("You can't unfollow yourself", 404));
  }

  let userToUnFollow, loggedInUser;
  try {
    userToUnFollow = await User.findById(userToUnFollowID);
    loggedInUser = await User.findById(currentUserID);
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  if (!userToUnFollow) {
    return next(new HttpError("User not found", 404));
  }

  // Transaction
  const sess = await mongoose.startSession();
  sess.startTransaction();
  try {
    if (loggedInUser.following.includes(userToUnFollow._id)) {
      loggedInUser.following.pull(userToUnFollow);
      userToUnFollow.followers.pull(loggedInUser);

      await loggedInUser.save({ session: sess });
      await userToUnFollow.save({ session: sess });
    }
    await sess.commitTransaction();
  } catch (err) {
    await sess.abortTransaction();
    return next(new HttpError(err.message, 500));
  } finally {
    sess.endSession();
  }
  res.status(200).json({
    message: "User UnFollowed",
  });
};

const getMyUserProfile = async (req, res, next) => {
  const currentUserID = req.userData._id;
  let userProfile;
  try {
    userProfile = await User.findById(currentUserID).populate(
      "posts followers following"
    );
  } catch (err) {
    return next(new HttpError("Something went wrong", 500));
  }

  res.status(200).json({
    username: userProfile.username,
    followers: userProfile.followers.length,
    following: userProfile.following.length,
  });
};

module.exports = {
  authenticateUser,
  followUserById,
  unFollowUserById,
  getMyUserProfile,
};
