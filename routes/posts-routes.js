const express = require("express");
const router = express.Router();

const checkAuth = require("../middleware/check-auth");
const {getPostById, createNewPost, deletePostById, likePostById, unlikePostById, commentOnPostById, getAllMyPosts} = require("../controllers/posts-controller");

// GET post by post id
router.get("/posts/:id", getPostById);

// All endpoint below this require authentication
router.use(checkAuth);

// Create a post 
router.post("/posts/", createNewPost);

// Delete a post by post id
router.delete("/posts/:id", deletePostById);

// Like a post by post id
router.post("/like/:id", likePostById);

// Unlike a post by post id
router.post("/unlike/:id", unlikePostById);

// Comment on a post by post id
router.post("/comment/:id", commentOnPostById);

// GET get all details of a post by post id
router.get("/all_posts", getAllMyPosts);

module.exports = router;
