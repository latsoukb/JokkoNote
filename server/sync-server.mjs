#!/usr/bin/env node
import http from 'node:http';
import {
  deleteClass,
  emptyClass,
  listClassIds,
  readClass,
  storageMode,
  writeClass,
} from './store.mjs';
import {
  createTeacherRecord,
  findTeacherByLogin,
  publicTeacher,
  saveTeacher,
  seedDemoTeacherIfEmpty,
  teachersStorageMode,
  verifyTeacherPassword,
} from './teachers.mjs';

const SERVER_VERSION = 2;

try {
  await seedDemoTeacherIfEmpty();
} catch (err) {
  console.error('Seed prof démo ignoré:', err.message);
}

const PORT = Number(process.env.PORT || 8787);

const readBody = async (req) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
};

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
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

const liteAttachment = (att) =>
  att
    ? {
        type: att.type,
        fileName: att.fileName,
        mimeType: att.mimeType,
        hasData: Boolean(att.dataUrl),
      }
    : null;

const normalizeCommAttachments = (comm) => {
  const list = Array.isArray(comm.attachments) && comm.attachments.length
    ? comm.attachments
    : comm.attachment
      ? [comm.attachment]
      : [];
  return list;
};

const liteComm = (comm, classId) => {
  const attachments = normalizeCommAttachments(comm).map(liteAttachment);
  return {
    ...comm,
    classId,
    attachments,
    attachment: attachments[0] || null,
  };
};

const commVisibleToDevice = (comm, deviceId) => {
  const targets = comm.targetDeviceIds;
  if (!targets?.length) return true;
  return targets.some((t) => deviceIdsMatch(deviceId, t));
};

const findClassesForDevice = async (deviceId) => {
  const matches = [];
  const ids = await listClassIds();
  for (const id of ids) {
    const store = await readClass(id);
    if (store.students?.some((s) => deviceIdsMatch(deviceId, s.deviceId))) {
      matches.push(store.classId);
    }
  }
  return matches;
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      cors(res);
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const parts = url.pathname.split('/').filter(Boolean);

    if (req.method === 'GET' && url.pathname === '/health') {
      send(res, 200, {
        ok: true,
        storage: storageMode,
        teachers: teachersStorageMode(),
        auth: true,
        version: SERVER_VERSION,
      });
      return;
    }

    if (parts[0] === 'students' && parts[2] === 'inbox' && req.method === 'GET') {
      const deviceId = decodeURIComponent(parts[1]);
      const lite = url.searchParams.get('lite') === '1';
      const classIds = await findClassesForDevice(deviceId);
      const communications = [];
      for (const classId of classIds) {
        const store = await readClass(classId);
        for (const comm of store.communications || []) {
          if (!commVisibleToDevice(comm, deviceId)) continue;
          communications.push(lite ? liteComm(comm, classId) : { ...comm, classId });
        }
      }
      communications.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      send(res, 200, { enrolled: classIds.length > 0, classIds, communications });
      return;
    }

    if (parts[0] === 'auth' && parts[1] === 'register' && req.method === 'POST') {
      const { login, password, displayName } = await readBody(req);
      if (!login?.trim() || !password || password.length < 6) {
        send(res, 400, { error: 'Identifiant et mot de passe (6 car. min.) requis' });
        return;
      }
      if (await findTeacherByLogin(login)) {
        send(res, 409, { error: 'Identifiant déjà utilisé' });
        return;
      }
      const teacher = createTeacherRecord(login, password, displayName);
      await saveTeacher(teacher);
      send(res, 201, { teacher: publicTeacher(teacher) });
      return;
    }

    if (parts[0] === 'auth' && parts[1] === 'login' && req.method === 'POST') {
      const { login, password } = await readBody(req);
      const teacher = await findTeacherByLogin(login);
      if (!teacher || !verifyTeacherPassword(teacher, password)) {
        send(res, 401, { error: 'Identifiant ou mot de passe incorrect' });
        return;
      }
      send(res, 200, { teacher: publicTeacher(teacher) });
      return;
    }

    if (parts[0] === 'teachers' && parts[2] === 'classes' && req.method === 'GET') {
      const teacherId = decodeURIComponent(parts[1]);
      const ids = await listClassIds();
      const classes = [];
      for (const id of ids) {
        const store = await readClass(id);
        if (store.teacherId === teacherId) {
          classes.push({
            id: store.classId,
            name: store.name || store.classId,
            studentCount: store.students?.length || 0,
          });
        }
      }
      classes.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      send(res, 200, { classes });
      return;
    }

    if (parts[0] === 'classes' && parts.length === 1 && req.method === 'POST') {
      const { classId, name, teacherId } = await readBody(req);
      const rawId = (classId || `CLS-${Date.now().toString(36).toUpperCase()}`)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '');
      if (!rawId || !teacherId) {
        send(res, 400, { error: 'classId et teacherId requis' });
        return;
      }
      const ids = await listClassIds();
      if (ids.includes(rawId)) {
        send(res, 409, { error: 'Cette classe existe déjà' });
        return;
      }
      const store = {
        ...emptyClass(rawId),
        name: (name || rawId).trim(),
        teacherId,
      };
      await writeClass(rawId, store);
      send(res, 201, { class: { id: store.classId, name: store.name } });
      return;
    }

    if (parts[0] === 'classes' && parts.length === 2 && req.method === 'GET') {
      const classId = decodeURIComponent(parts[1]);
      send(res, 200, await readClass(classId));
      return;
    }

    if (parts[0] === 'classes' && parts.length === 2 && req.method === 'PATCH') {
      const classId = decodeURIComponent(parts[1]);
      const { name, teacherId } = await readBody(req);
      const store = await readClass(classId);
      if (teacherId && store.teacherId && store.teacherId !== teacherId) {
        send(res, 403, { error: 'Non autorisé' });
        return;
      }
      if (name?.trim()) store.name = name.trim();
      await writeClass(classId, store);
      send(res, 200, { class: { id: store.classId, name: store.name } });
      return;
    }

    if (parts[0] === 'classes' && parts.length === 2 && req.method === 'DELETE') {
      const classId = decodeURIComponent(parts[1]);
      const { teacherId } = await readBody(req);
      const store = await readClass(classId);
      if (teacherId && store.teacherId && store.teacherId !== teacherId) {
        send(res, 403, { error: 'Non autorisé' });
        return;
      }
      await deleteClass(classId);
      send(res, 200, { ok: true });
      return;
    }

    if (parts[0] === 'classes' && parts[2] === 'students' && parts.length === 3 && req.method === 'POST') {
      const classId = decodeURIComponent(parts[1]);
      const { deviceId, displayName } = await readBody(req);
      const normalizedId = normalizeDeviceId(deviceId);
      if (!normalizedId) {
        send(res, 400, { error: 'deviceId requis' });
        return;
      }
      const store = await readClass(classId);
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
      await writeClass(classId, store);
      send(res, 201, { ok: true });
      return;
    }

    if (parts[0] === 'classes' && parts[2] === 'students' && parts.length === 4 && req.method === 'DELETE') {
      const classId = decodeURIComponent(parts[1]);
      const deviceId = decodeURIComponent(parts[3]);
      const store = await readClass(classId);
      store.students = store.students.filter((s) => !deviceIdsMatch(deviceId, s.deviceId));
      await writeClass(classId, store);
      send(res, 200, { ok: true });
      return;
    }

    if (
      parts[0] === 'classes' &&
      parts[2] === 'communications' &&
      parts.length === 4 &&
      req.method === 'DELETE'
    ) {
      const classId = decodeURIComponent(parts[1]);
      const commId = decodeURIComponent(parts[3]);
      const store = await readClass(classId);
      const before = store.communications.length;
      store.communications = store.communications.filter((c) => c.id !== commId);
      if (store.communications.length === before) {
        send(res, 404, { error: 'Message introuvable' });
        return;
      }
      await writeClass(classId, store);
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
      const store = await readClass(classId);
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
        const store = await readClass(classId);
        send(res, 200, { communications: store.communications });
        return;
      }
      if (req.method === 'POST') {
        const payload = await readBody(req);
        const store = await readClass(classId);
        const targets = Array.isArray(payload.targetDeviceIds)
          ? payload.targetDeviceIds.map(normalizeDeviceId).filter(Boolean)
          : null;
        const attachments = Array.isArray(payload.attachments) && payload.attachments.length
          ? payload.attachments
          : payload.attachment
            ? [payload.attachment]
            : [];
        const comm = {
          id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
          readBy: [],
          ...payload,
          attachments,
          attachment: attachments[0] || null,
          targetDeviceIds: targets?.length ? targets : null,
        };
        store.communications.unshift(comm);
        await writeClass(classId, store);
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
      const store = await readClass(classId);
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
        await writeClass(classId, store);
      }
      send(res, 200, { ok: true });
      return;
    }

    send(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: err.message || 'Erreur serveur' });
  }
});

server.listen(PORT, () => {
  console.log(`Jokko sync → http://localhost:${PORT} (stockage: ${storageMode})`);
});
