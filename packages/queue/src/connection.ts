import { Queue, Worker } from 'bullmq';
import { JobName, JobPayloadMap } from './jobs';
import { getEnv } from '@core/env';

const env = getEnv();

// Parse REDIS_URL (format: redis://host:port)
function parseRedisUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port || 6379)
    };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

const redisConn = parseRedisUrl(env.REDIS_URL);

export const connectionOptions = { connection: redisConn } as const;

export function buildQueue<N extends JobName>(name: N) {
  return new Queue<JobPayloadMap[N]>(name, connectionOptions);
}

export function buildWorker<N extends JobName>(name: N, processor: any) {
  return new Worker(name, processor, connectionOptions);
}

export * from './jobs';
