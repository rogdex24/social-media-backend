process.env.NODE_ENV = "test";
const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("../src/server");
const User = require("../src/models/user");
const expect = chai.expect;

chai.use(chaiHttp);

describe("POST /api/authenticate", () => {
  describe("with valid credentials", () => {
    let currentUserID;

    it("should return a JWT token", async () => {
      const res = await chai.request(app).post("/api/authenticate").send({
        email: "johndoe@example.com",
        password: "password1",
      });
      expect(res).to.have.status(200);
      expect(res.body).to.be.an("object");
      expect(res.body.token).to.be.a("string");
      expect(res.headers["set-cookie"][0]).to.be.a("string");
      currentUserID = res.body.user_id;
    });

    it("should verify that user exists in the database", async () => {
      const user = await User.findById(currentUserID);
      expect(user).to.exist;
      expect(user._id.toString()).to.deep.equal(currentUserID);
    });
  });

  describe("with invalid credentials", () => {
    it("should return a 401 Unauthorized error when given invalid credentials", function (done) {
      chai
        .request(app)
        .post("/api/authenticate")
        .send({
          email: "johndoe@example.com",
          password: "wrongpassword",
        })
        .end(function (err, res) {
          expect(res).to.have.status(401);
          expect(res.body).to.be.an("object");
          expect(res.body.message).to.equal("Invalid password");
          expect(res.headers["set-cookie"]).to.be.undefined;

          done();
        });
    });

    it("should return a 400 Bad Request error when missing email", function (done) {
      chai
        .request(app)
        .post("/api/authenticate")
        .send({
          password: "password1",
        })
        .end(function (err, res) {
          expect(res).to.have.status(400);
          expect(res.body).to.be.an("object");
          expect(res.headers["set-cookie"]).to.be.undefined;

          done();
        });
    });

    it("should return a 400 Bad Request error when missing password", function (done) {
      chai
        .request(app)
        .post("/api/authenticate")
        .send({
          email: "johndoe@example.com",
        })
        .end(function (err, res) {
          expect(res).to.have.status(400);
          expect(res.body).to.be.an("object");
          expect(res.headers["set-cookie"]).to.be.undefined;

          done();
        });
    });
  });
});

describe("User Endpoints", () => {
  let token;
  let currentUserID;

  before(function (done) {
    // get a valid token for testing
    chai
      .request(app)
      .post("/api/authenticate")
      .send({
        email: "johndoe@example.com",
        password: "password1",
      })
      .end(function (err, res) {
        currentUserID = res.body.user_id;
        token = res.body.token;
        done();
      });
  });

  describe("POST /api/follow", function () {
    let userToFollow;
    before(function (done) {
      // create a user to follow
      chai
        .request(app)
        .post("/api/authenticate")
        .send({
          email: "janedoe@example.com",
          password: "password2",
        })
        .end(function (err, res) {
          userToFollow = res.body.user_id;
          done();
        });
    });

    it("should allow a user to follow another user", function (done) {
      chai
        .request(app)
        .post(`/api/follow/${userToFollow}`)
        .set("Authorization", `Bearer ${token}`)
        .end(function (err, res) {
          expect(res).to.have.status(200);
          done();
        });
    });

    it("should be added to followers and following", async () => {
      const otherUser = await User.findById(userToFollow);
      userFollowers = otherUser.followers.map((follower) =>
        follower.toString()
      );
      expect(userFollowers).to.have.members([currentUserID]);

      const currentUser = await User.findById(currentUserID);
      userFollowing = currentUser.following.map((following) =>
        following.toString()
      );
      expect(userFollowing).to.have.members([userToFollow]);
    });

    it("should return 400 if the invalid user id", function (done) {
      chai
        .request(app)
        .post(`/api/follow/invalidUserID`)
        .set("Authorization", `Bearer ${token}`)
        .end(function (err, res) {
          expect(res).to.have.status(400);
          done();
        });
    });

    it("should return 400 if the user tries to follow himself", function (done) {
      chai
        .request(app)
        .post(`/api/follow/${currentUserID}`)
        .set("Authorization", `Bearer ${token}`)
        .end(function (err, res) {
          expect(res).to.have.status(400);
          done();
        });
    });
  });

  describe("POST /api/unfollow", function () {
    let userToUnFollow;

    before(function (done) {
      // create a user to follow
      chai
        .request(app)
        .post("/api/authenticate")
        .send({
          email: "janedoe@example.com",
          password: "password2",
        })
        .end(function (err, res) {
          userToUnFollow = res.body.user_id;
          done();
        });
    });

    it("should allow a user to unfollow another user", function (done) {
      // first follow the user
      chai
        .request(app)
        .post(`/api/follow/${userToUnFollow}`)
        .set("Authorization", `Bearer ${token}`)
        .end(function (err, res) {
          // then unfollow the user
          chai
            .request(app)
            .post(`/api/unfollow/${userToUnFollow}`)
            .set("Authorization", `Bearer ${token}`)
            .end(function (err, res) {
              expect(res).to.have.status(200);
              done();
            });
        });
    });

    it("should be removed from followers and following", async () => {
      const user = await User.findById(userToUnFollow);
      userFollwers = user.followers.map((follower) => follower.toString());
      expect(userFollwers).to.not.have.members([currentUserID]);

      const currentUser = await User.findById(currentUserID);
      userFollowing = currentUser.following.map((following) =>
        following.toString()
      );
      expect(userFollowing).to.not.have.members([userToUnFollow]);
    });

    it("should return 400 if the invalid user id", function (done) {
      chai
        .request(app)
        .post(`/api/unfollow/invalidUserID`)
        .set("Authorization", `Bearer ${token}`)
        .end(function (err, res) {
          expect(res).to.have.status(400);
          done();
        });
    });

    it("should return 400 if the user tries to unfollow himself", function (done) {
      chai
        .request(app)
        .post(`/api/unfollow/${currentUserID}`)
        .set("Authorization", `Bearer ${token}`)
        .end(function (err, res) {
          expect(res).to.have.status(400);
          done();
        });
    });
  });

  describe("GET /api/user", function () {
    it("should return the current user's profile w/ username, followers and following", function (done) {
      chai
        .request(app)
        .get("/api/user")
        .set("Authorization", `Bearer ${token}`)
        .end(function (err, res) {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an("object");
          expect(res.body).to.have.property("username");
          expect(res.body).to.have.property("followers");
          expect(res.body).to.have.property("following");

          done();
        });
    });

    it("should return 401 if the user is not authenticated", function (done) {
      chai
        .request(app)
        .get("/api/user")
        .end(function (err, res) {
          expect(res).to.have.status(401);
          done();
        });
    });
  });
});
