import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Server, Socket } from 'socket.io';
import type { AuthenticatedUser } from '../common/guards/jwt-auth.guard.js';

const doctorIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface QueueUpdate {
  doctorId: string;
  change: 'appointment.created' | 'appointment.status.updated';
  appointmentId: string;
  status: string;
  queue: Array<{
    id: string;
    patientId: string;
    patientName: string;
    appointmentDate: Date;
    status: string;
  }>;
  occurredAt: string;
}

@WebSocketGateway()
export class AppointmentsGateway {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
  ) {}

  @WebSocketServer()
  private server!: Server;

  afterInit(server: Server): void {
    const origins = this.config
      .getOrThrow<string>('CORS_ORIGINS')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (!origins.length || origins.includes('*')) {
      throw new Error('CORS_ORIGINS must specify explicit frontend origins');
    }
    server.engine.use(
      (
        request: IncomingMessage,
        response: ServerResponse,
        next: (error?: Error) => void,
      ) => {
        const origin = request.headers.origin;
        if (origin && origins.includes(origin)) {
          response.setHeader('Access-Control-Allow-Origin', origin);
          response.setHeader('Vary', 'Origin');
          response.setHeader('Access-Control-Allow-Methods', 'GET,POST');
          response.setHeader(
            'Access-Control-Allow-Headers',
            'Authorization,Content-Type',
          );
        }
        if (request.method === 'OPTIONS') {
          response.writeHead(204);
          response.end();
          return;
        }
        next();
      },
    );
    server.use((client, next) => {
      const origin = client.handshake.headers.origin;
      if (origin && !origins.includes(origin)) {
        next(new Error('Origin not allowed'));
        return;
      }
      void this.authenticateSocket(client)
        .then((user) => {
          client.data.authenticatedUser = user;
          next();
        })
        .catch(() => next(new Error('Authentication required')));
    });
  }

  @SubscribeMessage('queue:join')
  async joinDoctorQueue(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('doctorId' in body) ||
      typeof body.doctorId !== 'string' ||
      !doctorIdPattern.test(body.doctorId)
    ) {
      client.emit('queue:error', { message: 'A valid doctorId is required' });
      return;
    }

    const requester = client.data.authenticatedUser as
      AuthenticatedUser | undefined;
    if (!requester) {
      client.emit('queue:error', { message: 'Authentication required' });
      return;
    }
    if (requester.role === 'DOCTOR') {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: requester.id },
        select: { id: true },
      });
      if (doctor?.id !== body.doctorId) {
        client.emit('queue:error', {
          message: 'You may only join your own doctor queue',
        });
        return;
      }
    } else if (requester.role !== 'ADMIN') {
      client.emit('queue:error', { message: 'You may not join doctor queues' });
      return;
    }

    await client.join(this.doctorRoom(body.doctorId));
    client.emit('queue:joined', { doctorId: body.doctorId });
  }

  publishQueueUpdate(update: QueueUpdate): void {
    const room = this.doctorRoom(update.doctorId);
    this.server.to(room).emit(update.change, update);
    this.server.to(room).emit('queue.updated', update);
  }

  private doctorRoom(doctorId: string): string {
    return `doctor:${doctorId}`;
  }

  private async authenticateSocket(client: Socket): Promise<AuthenticatedUser> {
    const header = client.handshake.headers.authorization;
    const authToken = client.handshake.auth?.accessToken;
    const token =
      typeof authToken === 'string'
        ? authToken
        : typeof header === 'string' && header.startsWith('Bearer ')
          ? header.slice(7)
          : undefined;
    if (!token) {
      throw new Error('Missing bearer token');
    }
    const claims = await this.jwtService.verifyAsync<{ sub?: unknown }>(token, {
      algorithms: ['HS256'],
    });
    if (typeof claims.sub !== 'string' || !doctorIdPattern.test(claims.sub)) {
      throw new Error('Invalid bearer token subject');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, role: true, hospitalId: true },
    });
    if (!user) {
      throw new Error('Authenticated user no longer exists');
    }
    return user;
  }
}
