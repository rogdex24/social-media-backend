const express = require("express");
const router = express.Router();
// add express validation //
const checkAuth = require("../middleware/check-auth");
const {
  authenticateUser,
  followUserById,
  unFollowUserById,
  getUserProfile,
} = require("../controllers/users-controller");

// Authenticate the user
router.post("/authenticate", authenticateUser);

// All endpoint below this require authentication
router.use(checkAuth);

// Follow a User
router.post("/follow/:id", followUserById);

// Unfollow a User
router.post("/unfollow/:id", unFollowUserById);

// Return the current user's Profile
router.get("/user", getUserProfile);

module.exports = router;
