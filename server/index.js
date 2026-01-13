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
import aiRoutes from './routes/aiRoutes.js';
import tokenRoutes from './routes/tokenRoutes.js';
import encounterRoutes from './routes/encounterRoutes.js';

// ES6 module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use(express.static(path.join(__dirname, '../client')));
app.use('/assets', express.static(path.join(__dirname, '../client/assets')));
app.use('/data', express.static(path.join(__dirname, '../data')));
app.use('/SPELL_VIDEOS', express.static(path.join(__dirname, '../SPELL_VIDEOS')));

// API Routes (order matters - more specific routes first!)
app.use('/api/summon', tokenRoutes);      // Character summoning (specific)
app.use('/api/encounters', encounterRoutes); // Encounter management (specific)
app.use('/api/ai', aiRoutes);             // AI endpoints (specific)
app.use('/api', apiRoutes);               // General routes (catch-all, must be last)

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

  // Timmilander token summoning
  socket.on('token_summoned', (data) => {
    console.log('🧙‍♂️ Token summoned by Timmilander:', data.token.name);
    // Broadcast to all other clients
    socket.broadcast.emit('token_summoned_remote', data);
  });

  // Encounter start from Timmilander
  socket.on('encounter_started', (data) => {
    console.log('⚔️ Encounter started:', data.encounter.name);
    // Broadcast to all clients
    io.emit('encounter_started_remote', data);
  });

  socket.on('disconnect', () => {
    console.log('A General has left the war room.');
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // HARD-CODED JSON MODE: MongoDB completely disabled for instant startup
    // Uncomment below to re-enable MongoDB:
    // connectDB().catch((err) => {
    //   console.warn('⚠️  MongoDB unavailable, using JSON-only mode');
    // });

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log('═══════════════════════════════════════════');
      console.log('🎖️  WAR ROOM 1776 - EPISODE 0.1 BETA');
      console.log('═══════════════════════════════════════════');
      console.log(`🚀 Server: http://localhost:${PORT}`);
      console.log(`📅 Campaign Date: ${process.env.CAMPAIGN_DATE}`);
      console.log(`⏰ Time: ${process.env.CAMPAIGN_START_TIME}`);
      console.log(`❄️  Weather: ${process.env.WEATHER}`);
      console.log('💾 Data Mode: HARD-CODED JSON (MongoDB disabled)');
      console.log('═══════════════════════════════════════════');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { io };
