const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

const roomHistory = new Map();

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId }) => {
    if (!roomId) return;
    socket.join(roomId);
    const rows = roomHistory.get(roomId) || [];
    socket.emit("chat-history", rows.slice(-100));
  });

  socket.on("leave-room", ({ roomId }) => {
    if (!roomId) return;
    socket.leave(roomId);
  });

  socket.on("chat-message", (payload) => {
    const roomId = payload?.roomId;
    if (!roomId) return;

    const msg = {
      bookingId: payload.bookingId,
      sender: payload.sender || "USER",
      body: String(payload.body || "").trim(),
      sentAt: payload.sentAt || new Date().toISOString(),
    };

    if (!msg.body) return;

    const rows = roomHistory.get(roomId) || [];
    rows.push(msg);
    roomHistory.set(roomId, rows.slice(-300));

    io.to(roomId).emit("chat-message", msg);
  });
});

server.listen(PORT, () => {
  console.log(`Socket server running on http://localhost:${PORT}`);
});
