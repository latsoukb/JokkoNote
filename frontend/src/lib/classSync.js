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

export const normalizeDeviceId = (input) => {
  const raw = (input || '').trim();
  if (!raw) return '';
  if (raw.startsWith('dev-')) return raw;
  return `dev-${raw.toUpperCase()}`;
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

export const isSyncConfigured = () => Boolean(syncBase());
