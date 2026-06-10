#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const PORT = Number(process.env.PORT || 8787);

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const classFile = (classId) => path.join(DATA_DIR, `${classId.toUpperCase()}.json`);

const emptyClass = (classId) => ({
  classId: classId.toUpperCase(),
  communications: [],
  students: [],
});

const readClass = (classId) => {
  const file = classFile(classId);
  if (!fs.existsSync(file)) return emptyClass(classId);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { ...emptyClass(classId), ...data, students: data.students || [] };
};

const writeClass = (classId, data) => {
  fs.writeFileSync(classFile(classId), JSON.stringify(data, null, 2));
};

const listClassIds = () =>
  fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));

const readBody = async (req) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
};

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const send = (res, status, body) => {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const bareDeviceId = (id) => (id || '').replace(/^dev-/i, '').toUpperCase();

const deviceIdsMatch = (a, b) => {
  const A = bareDeviceId(a);
  const B = bareDeviceId(b);
  if (!A || !B) return false;
  if (A === B) return true;
  if (A.startsWith(B) || B.startsWith(A)) return true;
  if (A.slice(0, 8) === B.slice(0, 8)) return true;
  return false;
};

const normalizeDeviceId = (input) => {
  const raw = (input || '').trim();
  if (!raw) return '';
  if (raw.startsWith('dev-')) return raw;
  return `dev-${raw.toUpperCase()}`;
};

const liteComm = (comm, classId) => ({
  ...comm,
  classId,
  attachment: comm.attachment
    ? {
        fileName: comm.attachment.fileName,
        mimeType: comm.attachment.mimeType,
        hasData: Boolean(comm.attachment.dataUrl),
      }
    : null,
});

const findClassesForDevice = (deviceId) => {
  const matches = [];
  for (const id of listClassIds()) {
    const store = readClass(id);
    if (store.students?.some((s) => deviceIdsMatch(deviceId, s.deviceId))) {
      matches.push(store.classId);
    }
  }
  return matches;
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && url.pathname === '/health') {
    send(res, 200, { ok: true });
    return;
  }

  // Inbox élève par appareil (pas de code classe) — ?lite=1 sans pièces jointes lourdes
  if (parts[0] === 'students' && parts[2] === 'inbox' && req.method === 'GET') {
    const deviceId = decodeURIComponent(parts[1]);
    const lite = url.searchParams.get('lite') === '1';
    const classIds = findClassesForDevice(deviceId);
    const communications = [];
    for (const classId of classIds) {
      const store = readClass(classId);
      for (const comm of store.communications || []) {
        communications.push(lite ? liteComm(comm, classId) : { ...comm, classId });
      }
    }
    communications.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    send(res, 200, { enrolled: classIds.length > 0, classIds, communications });
    return;
  }

  // Classe complète (prof : élèves + accusés de lecture)
  if (parts[0] === 'classes' && parts.length === 2 && req.method === 'GET') {
    const classId = decodeURIComponent(parts[1]);
    send(res, 200, readClass(classId));
    return;
  }

  // Inscrire un élève (prof)
  if (parts[0] === 'classes' && parts[2] === 'students' && parts.length === 3 && req.method === 'POST') {
    const classId = decodeURIComponent(parts[1]);
    const { deviceId, displayName } = await readBody(req);
    const normalizedId = normalizeDeviceId(deviceId);
    if (!normalizedId) {
      send(res, 400, { error: 'deviceId requis' });
      return;
    }
    const store = readClass(classId);
    const existing = store.students.find((s) => deviceIdsMatch(normalizedId, s.deviceId));
    if (existing) {
      existing.displayName = displayName?.trim() || existing.displayName;
      existing.updatedAt = Date.now();
    } else {
      store.students.push({
        deviceId: normalizedId,
        displayName: displayName?.trim() || 'Élève',
        enrolledAt: Date.now(),
      });
    }
    writeClass(classId, store);
    send(res, 201, { ok: true });
    return;
  }

  if (parts[0] === 'classes' && parts[2] === 'students' && parts.length === 4 && req.method === 'DELETE') {
    const classId = decodeURIComponent(parts[1]);
    const deviceId = decodeURIComponent(parts[3]);
    const store = readClass(classId);
    store.students = store.students.filter((s) => !deviceIdsMatch(deviceId, s.deviceId));
    writeClass(classId, store);
    send(res, 200, { ok: true });
    return;
  }

  if (
    parts[0] === 'classes' &&
    parts[2] === 'communications' &&
    parts.length === 4 &&
    req.method === 'GET'
  ) {
    const classId = decodeURIComponent(parts[1]);
    const commId = decodeURIComponent(parts[3]);
    const store = readClass(classId);
    const comm = store.communications.find((c) => c.id === commId);
    if (!comm) {
      send(res, 404, { error: 'Message introuvable' });
      return;
    }
    send(res, 200, { ...comm, classId });
    return;
  }

  if (parts[0] === 'classes' && parts[2] === 'communications' && parts.length === 3) {
    const classId = decodeURIComponent(parts[1]);
    if (req.method === 'GET') {
      const store = readClass(classId);
      send(res, 200, { communications: store.communications });
      return;
    }
    if (req.method === 'POST') {
      const payload = await readBody(req);
      const store = readClass(classId);
      const comm = {
        id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        readBy: [],
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
    const { deviceId, displayName } = await readBody(req);
    const store = readClass(classId);
    const comm = store.communications.find((c) => c.id === commId);
    if (comm && deviceId) {
      comm.readBy = comm.readBy || [];
      const idx = comm.readBy.findIndex((r) => deviceIdsMatch(r.deviceId, deviceId));
      const entry = {
        deviceId,
        displayName: displayName || 'Élève',
        seenAt: Date.now(),
      };
      if (idx >= 0) comm.readBy[idx] = entry;
      else comm.readBy.push(entry);
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
