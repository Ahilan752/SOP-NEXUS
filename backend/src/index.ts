import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';

// Configuration
dotenv.config();

// Imports
import { connectDB } from './utils/db';
import { seedDatabase } from './utils/seed';
import { logger } from './utils/logger';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan logger to Winston
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.http(message.trim())
  }
}));

// Serve uploads statically
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API routes
app.use('/api', apiRouter);

// Base route
app.get('/', (_req, res) => {
  res.json({ message: 'Digital SOP Platform API is running.' });
});

// Setup server and Socket.IO
const httpServer = createServer(app);
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Socket.IO event handler
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join rooms for targeted broadcasts
  socket.on('join', (data: { userId: string; role: string; departmentId?: string }) => {
    // 1. Join user-specific room
    socket.join(data.userId);
    
    // 2. Join role-specific room (e.g. 'admins')
    if (data.role === 'Admin') {
      socket.join('admins');
      logger.info(`Socket ${socket.id} joined 'admins' room`);
    }

    // 3. Join department-specific room
    if (data.departmentId) {
      socket.join(data.departmentId);
      logger.info(`Socket ${socket.id} joined department room: ${data.departmentId}`);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Start Server
const startServer = async () => {
  try {
    // Connect DB
    await connectDB();
    
    // Auto-seed DB
    await seedDatabase();

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
