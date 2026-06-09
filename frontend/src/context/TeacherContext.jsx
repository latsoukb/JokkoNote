import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEMO_CLASSES, DEMO_TEACHERS } from '../mock/teachers';
import { COMM_TYPES, isSyncConfigured, pushClassCommunication } from '../lib/classSync';

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
  }, []);

  const sendToClass = useCallback(
    async ({ title, body, type, attachment }) => {
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
        };
        return await pushClassCommunication(activeClassId, payload);
      } finally {
        setSending(false);
      }
    },
    [teacher, activeClassId],
  );

  const value = useMemo(
    () => ({
      teacher,
      classes: DEMO_CLASSES,
      activeClassId,
      setActiveClassId,
      login,
      logout,
      sendToClass,
      sending,
      syncConfigured: isSyncConfigured(),
    }),
    [teacher, activeClassId, login, logout, sendToClass, sending],
  );

  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>;
};

export const useTeacher = () => {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error('useTeacher requires TeacherProvider');
  return ctx;
};
