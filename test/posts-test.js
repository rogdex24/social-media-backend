process.env.NODE_ENV = "test";
const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("../src/server");
const Post = require("../src/models/post");
const User = require("../src/models/user");
const expect = chai.expect;

chai.use(chaiHttp);

describe("~ posts endpoints ~", () => {
  let testUserID;
  let token;

  before(async () => {
    // Create/Authenticate a test user and get a valid token for testing
    const res = await chai.request(app).post("/api/authenticate").send({
      email: "test@example.com",
      password: "testpassword",
    });
    token = res.body.token;
    testUserID = res.body.user_id;
  });

  // Get posts
  describe("GET /api/posts/:id", () => {
    let postId;
    let testPost;

    before(async () => {
      // Create a test post
      testPost = new Post({
        title: "Test Post",
        description: "This is a test post",
        creator: testUserID,
      });
      await testPost.save();
      postId = testPost._id;
    });

    after(async () => {
      // Remove the test post and user
      await Post.findByIdAndDelete(testPost._id);
    });

    it("should return a post with ID, title, description, likes and comments", async () => {
      const res = await chai
        .request(app)
        .get(`/api/posts/${postId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res).to.have.status(200);
      expect(res.body).to.have.property("_id").that.eqls(postId.toString());
      expect(res.body).to.have.property("title", testPost.title);
      expect(res.body).to.have.property("description", testPost.description);
      expect(res.body).to.have.property("likes", 0);
      expect(res.body).to.have.property("comments", 0);
    });

    it("should return an error for an invalid ID", async () => {
      const res = await chai
        .request(app)
        .get("/api/posts/invalidid")
        .set("Authorization", `Bearer ${token}`);

      expect(res).to.have.status(400);
      expect(res.body).to.have.property("message", "Valid Post ID is required");
    });

    it("should return an error for a non-existent post ID", async () => {
      const nonExistentId = "612aa13fb7f03b001b3e3e4d"; // An ID that doesn't exist in the database
      const res = await chai
        .request(app)
        .get(`/api/posts/${nonExistentId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res).to.have.status(404);
      expect(res.body).to.have.property(
        "message",
        "Could not find any post with this id"
      );
    });
  });

  // Create Posts
  describe("POST /api/posts", () => {
    let testPostID;

    describe("with valid input", () => {
      let res;

      before(async () => {
        // Create a test post
        const resp = await chai
          .request(app)
          .post("/api/posts")
          .set("Authorization", `Bearer ${token}`)
          .send({
            title: "Test Post",
            description: "This is a test post",
          });
        res = resp;
        testPostID = res.body._id;
      });

      after(async () => {
        // remove the test post
        await Post.findByIdAndDelete(testPostID);
      });

      it("should return status 201", () => {
        expect(res.status).to.equal(201);
      });

      it("should return the correct post data", () => {
        expect(res.body).to.deep.include({
          title: "Test Post",
          description: "This is a test post",
        });
        expect(res.body).to.have.property("_id");
        expect(res.body).to.have.property("created_time");
      });

      it("should create a new post in the database", async () => {
        const post = await Post.findById(testPostID);
        expect(post).to.exist;
        expect(post.title).to.equal("Test Post");
        expect(post.description).to.equal("This is a test post");
        expect(post.creator.toString()).to.deep.equal(testUserID);
      });

      it("should add the post to the user's posts array", async () => {
        const user = await User.findById(testUserID);
        expect(user.posts).to.be.an("array").that.includes(testPostID);
      });
    });

    describe("with missing title or description", () => {
      after(async () => {
        // remove the test post
        await Post.findByIdAndDelete(testPostID);
      });

      it("should return status 400 and an error message", async () => {
        const res = await chai
          .request(app)
          .post("/api/posts")
          .set("Authorization", `Bearer ${token}`)
          .send({
            title: "Test Post",
          });
        expect(res.status).to.equal(400);
        expect(res.body).to.deep.equal({
          message: "title and description are required",
        });
      });

      it("should not create a new post in the database", async () => {
        const posts = await Post.find();
        expect(posts.length).to.equal(0);
      });
    });

    describe("with invalid token", () => {
      after(async () => {
        // remove the test post
        await Post.findByIdAndDelete(testPostID);
      });

      it("should return status 401 and an error message", async () => {
        const res = await chai
          .request(app)
          .post("/api/posts")
          .set("Authorization", "Bearer invalid_token")
          .send({
            title: "Test Post",
            description: "This is a test post",
          });
        expect(res.status).to.equal(401);
      });
    });
  });

  // Delete Posts
  describe("DELETE /api/posts/:id", () => {
    let testPostID;

    before(async () => {
      // Create a test post
      const res = await chai
        .request(app)
        .post("/api/posts")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Test Post",
          description: "This is a test post",
        });
      testPostID = res.body._id;
    });

    after(async () => {
      // remove the test post
      await Post.findByIdAndDelete(testPostID);
    });

    it("should delete the post from the database", async () => {
      const res = await chai
        .request(app)
        .delete(`/api/posts/${testPostID}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({
        message: "Post deleted successfully",
      });

      const post = await Post.findById(testPostID);
      expect(post).to.not.exist;
    });

    it("should remove the post from the user's posts array", async () => {
      const user = await User.findById(testUserID);
      expect(user.posts).to.not.have.members([testPostID]);
    });

    it("should return status 401 and an error message for invalid token", async () => {
      const res = await chai.request(app).delete(`/api/posts/${testPostID}`);
    });
  });

  let secondUserID;

  before(async () => {
    // Create a second  user
    const res = await chai.request(app).post("/api/authenticate").send({
      email: "second@example.com",
      password: "secondpassword",
    });
    secondUserID = res.body.user_id;
  });

  describe("Like ,Unlike and Comment Endpoints", () => {
    let testPost;

    before(async () => {
      // Create a test post by SECOND User
      testPost = new Post({
        title: "Test Post",
        description: "This is a test post",
        creator: secondUserID,
      });
      await testPost.save();
    });

    after(async () => {
      // Remove the test post
      await Post.findByIdAndDelete(testPost._id);
    });

    // Like Post
    describe("POST /api/like/:id", () => {
      it("should like a post and reflected in Database", async () => {
        const res = await chai
          .request(app)
          .post(`/api/like/${testPost._id}`)
          .set("Authorization", `Bearer ${token}`);

        expect(res).to.have.status(201);
        expect(res.body.message).to.equal("Post liked successfully");

        const updatedPost = await Post.findById(testPost._id);
        updatedpostLikes = updatedPost.likes.map((like) => like.toString());
        expect(updatedpostLikes).to.have.members([testUserID]);
      });

      it("should verify if post is already liked by the user", async () => {
        // Like the post first
        testPost.likes.push(testUserID);
        await testPost.save();

        const res = await chai
          .request(app)
          .post(`/api/like/${testPost._id}`)
          .set("Authorization", `Bearer ${token}`);

        expect(res).to.have.status(200);
        expect(res.body.message).to.equal("You already liked this post");
      });

      it("should return an error if post is not found / invalid post id", async () => {
        const res = await chai
          .request(app)
          .post("/api/like/123")
          .set("Authorization", `Bearer ${token}`);

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Valid Post ID is required");
      });
    });

    // Unlike Post
    describe("POST /api/unlike/:id", () => {
      before(async () => {
        // Like the post before testing unlike endpoint
        testPost.likes.push(testUserID);
        await testPost.save();
      });

      it("should unlike a post and reflected in the database", async () => {
        const res = await chai
          .request(app)
          .post(`/api/unlike/${testPost._id}`)
          .set("Authorization", `Bearer ${token}`);

        expect(res).to.have.status(200);
        expect(res.body.message).to.equal("Post unliked successfully");

        const updatedPost = await Post.findById(testPost._id);
        updatedpostLikes = updatedPost.likes.map((like) => like.toString());
        expect(updatedpostLikes).to.not.have.members([testUserID]);
      });

      it("should verify if post is not already liked by the user", async () => {
        // Unlike the post first
        testPost.likes.pull(testUserID);
        await testPost.save();

        const res = await chai
          .request(app)
          .post(`/api/unlike/${testPost._id}`)
          .set("Authorization", `Bearer ${token}`);

        expect(res).to.have.status(200);
        expect(res.body.message).to.equal("Post is already unliked by you");
      });

      it("should return an error if post is not found  / invalid post id", async () => {
        const res = await chai
          .request(app)
          .post("/api/unlike/123")
          .set("Authorization", `Bearer ${token}`);

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal("Valid Post ID is required");
      });
    });

    describe("POST /api/comment/:id", () => {
      it("should create a comment for the post", async () => {
        const newComment = {
          comment: "Test Comment",
        };

        const res = await chai
          .request(app)
          .post(`/api/comment/${testPost._id}`)
          .send(newComment)
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).to.equal(201);
        expect(res.body).to.be.an("object");
        expect(res.body.comment_id).to.be.a("string");
        comment_id = res.body.comment_id;

        const post = await Post.findById(testPost._id);

        expect(post.comments).to.be.an("array");
        expect(post.comments).to.have.lengthOf(1);
        expect(post.comments[0]._id.toString()).to.equal(comment_id);
        expect(post.comments[0].comment).to.equal(newComment.comment);
      });

      it("should return an error if text is not provided in the comment", async () => {
        const newComment = {};

        const res = await chai
          .request(app)
          .post(`/api/comment/${testPost._id}`)
          .send(newComment)
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).to.equal(400);
        expect(res.body).to.be.an("object");
        expect(res.body.message).to.equal(
          "Valid post ID and Comment text is required"
        );
      });

      it("should return an error if an invalid post ID is provided", async () => {
        const newComment = {
          comment: "Test Comment",
        };

        const res = await chai
          .request(app)
          .post(`/api/comment/1234`)
          .send(newComment)
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).to.equal(400);
        expect(res.body).to.be.an("object");
        expect(res.body.message).to.equal(
          "Valid post ID and Comment text is required"
        );
      });

      it("should return an error if an unauthorized user attempts to create a comment", async () => {
        const newComment = {
          comment: "Test Comment",
        };

        const res = await chai
          .request(app)
          .post(`/api/comment/${testPost._id}`)
          .send(newComment);

        expect(res.status).to.equal(401);
        expect(res.body).to.be.an("object");
      });
    });
  });

  // Get ALL posts
  describe("POST /api/all_posts", () => {
    before(async () => {
      // Create test posts
      testPosts = [
        {
          title: "Test Post 1",
          description: "This is test post 1",
        },
        {
          title: "Test Post 2",
          description: "This is test post 2",
        },
        {
          title: "Test Post 3",
          description: "This is test post 3",
        },
      ];

      for (let post of testPosts) {
        await chai
          .request(app)
          .post("/api/posts")
          .send(post)
          .set("Authorization", `Bearer ${token}`);
      }
    });

    afterEach(async () => {
      // Remove test posts
      await Post.deleteMany({});
    });

    it("should return all the posts sorted by created time in descending order", async () => {
      const res = await chai
        .request(app)
        .get("/api/all_posts")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.posts).to.be.an("array");

      // Check if the posts are sorted by created time in descending order
      const sortedPosts = testPosts
        .map((post) => res.body.posts.find((p) => p.title === post.title))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      expect(res.body.posts).to.deep.equal(sortedPosts);
    });

    it("should return an empty array if the user has not created any posts", async () => {
      // Make a request to get all the posts
      const res = await chai
        .request(app)
        .get("/api/all_posts")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.posts).to.be.an("array").and.to.have.lengthOf(0);
    });

    it("should return an error if an unauthorized user attempts to get all the posts", async () => {
      const res = await chai.request(app).get("/api/all_posts");

      expect(res.status).to.equal(401);
      expect(res.body).to.be.an("object");
    });
  });
});
