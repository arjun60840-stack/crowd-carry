import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';

const prisma = new PrismaClient();

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    logger.info(`User connected to socket: ${socket.id}`);

    // Join a specific chat room (we use matchId as the room ID)
    socket.on('joinRoom', (matchId: string) => {
      socket.join(matchId);
      logger.info(`Socket ${socket.id} joined room ${matchId}`);
    });

    // Handle incoming messages
    socket.on('sendMessage', async (data: any) => {
      try {
        const { matchId, senderId, text } = data;
        
        // Save to database
        const message = await prisma.message.create({
          data: { matchId, senderId, text },
          include: { sender: { select: { id: true, firstName: true, lastName: true } } }
        });

        // Broadcast to everyone in the room (including sender to confirm)
        io.to(matchId).emit('receiveMessage', message);
      } catch (error) {
        logger.error('Failed to send message via socket', error);
      }
    });

    // Real-Time GPS Tracking
    socket.on('shareLocation', (data: { matchId: string, lat: number, lng: number }) => {
      // Broadcast location to the other person in the room
      socket.to(data.matchId).emit('locationUpdate', {
        lat: data.lat,
        lng: data.lng,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
};
