const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ObjectId = mongoose.Schema.Types.ObjectId;

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: [true, "Please enter an email"],
    unique: [true, "Email already exists"],
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Please enter a password"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false,
  },
  followers: [
    {
      type: ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: ObjectId,
      ref: "User",
    },
  ],
  posts: [
    {
      type: ObjectId,
      ref: "Post",
    },
  ],
});

userSchema.pre("save", async function (next) {
  // If password is updated
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  next();
});

userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateToken = function () {
  let token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  return token;
};

module.exports = mongoose.model("User", userSchema);
