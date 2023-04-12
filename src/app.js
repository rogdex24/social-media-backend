const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const dotenv = require("dotenv");

const HttpError = require("./models/http-error");

const postsRoutes = require("./routes/posts-routes");
const usersRoutes = require("./routes/users-routes");
dotenv.config();

const app = express();

// Middleware
if (process.env.NODE_ENV !== "test") {
  //don't show the log when it is test
  app.use(morgan("combined")); //'combined' outputs the Apache style LOGs
}
app.use(bodyParser.json());
app.use(cookieParser());

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

// ROUTES
app.use("/api", usersRoutes);
app.use("/api", postsRoutes);

// INVALID ROUTE
app.use((req, res, next) => {
  const error = new HttpError("Route doesn't Exist.", 404);
  throw error;
});

// ERROR HANDLER
app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unkown error occured" });
});

module.exports = app;
