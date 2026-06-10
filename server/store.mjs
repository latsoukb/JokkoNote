import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const storageMode = SUPABASE_URL && SUPABASE_KEY ? 'supabase' : 'file';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const classFile = (classId) => path.join(DATA_DIR, `${classId.toUpperCase()}.json`);

export const emptyClass = (classId) => ({
  classId: classId.toUpperCase(),
  name: classId.toUpperCase(),
  teacherId: null,
  communications: [],
  students: [],
});

const sbHeaders = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
});

const readClassFile = (classId) => {
  const file = classFile(classId);
  if (!fs.existsSync(file)) return emptyClass(classId);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { ...emptyClass(classId), ...data, students: data.students || [] };
};

const writeClassFile = (classId, data) => {
  fs.writeFileSync(classFile(classId), JSON.stringify(data, null, 2));
};

const listClassIdsFile = () =>
  fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));

const readClassSupabase = async (classId) => {
  const id = classId.toUpperCase();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/jokko_classes?class_id=eq.${encodeURIComponent(id)}&select=data`,
    { headers: sbHeaders() },
  );
  if (!res.ok) throw new Error(`Supabase read failed (${res.status})`);
  const rows = await res.json();
  if (!rows.length) return emptyClass(id);
  const data = rows[0].data || {};
  return { ...emptyClass(id), ...data, students: data.students || [] };
};

const writeClassSupabase = async (classId, data) => {
  const id = classId.toUpperCase();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jokko_classes`, {
    method: 'POST',
    headers: {
      ...sbHeaders(),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      class_id: id,
      data,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`Supabase write failed (${res.status})`);
};

const listClassIdsSupabase = async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jokko_classes?select=class_id`, {
    headers: sbHeaders(),
  });
  if (!res.ok) throw new Error(`Supabase list failed (${res.status})`);
  const rows = await res.json();
  return rows.map((r) => r.class_id);
};

export const readClass = (classId) =>
  storageMode === 'supabase' ? readClassSupabase(classId) : readClassFile(classId);

export const writeClass = (classId, data) =>
  storageMode === 'supabase' ? writeClassSupabase(classId, data) : writeClassFile(classId, data);

export const listClassIds = () =>
  storageMode === 'supabase' ? listClassIdsSupabase() : Promise.resolve(listClassIdsFile());

const deleteClassFile = (classId) => {
  const file = classFile(classId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
};

const deleteClassSupabase = async (classId) => {
  const id = classId.toUpperCase();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/jokko_classes?class_id=eq.${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: sbHeaders() },
  );
  if (!res.ok) throw new Error(`Supabase delete failed (${res.status})`);
};

export const deleteClass = (classId) =>
  storageMode === 'supabase' ? deleteClassSupabase(classId) : deleteClassFile(classId);
