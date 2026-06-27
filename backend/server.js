import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import foodRoutes from './routes/food.js';
import userRoutes from './routes/user.js';
import leaderboardRoutes from './routes/leaderboard.js';
import adminRoutes from './routes/admin.js';
import Food from './models/Food.js';
import User from './models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("HungerBridge Backend is Running Successfully 🚀");
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve certificates
app.use('/certificates', express.static(path.join(__dirname, 'certificates')));

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/user', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Automated Cron Jobs for Auto-Assignment and Expiry
const checkExpiredRequestsAndExpiry = async () => {
  try {
    console.log('Running automated check at:', new Date().toISOString());

    // 1. Auto-reassign requests not picked up within 20 minutes
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
    const foods = await Food.find({
      'requests.status': 'requested',
      'requests.requestedAt': { $lt: twentyMinutesAgo }
    });

    let reassignedCount = 0;

    for (const food of foods) {
      const expiredRequests = food.requests.filter(
        r => r.status === 'requested' && r.requestedAt < twentyMinutesAgo
      );

      for (const request of expiredRequests) {
        food.remainingQuantity += request.quantity;
        request.status = 'auto_reassigned';
        reassignedCount += 1;

        // Penalize receiver
        const receiver = await User.findById(request.receiverId);
        if (receiver) {
          receiver.trustScore -= 5;
          receiver.latePickups += 1;
          await receiver.save();
        }
      }

      if (food.status === 'completed' && food.remainingQuantity > 0) {
        food.status = 'available';
      }

      await food.save();
      io.emit('foodUpdated', food); // Emit update
    }

    // 2. Check food expiry (mark urgent if < 30 mins, expired if passed)
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);
    const now = new Date();

    const expiringFood = await Food.find({
      status: { $in: ['available', 'urgent'] },
      expiryTime: { $lte: thirtyMinutesFromNow, $gt: now }
    });

    for (const food of expiringFood) {
      food.status = 'urgent';
      await food.save();
      io.emit('foodUpdated', food); // Emit update
    }

    const expiredFood = await Food.find({
      status: { $in: ['available', 'urgent'] },
      expiryTime: { $lte: now }
    });

    for (const food of expiredFood) {
      food.status = 'expired';
      await food.save();
      io.emit('foodUpdated', food); // Emit update
    }

    if (reassignedCount > 0 || expiringFood.length > 0 || expiredFood.length > 0) {
      io.emit('dashboardUpdated'); // Emit for general dashboard refresh
    }

    console.log(`Auto-check completed: ${reassignedCount} reassigned, ${expiringFood.length} urgent, ${expiredFood.length} expired`);
  } catch (error) {
    console.error('Auto-check error:', error);
  }
};

// Run every 2 minutes
setInterval(checkExpiredRequestsAndExpiry, 2 * 60 * 1000);

const PORT = process.env.PORT || 5001;

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "HungerBridge Backend is Running",
    timestamp: new Date().toISOString()
  });
});

// Start Server
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("====================================");
  console.log(`🚀 Server running on Port ${PORT}`);
  console.log("✅ HungerBridge Backend Started");
  console.log("====================================");
  console.log("⏰ Automated cron jobs started (2-minute interval)");
});
