const mongoose = require("mongoose");

exports.connectDatabase = () => {
  const DB_URI =
    process.env.NODE_ENV === "test"
      ? process.env.MONGO_URI_TEST
      : process.env.MONGO_URI_DEV;

  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  mongoose
    .connect(DB_URI, options)
    .then((con) => console.log(`Database Connected: ${con.connection.host}`))
    .catch((err) => console.log(err));
};
