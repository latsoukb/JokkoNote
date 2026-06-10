import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const TEACHERS_FILE = path.join(DATA_DIR, 'teachers.json');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

const sbHeaders = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
});

const hashPassword = (password, salt) =>
  crypto.scryptSync(password, salt, 64).toString('hex');

export const createTeacherRecord = (login, password, displayName) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    id: `t-${crypto.randomUUID().slice(0, 8)}`,
    login: login.trim().toLowerCase(),
    displayName: displayName.trim() || login.trim(),
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: Date.now(),
  };
};

export const verifyTeacherPassword = (teacher, password) =>
  teacher.passwordHash === hashPassword(password, teacher.salt);

export const publicTeacher = (t) => ({
  id: t.id,
  login: t.login,
  displayName: t.displayName,
});

const normalizeTeacher = (row) => ({
  id: row.id,
  login: row.login,
  displayName: row.display_name || row.displayName,
  passwordHash: row.password_hash || row.passwordHash,
  salt: row.salt,
  createdAt: row.created_at || row.createdAt,
});

const readTeachersFile = () => {
  if (!fs.existsSync(TEACHERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TEACHERS_FILE, 'utf8'));
  } catch {
    return [];
  }
};

const writeTeachersFile = (list) => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TEACHERS_FILE, JSON.stringify(list, null, 2));
};

const readTeachersSupabase = async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jokko_teachers?select=*`, {
    headers: sbHeaders(),
  });
  if (res.status === 404) {
    console.warn('Table jokko_teachers absente — exécutez server/supabase-schema.sql');
    return [];
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase teachers read (${res.status}) ${detail}`.trim());
  }
  return (await res.json()).map(normalizeTeacher);
};

const writeTeacherSupabase = async (teacher) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jokko_teachers`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      id: teacher.id,
      login: teacher.login,
      display_name: teacher.displayName,
      password_hash: teacher.passwordHash,
      salt: teacher.salt,
      created_at: new Date(teacher.createdAt).toISOString(),
    }),
  });
  if (res.status === 404) {
    throw new Error('Table jokko_teachers absente — exécutez server/supabase-schema.sql dans Supabase');
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase teacher write (${res.status}) ${detail}`.trim());
  }
};

export const listTeachers = () =>
  useSupabase ? readTeachersSupabase() : Promise.resolve(readTeachersFile());

export const findTeacherByLogin = async (login) => {
  const key = login.trim().toLowerCase();
  const list = await listTeachers();
  return list.find((t) => t.login === key) || null;
};

export const saveTeacher = async (teacher) => {
  if (useSupabase) {
    await writeTeacherSupabase(teacher);
    return teacher;
  }
  const list = readTeachersFile();
  if (list.some((t) => t.login === teacher.login)) {
    throw new Error('Identifiant déjà utilisé');
  }
  list.push(teacher);
  writeTeachersFile(list);
  return teacher;
};

export const seedDemoTeacherIfEmpty = async () => {
  const list = await listTeachers();
  if (list.length) return;
  const demo = createTeacherRecord('diop', 'jokko2026', 'M. Diop');
  demo.id = 't-diop';
  await saveTeacher(demo);
};
