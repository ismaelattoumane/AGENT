import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  broadcast(event: string, data: any): void {
    this.server?.emit(event, { ...data, timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('subscribe_mission')
  handleSubscribe(client: Socket, missionId: string) {
    client.join(`mission:${missionId}`);
  }

  broadcastToMission(missionId: string, event: string, data: any): void {
    this.server?.to(`mission:${missionId}`).emit(event, data);
  }
}
