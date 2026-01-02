/**
 * War Room 1776 - Main Server
 * Episode 0.1: Winter Ambush
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import apiRoutes from './routes/api.js';

// ES6 module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use(express.static(path.join(__dirname, '../client')));
app.use('/assets', express.static(path.join(__dirname, '../client/assets')));
app.use('/data', express.static(path.join(__dirname, '../data')));

// API Routes
app.use('/api', apiRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('⚔️ A General has joined the war room.');

  // Token movement
  socket.on('token_move', (data) => {
    console.log(`Token moved: ${data.tokenId || data.id}`);
    socket.broadcast.emit('update_token', data);
  });

  // Encounter events
  socket.on('trigger_encounter', (data) => {
    console.log(`Encounter triggered: ${data.encounterId}`);
    io.emit('encounter_start', data);
  });

  // Combat events
  socket.on('initiative_roll', (data) => {
    io.emit('initiative_update', data);
  });

  socket.on('action_taken', (data) => {
    io.emit('action_broadcast', data);
  });

  socket.on('disconnect', () => {
    console.log('A General has left the war room.');
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log('═══════════════════════════════════════════');
      console.log('🎖️  WAR ROOM 1776 - EPISODE 0.1 BETA');
      console.log('═══════════════════════════════════════════');
      console.log(`🚀 Server: http://localhost:${PORT}`);
      console.log(`📅 Campaign Date: ${process.env.CAMPAIGN_DATE}`);
      console.log(`⏰ Time: ${process.env.CAMPAIGN_START_TIME}`);
      console.log(`❄️  Weather: ${process.env.WEATHER}`);
      console.log('═══════════════════════════════════════════');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { io };
