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
    socket.on('sendMessage', async (data: { matchId: string; senderId: string; text: string }) => {
      const { matchId, senderId, text } = data;

      try {
        // Save message to database
        const message = await prisma.message.create({
          data: {
            matchId,
            senderId,
            text,
          },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, avatar: true } }
          }
        });

        // Broadcast to everyone in the room (including the sender for acknowledgment, or use .to().emit)
        io.to(matchId).emit('receiveMessage', message);
        
        logger.info(`Message sent in room ${matchId} by ${senderId}`);
      } catch (error) {
        logger.error(`Error saving message: ${error}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected from socket: ${socket.id}`);
    });
  });
};
