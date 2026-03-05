/**
 * Socket.IO Redis Adapter
 *
 * Uses the shared Redis client from redisService for the pub connection,
 * and creates a single duplicate for the sub connection.
 */

import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redisService from '../services/redisService';

export async function attachRedisAdapter(io: SocketIOServer): Promise<void> {
  const pubClient = redisService.getClient();
  if (!pubClient) {
    console.warn('⚠️  [Socket.IO] Redis not available — using in-memory adapter');
    return;
  }

  // Socket.IO needs a separate sub connection — duplicate the shared client
  const subClient = (pubClient as any).duplicate();
  subClient.on('error', (err: Error) =>
    console.error('[Socket.IO Redis Adapter] sub client error:', err.message)
  );
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));
  console.log('✅ [Socket.IO] Redis adapter attached — events shared across all pods');
}
