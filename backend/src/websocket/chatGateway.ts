import type { Server, Socket } from 'socket.io';

export function registerChatGateway(io: Server): void {
  io.on('connection', (socket: Socket) => {
    socket.on('disconnect', () => {
      // Placeholder for future cleanup logic
    });
  });
}

