process.env.NODE_ENV = "test";
const chai = require("chai");
const chaiHttp = require("chai-http");
const expect = chai.expect;
const app = require("../app");
const Post = require("../models/post");
const User = require("../models/user");

chai.use(chaiHttp);

describe("GET /api/posts/:id", () => {
  let postId;
  let testUserID;
  let testPost;
  let token;

  before(async () => {
    // get a valid token for testing // create user
    const res = await chai.request(app).post("/api/authenticate").send({
      email: "test@example.com",
      password: "testpassword",
    });
    token = res.body.token;
    testUserID = res.body.user_id;

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
    await User.findByIdAndDelete(testUserID);
  });

  it("should return a post by ID", async () => {
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

describe("POST /api/posts", () => {
  let testUserID;
  let token;
  let testPostID;

  before(async () => {
    // Create a test user and get a valid token for testing
    const res = await chai.request(app).post("/api/authenticate").send({
      email: "test@example.com",
      password: "testpassword",
    });
    token = res.body.token;
    testUserID = res.body.user_id;
  });

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
