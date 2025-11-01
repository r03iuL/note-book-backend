const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.send("🔥 Notes API is running...");
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});