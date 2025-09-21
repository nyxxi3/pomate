import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { initializeSocket } from "./lib/socket.js";
import { createServer } from "http";

const app = express();
const server = createServer(app);
import sessionRoutes from "./routes/session.route.js";
import goalRoutes from "./routes/goal.route.js";
import habitRoutes from "./routes/habit.route.js";
import favoritesRoutes from "./routes/favorites.route.js";
import roomRoutes from "./routes/room.route.js";
import roomMessageRoutes from "./routes/roomMessage.route.js";
import userPreferencesRoutes from "./routes/userPreferences.route.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/room-messages", roomMessageRoutes);
app.use("/api/user-preferences", userPreferencesRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
  initializeSocket(app, server);
  
  // Schedule cleanup of dormant rooms every hour
  setInterval(async () => {
    try {
      const { cleanupDormantRooms } = await import('./controllers/room.controller.js');
      await cleanupDormantRooms();
    } catch (error) {
      console.error("Error running room cleanup:", error);
    }
  }, 60 * 60 * 1000); // Every hour
});
