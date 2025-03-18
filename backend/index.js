import express from "express";
import dotenv from "dotenv";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5001;

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  connectDB();
});
