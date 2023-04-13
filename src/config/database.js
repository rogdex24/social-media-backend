const mongoose = require("mongoose");

exports.connectDatabase = () => {
  const databaseName =
    process.env.NODE_ENV === "test"
      ? process.env.TEST_DB_NAME
      : process.env.DEV_DB_NAME;

  const options = {
    dbName: databaseName,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    };

  mongoose
    .connect(process.env.MONGO_URI, options)
    .then((con) => console.log(`Database Connected: ${con.connection.host}`))
    .catch((err) => console.log(err));
};
