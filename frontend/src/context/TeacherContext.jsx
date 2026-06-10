import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DEMO_CLASSES, DEMO_TEACHERS } from '../mock/teachers';
import {
  COMM_TYPES,
  enrollStudent,
  fetchClassDetails,
  isSyncConfigured,
  pushClassCommunication,
  removeStudent,
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
  const [activeClassId, setActiveClassId] = useState(DEMO_CLASSES[0]?.id || 'MATH-6A');
  const [classData, setClassData] = useState({ students: [], communications: [] });
  const [loadingClass, setLoadingClass] = useState(false);
  const [sending, setSending] = useState(false);

  const login = useCallback((loginName, password) => {
    const found = DEMO_TEACHERS.find(
      (t) => t.login === loginName.trim() && t.password === password,
    );
    if (!found) return false;
    setTeacher(found);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(found));
    return true;
  }, []);

  const logout = useCallback(() => {
    setTeacher(null);
    sessionStorage.removeItem(SESSION_KEY);
    setClassData({ students: [], communications: [] });
  }, []);

  const refreshClass = useCallback(async () => {
    if (!activeClassId || !isSyncConfigured()) {
      setClassData({ students: [], communications: [] });
      return;
    }
    setLoadingClass(true);
    try {
      const data = await fetchClassDetails(activeClassId);
      setClassData({
        students: data.students || [],
        communications: data.communications || [],
      });
    } catch {
      setClassData({ students: [], communications: [] });
    } finally {
      setLoadingClass(false);
    }
  }, [activeClassId]);

  useEffect(() => {
    if (teacher) refreshClass();
  }, [teacher, refreshClass]);

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
    async ({ title, body, type, attachment, deadlineAt }) => {
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

  const value = useMemo(
    () => ({
      teacher,
      classes: DEMO_CLASSES,
      activeClassId,
      setActiveClassId,
      classData,
      loadingClass,
      login,
      logout,
      sendToClass,
      sending,
      refreshClass,
      enrollStudent: enroll,
      removeStudent: unenroll,
      syncConfigured: isSyncConfigured(),
    }),
    [
      teacher,
      activeClassId,
      classData,
      loadingClass,
      login,
      logout,
      sendToClass,
      sending,
      refreshClass,
      enroll,
      unenroll,
    ],
  );

  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>;
};

export const useTeacher = () => {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error('useTeacher requires TeacherProvider');
  return ctx;
};
