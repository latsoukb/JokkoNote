#!/usr/bin/env node
/**
 * Serveur sync prof → élève (JokkoNote + SeNote).
 * Usage : node server/sync-server.mjs
 * URL   : http://localhost:8787
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const PORT = Number(process.env.PORT || 8787);

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const classFile = (classId) => path.join(DATA_DIR, `${classId.toUpperCase()}.json`);

const readClass = (classId) => {
  const file = classFile(classId);
  if (!fs.existsSync(file)) return { classId: classId.toUpperCase(), communications: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const writeClass = (classId, data) => {
  fs.writeFileSync(classFile(classId), JSON.stringify(data, null, 2));
};

const send = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && url.pathname === '/health') {
    send(res, 200, { ok: true });
    return;
  }

  if (parts[0] === 'classes' && parts[2] === 'communications' && parts.length === 3) {
    const classId = decodeURIComponent(parts[1]);
    if (req.method === 'GET') {
      send(res, 200, readClass(classId));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const payload = JSON.parse(body || '{}');
      const store = readClass(classId);
      const comm = {
        id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        seenBy: [],
        ...payload,
      };
      store.communications.unshift(comm);
      writeClass(classId, store);
      send(res, 201, comm);
      return;
    }
  }

  if (
    parts[0] === 'classes' &&
    parts[2] === 'communications' &&
    parts[4] === 'seen' &&
    req.method === 'POST'
  ) {
    const classId = decodeURIComponent(parts[1]);
    const commId = decodeURIComponent(parts[3]);
    let body = '';
    for await (const chunk of req) body += chunk;
    const { studentId } = JSON.parse(body || '{}');
    const store = readClass(classId);
    const comm = store.communications.find((c) => c.id === commId);
    if (comm && studentId && !comm.seenBy?.includes(studentId)) {
      comm.seenBy = [...(comm.seenBy || []), studentId];
      writeClass(classId, store);
    }
    send(res, 200, { ok: true });
    return;
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Jokko sync → http://localhost:${PORT}`);
});
