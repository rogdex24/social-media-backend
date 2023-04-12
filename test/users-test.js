process.env.NODE_ENV = "test";
const chai = require("chai");
const Post = require("../models/post");
const User = require("../models/user");
const chaiHttp = require("chai-http");
const app = require("../app");
const expect = chai.expect;

chai.use(chaiHttp);

describe("POST /api/authenticate", () =>  {
  describe("with valid credentials", () => {
    let currentUserID;

    it("should return a JWT token", async () => {
      const res = await chai.request(app).post("/api/authenticate").send({
        email: "test@example.com",
        password: "testpassword",
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

  describe("with valid credentials", () => {
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

describe("POST /api/follow", function () {
  let token;
  let userToFollow;
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
        currentUserID = res.body.userId;
        token = res.body.token;
        done();
      });
  });

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
  let token;
  let userToFollow;
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
        currentUserID = res.body.userId;
        token = res.body.token;
        done();
      });
  });

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

  it("should allow a user to unfollow another user", function (done) {
    // first follow the user
    chai
      .request(app)
      .post(`/api/follow/${userToFollow}`)
      .set("Authorization", `Bearer ${token}`)
      .end(function (err, res) {
        // then unfollow the user
        chai
          .request(app)
          .post(`/api/unfollow/${userToFollow}`)
          .set("Authorization", `Bearer ${token}`)
          .end(function (err, res) {
            expect(res).to.have.status(200);
            done();
          });
      });
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
