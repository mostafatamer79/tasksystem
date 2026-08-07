import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface AccessTokenPayload {
  sub: string;
}

@WebSocketGateway({ namespace: '/notifications', cors: { origin: true, credentials: true } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.startsWith('Bearer ')
          ? client.handshake.headers.authorization.slice(7)
          : undefined);
      if (!token) throw new UnauthorizedException('Missing token');
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      client.data.userId = payload.sub;
      await client.join(this.roomFor(payload.sub));
      this.logger.log(`Socket connected for user ${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected (user ${client.data.userId ?? 'unknown'})`);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(this.roomFor(userId)).emit(event, payload);
  }

  private roomFor(userId: string) {
    return `user:${userId}`;
  }
}
