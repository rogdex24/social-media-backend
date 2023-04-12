const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const postSchema = new mongoose.Schema(
  {
    creator: {
      type: ObjectId,
      required: true,
      ref: "User",
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    likes: [
      {
        type: ObjectId,
        unique: true,
        ref: "User",
      },
    ],

    comments: [
      {
        user: {
          type: ObjectId,
          required: true,
          ref: "User",
        },
        comment: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true } // adds createdAt, updatedAt
);


module.exports = mongoose.model("Post", postSchema);
