const app = require("./app");
const { connectDatabase } = require("./config/database");

connectDatabase();

// Start Server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
