/**
 * Sync prof → élève entre JokkoNote (prof) et SeNote (élève).
 */

export const COMM_TYPES = {
  MESSAGE: 'message',
  PDF: 'pdf',
  IMAGE: 'image',
};

const syncBase = () => (process.env.REACT_APP_JOKKO_SYNC_URL || '').replace(/\/$/, '');

const readFile = async (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const fileToAttachment = async (file) => {
  const dataUrl = await readFile(file);
  const type = file.type === 'application/pdf'
    ? COMM_TYPES.PDF
    : file.type.startsWith('image/')
      ? COMM_TYPES.IMAGE
      : COMM_TYPES.MESSAGE;
  return { type, dataUrl, fileName: file.name, mimeType: file.type };
};

export const filesToAttachments = async (fileList) => {
  const files = Array.from(fileList || []);
  return Promise.all(files.map(fileToAttachment));
};

export const resolveCommType = (attachments, body) => {
  if (!attachments?.length) return COMM_TYPES.MESSAGE;
  if (attachments.length === 1) return attachments[0].type;
  const types = new Set(attachments.map((a) => a.type));
  if (types.size === 1 && types.has(COMM_TYPES.PDF)) return COMM_TYPES.PDF;
  if (types.size === 1 && types.has(COMM_TYPES.IMAGE)) return COMM_TYPES.IMAGE;
  return COMM_TYPES.MESSAGE;
};

const stripAttachmentForSend = (att) => ({
  type: att.type,
  dataUrl: att.dataUrl,
  fileName: att.fileName,
  mimeType: att.mimeType,
});

export const buildCommPayload = ({
  title,
  body,
  attachments,
  teacherId,
  teacherName,
  deadlineAt,
  targetDeviceIds,
}) => {
  const list = (attachments || []).map(stripAttachmentForSend);
  return {
    type: resolveCommType(list, body),
    title: title?.trim() || 'Sans titre',
    body: body?.trim() || '',
    teacherId,
    teacherName,
    attachments: list.length ? list : null,
    attachment: list[0] || null,
    deadlineAt: deadlineAt || null,
    targetDeviceIds: targetDeviceIds?.length ? targetDeviceIds : null,
  };
};

export const normalizeDeviceId = (input) => {
  const raw = (input || '').trim();
  if (!raw) return '';
  if (raw.startsWith('dev-')) return raw;
  return `dev-${raw.toUpperCase()}`;
};

export const registerTeacher = async (login, password, displayName) => {
  const base = syncBase();
  if (!base) throw new Error('Sync non configuré');
  const res = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password, displayName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Inscription impossible');
  return data.teacher;
};

export const loginTeacher = async (login, password) => {
  const base = syncBase();
  if (!base) throw new Error('Sync non configuré');
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Connexion impossible');
  return data.teacher;
};

export const fetchTeacherClasses = async (teacherId) => {
  const base = syncBase();
  if (!base) return [];
  const res = await fetch(`${base}/teachers/${encodeURIComponent(teacherId)}/classes`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.classes || [];
};

export const createClass = async (teacherId, { classId, name }) => {
  const base = syncBase();
  if (!base) throw new Error('Sync non configuré');
  const res = await fetch(`${base}/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classId, name, teacherId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Création impossible');
  return data.class;
};

export const updateClass = async (classId, { name, teacherId }) => {
  const base = syncBase();
  if (!base) throw new Error('Sync non configuré');
  const res = await fetch(`${base}/classes/${encodeURIComponent(classId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, teacherId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Modification impossible');
  return data.class;
};

export const deleteClassApi = async (classId, teacherId) => {
  const base = syncBase();
  if (!base) throw new Error('Sync non configuré');
  const res = await fetch(`${base}/classes/${encodeURIComponent(classId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Suppression impossible');
  return data;
};

export const fetchClassDetails = async (classId) => {
  const base = syncBase();
  if (!base) throw new Error('Sync non configuré');
  const res = await fetch(`${base}/classes/${encodeURIComponent(classId)}`);
  if (!res.ok) throw new Error('Classe introuvable');
  return res.json();
};

export const enrollStudent = async (classId, deviceId, displayName) => {
  const base = syncBase();
  if (!base) throw new Error('Sync non configuré');
  const res = await fetch(`${base}/classes/${encodeURIComponent(classId)}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: normalizeDeviceId(deviceId), displayName }),
  });
  if (!res.ok) throw new Error('Inscription impossible');
  return res.json();
};

export const removeStudent = async (classId, deviceId) => {
  const base = syncBase();
  if (!base) return;
  await fetch(
    `${base}/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(normalizeDeviceId(deviceId))}`,
    { method: 'DELETE' },
  );
};

export const pushClassCommunication = async (classId, payload) => {
  const base = syncBase();
  if (!base) throw new Error('REACT_APP_JOKKO_SYNC_URL non configuré');
  const res = await fetch(`${base}/classes/${encodeURIComponent(classId)}/communications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Envoi impossible');
  return res.json();
};

export const deleteCommunication = async (classId, commId) => {
  const base = syncBase();
  if (!base) throw new Error('Sync non configuré');
  const res = await fetch(
    `${base}/classes/${encodeURIComponent(classId)}/communications/${encodeURIComponent(commId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Suppression impossible');
  return res.json();
};

export const isSyncConfigured = () => Boolean(syncBase());
