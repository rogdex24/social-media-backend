const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const HttpError = require("../models/http-error");

const Post = require("../models/post");
const User = require("../models/user");

const getPostById = async (req, res, next) => {
  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new HttpError("Valid Post ID is required", 400));
  }
  const postId = req.params.id;

  let post;
  try {
    post = await Post.findById(postId).populate("likes comments");
  } catch (err) {
    return next(new HttpError("Something went wrong could not get post", 500));
  }

  if (!post) {
    return next(new HttpError("Could not find any post with this id", 404));
  }

  res.json({
    _id: post._id,
    title: post.title,
    description: post.description,
    likes: post.likes.length,
    comments: post.comments.length,
  });
};

const createNewPost = async (req, res, next) => {
  if (!req.body.title || !req.body.description) {
    return next(new HttpError("title and description are required", 400));
  }
  const currentUserID = req.userData._id;
  const { title, description } = req.body;

  const newPost = new Post({
    title,
    description,
    creator: currentUserID,
  });

  const sess = await mongoose.startSession();
  sess.startTransaction();
  try {
    let user = await User.findById(currentUserID);
    await newPost.save({ session: sess });
    user.posts.unshift(newPost); // add the Post to the user
    await user.save({ session: sess }); // save it
    await sess.commitTransaction();
  } catch (err) {
    await sess.abortTransaction();
    return next(new HttpError(err.message, 500));
  } finally {
    sess.endSession();
  }

  res.status(201).json({
    _id: newPost._id,
    title: newPost.title,
    description: newPost.description,
    created_time: newPost.createdAt,
  });
};

const deletePostById = async (req, res, next) => {
  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new HttpError("Valid Post ID is required", 400));
  }
  const currentUserID = req.userData._id;
  const postId = req.params.id;

  let post;
  try {
    post = await Post.findById(postId).populate("creator");
  } catch (err) {
    return next(new HttpError("Something went wrong could not delete", 500));
  }

  if (!post) {
    return next(new HttpError("Could not find any post with this id", 404));
  }

  if (post.creator.id !== currentUserID) {
    return next(new HttpError("You are not allowed to delete this post", 401));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await post.remove({ session: sess });
    post.creator.posts.pull(post);
    await post.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(new HttpError("Something went wrong could not delete", 500));
  }

  res.status(201).json({
    post_id: newPost._id,
    title: newPost.title,
    message: "Post Deleted",
  });
};

const likePostById = async (req, res, next) => {
  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new HttpError("Valid Post ID is required", 400));
  }
  const currentUserID = req.userData._id;
  const postId = req.params.id;

  let post;
  try {
    post = await Post.findById(postId);
  } catch (err) {
    return next(new HttpError("Something went wrong could not like", 500));
  }

  if (!post) {
    return next(new HttpError("Post doesn't exist with this id", 404));
  }

  if (!post.likes.includes(currentUserID)) {
    try {
      post.likes.push(currentUserID);
      await post.save();
    } catch (err) {
      return next(new HttpError("Something went wrong could not like", 500));
    }
  }

  res.status(200).json({ message: "Post Liked" });
};

const unlikePostById = async (req, res, next) => {
  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new HttpError("Valid Post ID is required", 400));
  }
  const currentUserID = req.userData._id;
  const postId = req.params.id;

  let post;
  try {
    post = await Post.findById(postId);
  } catch (err) {
    return next(new HttpError("Something went wrong could not like", 500));
  }

  if (!post) {
    return next(new HttpError("Post doesn't exist with this id", 404));
  }

  if (post.likes.includes(currentUserID)) {
    try {
      post.likes.pull(currentUserID);
      await post.save();
    } catch (err) {
      return next(new HttpError("Something went wrong could not like", 500));
    }
  }

  res.status(200).json({ message: "Post Unliked" });
};

const commentOnPostById = async (req, res, next) => {
  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id) || !req.body.comment) {
    return next(new HttpError("Valid User ID and comment is required", 400));
  }
  const currentUserID = req.userData._id;
  const postId = req.params.id;
  const { comment } = req.body;

  let post;
  try {
    post = await Post.findById(postId);
  } catch (err) {
    return next(new HttpError("Something went wrong could not comment", 500));
  }

  if (!post) {
    return next(new HttpError("Post doesn't exist with this id", 404));
  }

  const newComment = {
    comment_id: uuidv4(),
    user: currentUserID,
    comment,
  };

  try {
    post.comments.push(newComment);
    await post.save();
  } catch (err) {
    return next(new HttpError("Something went wrong could not comment", 500));
  }

  res.status(201).json({ comment_id: newComment.comment_id });
};

const getAllMyPosts = async (req, res, next) => {
  const currentUserID = req.userData._id;

  let currentUser;
  try {
    currentUser = await User.findById(currentUserID).populate({
      path: "posts",
      options: {
        sort: { createdAt: "desc" }, // sort by createdAt in descending order
      },
    });
  } catch (err) {
    return next(new HttpError("Something went wrong could not get posts", 500));
  }

  if (currentUser.posts.length === 0) {
    return next(new HttpError("Could not find any posts", 404));
  }

  res.json({
    posts: currentUser.posts.map((post) => ({
      _id: post._id,
      title: post.title,
      description: post.description,
      created_at: post.createdAt,
      comments: post.comments,
      likes: post.likes.length,
    })),
  });
};

module.exports = {
  getPostById,
  createNewPost,
  deletePostById,
  likePostById,
  unlikePostById,
  commentOnPostById,
  getAllMyPosts,
};
