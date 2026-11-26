import net from 'node:net';
import type { RateLimitRule } from '../config';

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export interface RateLimiter {
  hit(key: string, rule: RateLimitRule, nowMs: number): RateLimitResult | Promise<RateLimitResult>;
}

interface Bucket {
  hits: number[];
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  hit(
    key: string,
    rule: RateLimitRule,
    nowMs: number,
  ): { allowed: boolean; retryAfterSec: number } {
    const bucket = this.buckets.get(key) ?? { hits: [] };
    const fresh = bucket.hits.filter((stamp) => nowMs - stamp < rule.windowMs);
    if (fresh.length >= rule.limit) {
      const oldest = fresh[0] ?? nowMs;
      const retryAfterSec = Math.max(1, Math.ceil((rule.windowMs - (nowMs - oldest)) / 1000));
      bucket.hits = fresh;
      this.buckets.set(key, bucket);
      return { allowed: false, retryAfterSec };
    }
    fresh.push(nowMs);
    bucket.hits = fresh;
    this.buckets.set(key, bucket);
    return { allowed: true, retryAfterSec: 0 };
  }
}

/** Fixed-window limiter. Falls back to memory when Redis is unreachable. */
export class RedisRateLimiter implements RateLimiter {
  private readonly memory = new MemoryRateLimiter();
  private socket: net.Socket | null = null;
  private buffer = '';
  private readonly waiters: Array<(reply: Resp) => void> = [];
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly url: string) {}

  hit(key: string, rule: RateLimitRule, nowMs: number): Promise<RateLimitResult> {
    const run = this.chain.then(() => this.hitNow(key, rule, nowMs));
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async hitNow(key: string, rule: RateLimitRule, nowMs: number): Promise<RateLimitResult> {
    try {
      const count = await this.integer(['INCR', `rate:${key}`]);
      if (count === 1) await this.integer(['PEXPIRE', `rate:${key}`, String(rule.windowMs)]);
      if (count > rule.limit) {
        const ttl = await this.integer(['PTTL', `rate:${key}`]);
        return {
          allowed: false,
          retryAfterSec: Math.max(1, Math.ceil(Math.max(ttl, 1000) / 1000)),
        };
      }
      return { allowed: true, retryAfterSec: 0 };
    } catch {
      return this.memory.hit(key, rule, nowMs);
    }
  }

  private async integer(parts: string[]): Promise<number> {
    const reply = await this.command(parts);
    if (reply.kind === 'int') return reply.value;
    if (reply.kind === 'simple' && reply.value === 'OK') return 1;
    throw new Error('redis');
  }

  private command(parts: string[]): Promise<Resp> {
    return new Promise((resolve, reject) => {
      this.connect()
        .then((socket) => {
          this.waiters.push(resolve);
          socket.write(encode(parts));
        })
        .catch(reject);
    });
  }

  private connect(): Promise<net.Socket> {
    if (this.socket && !this.socket.destroyed) return Promise.resolve(this.socket);
    const parsed = new URL(this.url);
    const socket = net.connect({
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
    });
    this.socket = socket;
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      this.buffer += chunk;
      this.drain();
    });
    socket.on('error', () => {
      this.failWaiters();
    });
    socket.on('close', () => {
      if (this.socket === socket) this.socket = null;
      this.failWaiters();
    });
    return new Promise((resolve, reject) => {
      socket.once('connect', () => {
        const password = decodeURIComponent(parsed.password);
        if (!password) {
          resolve(socket);
          return;
        }
        this.waiters.push((reply) => {
          if (reply.kind === 'simple') resolve(socket);
          else reject(new Error('redis auth'));
        });
        socket.write(encode(['AUTH', password]));
      });
      socket.once('error', reject);
    });
  }

  private drain(): void {
    while (this.waiters.length > 0) {
      const parsed = parseOne(this.buffer);
      if (!parsed) return;
      this.buffer = this.buffer.slice(parsed.used);
      const waiter = this.waiters.shift();
      waiter?.(parsed.reply);
    }
  }

  private failWaiters(): void {
    const pending = this.waiters.splice(0);
    for (const waiter of pending) waiter({ kind: 'error', value: 'closed' });
    this.buffer = '';
  }
}

type Resp =
  | { kind: 'int'; value: number }
  | { kind: 'simple'; value: string }
  | { kind: 'error'; value: string };

function encode(parts: string[]): string {
  return `*${parts.length}\r\n${parts.map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join('')}`;
}

function parseOne(buffer: string): { reply: Resp; used: number } | null {
  const end = buffer.indexOf('\r\n');
  if (end < 0) return null;
  const line = buffer.slice(0, end);
  const prefix = line[0];
  const rest = line.slice(1);
  if (prefix === ':') return { reply: { kind: 'int', value: Number(rest) }, used: end + 2 };
  if (prefix === '+') return { reply: { kind: 'simple', value: rest }, used: end + 2 };
  if (prefix === '-') return { reply: { kind: 'error', value: rest }, used: end + 2 };
  if (prefix === '$') {
    const length = Number(rest);
    const start = end + 2;
    if (buffer.length < start + length + 2) return null;
    return {
      reply: { kind: 'simple', value: buffer.slice(start, start + length) },
      used: start + length + 2,
    };
  }
  return { reply: { kind: 'error', value: 'unsupported' }, used: end + 2 };
}
