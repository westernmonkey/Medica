import Redis from "ioredis";

let client: Redis | null = null;

export class MatchServiceUnavailable extends Error {
  constructor() {
    super("The match service is unavailable. Please try again shortly.");
    this.name = "MatchServiceUnavailable";
  }
}

export function getRedis(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) throw new MatchServiceUnavailable();
  if (!client) {
    client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      retryStrategy: (attempt) => Math.min(attempt * 250, 1000),
    });
  }
  return client;
}
