import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  COMM_TYPES,
  createClass,
  deleteClassApi,
  deleteCommunication,
  enrollStudent,
  fetchClassDetails,
  fetchTeacherClasses,
  isSyncConfigured,
  loginTeacher,
  pushClassCommunication,
  registerTeacher,
  removeStudent,
  updateClass,
} from '../lib/classSync';

const SESSION_KEY = 'jokko-teacher-session';

const TeacherContext = createContext(null);

export const TeacherProvider = ({ children }) => {
  const [teacher, setTeacher] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState('');
  const [classData, setClassData] = useState({ students: [], communications: [], name: '' });
  const [loadingClass, setLoadingClass] = useState(false);
  const [sending, setSending] = useState(false);

  const persistTeacher = useCallback((t) => {
    setTeacher(t);
    if (t) sessionStorage.setItem(SESSION_KEY, JSON.stringify(t));
    else sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const loadClasses = useCallback(async () => {
    if (!teacher?.id || !isSyncConfigured()) {
      setClasses([]);
      return;
    }
    const list = await fetchTeacherClasses(teacher.id);
    setClasses(list);
    setActiveClassId((prev) => {
      if (prev && list.some((c) => c.id === prev)) return prev;
      return list[0]?.id || '';
    });
  }, [teacher?.id]);

  useEffect(() => {
    if (teacher) loadClasses();
    else setClasses([]);
  }, [teacher, loadClasses]);

  const register = useCallback(
    async (login, password, displayName) => {
      const t = await registerTeacher(login, password, displayName);
      persistTeacher(t);
      return t;
    },
    [persistTeacher],
  );

  const login = useCallback(
    async (loginName, password) => {
      const t = await loginTeacher(loginName, password);
      persistTeacher(t);
      return t;
    },
    [persistTeacher],
  );

  const logout = useCallback(() => {
    persistTeacher(null);
    setClasses([]);
    setActiveClassId('');
    setClassData({ students: [], communications: [], name: '' });
  }, [persistTeacher]);

  const refreshClass = useCallback(async () => {
    if (!activeClassId || !isSyncConfigured()) {
      setClassData({ students: [], communications: [], name: '' });
      return;
    }
    setLoadingClass(true);
    try {
      const data = await fetchClassDetails(activeClassId);
      setClassData({
        students: data.students || [],
        communications: data.communications || [],
        name: data.name || activeClassId,
      });
    } catch {
      setClassData({ students: [], communications: [], name: '' });
    } finally {
      setLoadingClass(false);
    }
  }, [activeClassId]);

  useEffect(() => {
    if (teacher && activeClassId) refreshClass();
  }, [teacher, activeClassId, refreshClass]);

  const addClass = useCallback(
    async ({ classId, name }) => {
      if (!teacher) throw new Error('Non connecté');
      const created = await createClass(teacher.id, { classId, name });
      await loadClasses();
      setActiveClassId(created.id);
      return created;
    },
    [teacher, loadClasses],
  );

  const editClass = useCallback(
    async (classId, name) => {
      if (!teacher) throw new Error('Non connecté');
      await updateClass(classId, { name, teacherId: teacher.id });
      await loadClasses();
      if (classId === activeClassId) await refreshClass();
    },
    [teacher, activeClassId, loadClasses, refreshClass],
  );

  const removeClass = useCallback(
    async (classId) => {
      if (!teacher) throw new Error('Non connecté');
      await deleteClassApi(classId, teacher.id);
      await loadClasses();
    },
    [teacher, loadClasses],
  );

  const enroll = useCallback(
    async (deviceId, displayName) => {
      await enrollStudent(activeClassId, deviceId, displayName);
      await refreshClass();
    },
    [activeClassId, refreshClass],
  );

  const unenroll = useCallback(
    async (deviceId) => {
      await removeStudent(activeClassId, deviceId);
      await refreshClass();
    },
    [activeClassId, refreshClass],
  );

  const sendToClass = useCallback(
    async ({ title, body, type, attachment, deadlineAt, targetDeviceIds }) => {
      if (!teacher || !activeClassId) throw new Error('Non connecté');
      if (!isSyncConfigured()) throw new Error('Serveur sync non configuré');
      setSending(true);
      try {
        const payload = {
          type: type || COMM_TYPES.MESSAGE,
          title: title?.trim() || 'Sans titre',
          body: body?.trim() || '',
          teacherId: teacher.id,
          teacherName: teacher.displayName,
          attachment: attachment || null,
          deadlineAt: deadlineAt || null,
          targetDeviceIds: targetDeviceIds?.length ? targetDeviceIds : null,
        };
        const comm = await pushClassCommunication(activeClassId, payload);
        await refreshClass();
        return comm;
      } finally {
        setSending(false);
      }
    },
    [teacher, activeClassId, refreshClass],
  );

  const removeCommunication = useCallback(
    async (commId) => {
      await deleteCommunication(activeClassId, commId);
      await refreshClass();
    },
    [activeClassId, refreshClass],
  );

  const value = useMemo(
    () => ({
      teacher,
      classes,
      activeClassId,
      setActiveClassId,
      classData,
      loadingClass,
      register,
      login,
      logout,
      sendToClass,
      sending,
      refreshClass,
      enrollStudent: enroll,
      removeStudent: unenroll,
      addClass,
      editClass,
      removeClass,
      removeCommunication,
      loadClasses,
      syncConfigured: isSyncConfigured(),
    }),
    [
      teacher,
      classes,
      activeClassId,
      classData,
      loadingClass,
      register,
      login,
      logout,
      sendToClass,
      sending,
      refreshClass,
      enroll,
      unenroll,
      addClass,
      editClass,
      removeClass,
      removeCommunication,
      loadClasses,
    ],
  );

  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>;
};

export const useTeacher = () => {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error('useTeacher requires TeacherProvider');
  return ctx;
};
