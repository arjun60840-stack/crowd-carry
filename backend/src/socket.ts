import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { logger } from './utils/logger';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Verify JWT token from socket auth
const verifySocketToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    return decoded.userId || decoded.id;
  } catch {
    return null;
  }
};

// Check if a user is authorized to join a match room
const isAuthorizedForRoom = async (userId: string, matchId: string): Promise<boolean> => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        package: { select: { userId: true } },
        trip: { select: { userId: true } },
      },
    });
    if (!match) return false;
    // Only the sender (package owner) or carrier (trip owner) can join
    return match.package?.userId === userId || match.trip?.userId === userId;
  } catch {
    return false;
  }
};

export const setupSocket = (io: Server) => {
  // Middleware: authenticate every socket connection via JWT
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      logger.warn(`Socket connection rejected: no token provided (${socket.id})`);
      return next(new Error('Authentication required'));
    }

    const userId = verifySocketToken(token);
    if (!userId) {
      logger.warn(`Socket connection rejected: invalid token (${socket.id})`);
      return next(new Error('Invalid authentication token'));
    }

    socket.userId = userId;
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Authenticated user ${socket.userId} connected (socket: ${socket.id})`);

    // Join a specific chat room (we use matchId as the room ID)
    socket.on('joinRoom', async (matchId: string) => {
      if (!matchId || typeof matchId !== 'string') {
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }

      // Verify user is authorized for this match room
      const authorized = await isAuthorizedForRoom(socket.userId!, matchId);
      if (!authorized) {
        logger.warn(`Unauthorized room join attempt: user ${socket.userId} -> room ${matchId}`);
        socket.emit('error', { message: 'Not authorized to join this room' });
        return;
      }

      socket.join(matchId);
      logger.info(`User ${socket.userId} joined room ${matchId}`);
    });

    // Handle incoming messages
    socket.on('sendMessage', async (data: any) => {
      try {
        const { matchId, text } = data;

        if (!matchId || !text || typeof text !== 'string') {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        // Use the authenticated userId from the socket, not from client data
        const senderId = socket.userId!;

        // Verify sender is in the room
        const rooms = Array.from(socket.rooms);
        if (!rooms.includes(matchId)) {
          socket.emit('error', { message: 'You must join the room before sending messages' });
          return;
        }

        // Save to database
        const message = await prisma.message.create({
          data: { matchId, senderId, text: text.trim() },
          include: { sender: { select: { id: true, firstName: true, lastName: true } } }
        });

        // Broadcast to everyone in the room (including sender to confirm)
        io.to(matchId).emit('receiveMessage', message);
      } catch (error) {
        logger.error('Failed to send message via socket', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Real-Time GPS Tracking
    socket.on('shareLocation', (data: { matchId: string, lat: number, lng: number }) => {
      if (!data.matchId || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
        socket.emit('error', { message: 'Invalid location data' });
        return;
      }

      // Verify sender is in the room
      const rooms = Array.from(socket.rooms);
      if (!rooms.includes(data.matchId)) {
        socket.emit('error', { message: 'You must join the room before sharing location' });
        return;
      }

      // Broadcast location to the other person in the room
      socket.to(data.matchId).emit('locationUpdate', {
        lat: data.lat,
        lng: data.lng,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      logger.info(`User ${socket.userId} disconnected (socket: ${socket.id})`);
    });
  });
};
