import express from "express";
import { protect, rateLimiter } from "../src/index.js";

const app = express();

app.use(express.json());
app.use(rateLimiter);

app.get("/protected", protect, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});

app.listen(5000, () => console.log("Server running"));