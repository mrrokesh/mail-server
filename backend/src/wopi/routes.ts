import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccess } from '../crypto/jwt';
import { ApiError } from '../errors';

const blankPath = fileURLToPath(new URL('./blank.docx', import.meta.url));
const locks = new Map<string, string>();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function accessToken(request: FastifyRequest): string {
  const query = request.query as { access_token?: string };
  if (query.access_token) return query.access_token;
  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();
  throw new ApiError('API-AUTH-002');
}

function ids(request: FastifyRequest): {
  orgId: string;
  id: string;
  userId: string;
  email: string;
} {
  const claims = verifyAccess(
    accessToken(request),
    request.server.deps.config.jwtSecret,
    request.server.deps.now(),
  );
  if (claims.scope !== 'session') throw new ApiError('API-AUTH-002');
  const params = request.params as { id: string };
  if (!UUID_RE.test(claims.org) || !UUID_RE.test(params.id)) throw new ApiError('API-RES-404');
  return { orgId: claims.org, id: params.id, userId: claims.sub, email: claims.email };
}

function docPath(orgId: string, id: string): string {
  return path.join(process.cwd(), 'data', 'docs', orgId, `${id}.docx`);
}

function looksLikeDocx(bytes: Buffer): boolean {
  return (
    bytes.length > 64 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes.includes(Buffer.from('word/document.xml'))
  );
}

async function bytesFor(orgId: string, id: string): Promise<Buffer> {
  const target = docPath(orgId, id);
  try {
    const current = await readFile(target);
    if (looksLikeDocx(current)) return current;
  } catch {
    // The first open copies the blank document.
  }
  const blank = await readFile(blankPath);
  if (!looksLikeDocx(blank)) throw new ApiError('API-SRV-500');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, blank);
  return blank;
}

function header(request: FastifyRequest, name: string): string {
  const value = request.headers[name];
  return typeof value === 'string' ? value : '';
}

function lockId(orgId: string, id: string): string {
  return `${orgId}:${id}`;
}

async function handleLock(
  request: FastifyRequest,
  reply: FastifyReply,
  orgId: string,
  id: string,
): Promise<FastifyReply> {
  const override = header(request, 'x-wopi-override').toUpperCase();
  const key = lockId(orgId, id);
  const offered = header(request, 'x-wopi-lock');
  const current = locks.get(key) ?? '';
  if (!override || override === 'GET_LOCK') {
    return reply.code(200).header('X-WOPI-Lock', current).send('');
  }
  if (override === 'LOCK' || override === 'REFRESH_LOCK') {
    if (current && current !== offered) {
      return reply.code(409).header('X-WOPI-Lock', current).send('');
    }
    if (!offered) return reply.code(400).send('');
    locks.set(key, offered);
    return reply.code(200).header('X-WOPI-Lock', offered).send('');
  }
  if (override === 'UNLOCK') {
    if (!current || current !== offered) {
      return reply.code(409).header('X-WOPI-Lock', current).send('');
    }
    locks.delete(key);
    return reply.code(200).send('');
  }
  return reply.code(200).send('');
}

export function registerWopi(app: FastifyInstance): void {
  app.get('/api/v1/wopi/files/:id', async (request) => {
    const who = ids(request);
    await app.deps.workspace.hydrate(who.orgId);
    const doc = app.deps.workspace.findDoc(who.orgId, who.id);
    if (!doc) throw new ApiError('API-RES-404');
    const bytes = await bytesFor(who.orgId, who.id);
    if (doc.sizeBytes !== bytes.byteLength) doc.sizeBytes = bytes.byteLength;
    const name = doc.name.toLowerCase().endsWith('.docx') ? doc.name : `${doc.name}.docx`;
    return {
      BaseFileName: name,
      Size: bytes.byteLength,
      UserId: who.userId,
      UserFriendlyName: who.email,
      OwnerId: doc.ownerUserId,
      Version: String(doc.version),
      LastModifiedTime: doc.updatedAt,
      SupportsUpdate: true,
      SupportsLocks: true,
      SupportsGetLock: true,
      UserCanWrite: true,
      UserCanNotWriteRelative: true,
      DisablePrint: false,
      PostMessageOrigin: (process.env.WEB_URL ?? 'http://127.0.0.1:5173').replace(/\/$/, ''),
    };
  });

  app.post('/api/v1/wopi/files/:id', async (request, reply) => {
    const who = ids(request);
    await app.deps.workspace.hydrate(who.orgId);
    const doc = app.deps.workspace.findDoc(who.orgId, who.id);
    if (!doc) throw new ApiError('API-RES-404');
    return handleLock(request, reply, who.orgId, who.id);
  });

  app.get('/api/v1/wopi/files/:id/contents', async (request, reply) => {
    const who = ids(request);
    const bytes = await bytesFor(who.orgId, who.id);
    return reply.type('application/octet-stream').send(bytes);
  });

  app.post('/api/v1/wopi/files/:id/contents', async (request, reply) => {
    const who = ids(request);
    const override = header(request, 'x-wopi-override').toUpperCase();
    if (
      override === 'LOCK' ||
      override === 'UNLOCK' ||
      override === 'REFRESH_LOCK' ||
      override === 'GET_LOCK'
    ) {
      return handleLock(request, reply, who.orgId, who.id);
    }
    const body = request.body;
    const bytes = Buffer.isBuffer(body) ? body : Buffer.alloc(0);
    if (!looksLikeDocx(bytes)) {
      return reply.code(400).send({ code: 'API-VAL-001' });
    }
    const key = lockId(who.orgId, who.id);
    const current = locks.get(key) ?? '';
    const offered = header(request, 'x-wopi-lock');
    if (current && offered && current !== offered) {
      return reply.code(409).header('X-WOPI-Lock', current).send('');
    }
    const target = docPath(who.orgId, who.id);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    await app.deps.workspace.hydrate(who.orgId);
    const doc = app.deps.workspace.findDoc(who.orgId, who.id);
    if (doc) {
      doc.sizeBytes = bytes.byteLength;
      doc.version += 1;
      doc.updatedAt = app.deps.now().toISOString();
    }
    const version = String(doc?.version ?? 1);
    return reply
      .code(200)
      .header('X-WOPI-ItemVersion', version)
      .send({ version: doc?.version ?? 1 });
  });
}
