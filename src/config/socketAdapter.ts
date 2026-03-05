/**
 * Socket.IO Redis Adapter
 *
 * Enables Socket.IO events to be shared across multiple K8s pods.
 * Without this, each pod has its own in-memory socket map —
 * events emitted from Pod 1 are invisible to users on Pod 2.
 */

import { Server as SocketIOServer } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

export async function attachRedisAdapter(io: SocketIOServer): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisPassword = process.env.REDIS_PASSWORD;

  const clientOptions: any = { url: redisUrl };
  if (redisPassword) clientOptions.password = redisPassword;

  // Socket.IO needs TWO separate Redis connections: pub and sub
  const pubClient = createClient(clientOptions);
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) =>
    console.error('[Socket.IO Redis Adapter] pub client error:', err.message)
  );
  subClient.on('error', (err) =>
    console.error('[Socket.IO Redis Adapter] sub client error:', err.message)
  );

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));

  console.log('✅ [Socket.IO] Redis adapter attached — events shared across all pods');
}
