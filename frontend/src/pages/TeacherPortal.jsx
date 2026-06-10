import React, { useRef, useState } from 'react';
import {
  Image as ImageIcon,
  FileText,
  Send,
  LogOut,
  Users,
  UserPlus,
  Sun,
  Moon,
  RefreshCw,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import Logo from '../components/Logo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useTeacher } from '../context/TeacherContext';
import { useTheme } from '../context/ThemeContext';
import { COMM_TYPES, fileToAttachment, isSyncConfigured } from '../lib/classSync';
import { JOKKO } from '../lib/jokkoTheme';
import { toast } from 'sonner';

const formatWhen = (ts) =>
  new Date(ts).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const TeacherPortal = () => {
  const {
    teacher,
    classes,
    activeClassId,
    setActiveClassId,
    classData,
    loadingClass,
    logout,
    sendToClass,
    sending,
    refreshClass,
    enrollStudent,
    removeStudent,
  } = useTeacher();
  const { theme, toggleTheme } = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [deviceCode, setDeviceCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const fileRef = useRef(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const att = await fileToAttachment(file);
      setAttachment(att);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
      toast.success('Fichier prêt à envoyer', { description: file.name });
    } catch {
      toast.error('Fichier non supporté');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() && !body.trim() && !attachment) {
      toast.error('Ajoutez un titre, un message ou un fichier');
      return;
    }
    try {
      const type = attachment?.type || COMM_TYPES.MESSAGE;
      await sendToClass({
        title,
        body,
        type,
        attachment: attachment
          ? { dataUrl: attachment.dataUrl, fileName: attachment.fileName, mimeType: attachment.mimeType }
          : null,
      });
      toast.success('Envoyé à la classe', { description: activeClassId });
      setTitle('');
      setBody('');
      setAttachment(null);
    } catch (err) {
      toast.error(err.message || 'Envoi impossible');
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!deviceCode.trim()) return;
    setEnrolling(true);
    try {
      await enrollStudent(deviceCode, studentName || 'Élève');
      toast.success('Élève inscrit');
      setDeviceCode('');
      setStudentName('');
    } catch (err) {
      toast.error(err.message || 'Inscription impossible');
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemove = async (deviceId) => {
    try {
      await removeStudent(deviceId);
      toast.success('Élève retiré');
    } catch {
      toast.error('Suppression impossible');
    }
  };

  return (
    <div className={JOKKO.page}>
      <header className={`${JOKKO.header} px-4 py-3 flex items-center gap-3`}>
        <Logo size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{teacher.displayName}</p>
          <p className={`text-xs ${JOKKO.muted}`}>JokkoNote — professeurs</p>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Thème">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Déconnexion">
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      <main className="max-w-2xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {!isSyncConfigured() && (
          <p className="text-sm text-jokko border border-jokko/30 rounded-xl p-4">
            Configurez <code>REACT_APP_JOKKO_SYNC_URL</code> pour que les élèves reçoivent vos envois
            dans SeNote.
          </p>
        )}

        <section className={`${JOKKO.card} p-4 space-y-3`}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-jokko" />
            <h2 className="font-semibold">Classe active</h2>
          </div>
          <div className="grid gap-2">
            {classes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveClassId(c.id)}
                className={`text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                  activeClassId === c.id
                    ? 'border-jokko bg-jokko-50 dark:bg-jokko-950'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-jokko/40'
                }`}
              >
                <p className="font-medium">{c.name}</p>
                <p className={`text-xs ${JOKKO.muted}`}>{c.id}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={`${JOKKO.card} p-4 sm:p-6 space-y-4`}>
          <h2 className="font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-jokko" />
            Inscrire un élève
          </h2>
          <p className={`text-sm ${JOKKO.muted}`}>
            L&apos;élève vous donne le code affiché dans SeNote (Réception).
          </p>
          <form onSubmit={handleEnroll} className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="device-code">Code appareil</Label>
              <Input
                id="device-code"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
                placeholder="A1B2C3D4"
                className={JOKKO.input}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stu-name">Prénom (optionnel)</Label>
              <Input
                id="stu-name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Amadou"
                className={JOKKO.input}
              />
            </div>
            <Button
              type="submit"
              disabled={enrolling || !isSyncConfigured()}
              className={`sm:col-span-2 gap-2 ${JOKKO.btnPrimary}`}
            >
              <UserPlus className="w-4 h-4" />
              {enrolling ? 'Inscription…' : 'Inscrire dans la classe'}
            </Button>
          </form>

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium mb-2">
              Élèves inscrits ({classData.students.length})
            </p>
            {loadingClass && (
              <p className={`text-sm ${JOKKO.muted}`}>Chargement…</p>
            )}
            {!loadingClass && classData.students.length === 0 && (
              <p className={`text-sm ${JOKKO.muted}`}>Aucun élève pour l&apos;instant.</p>
            )}
            <ul className="space-y-2">
              {classData.students.map((s) => (
                <li
                  key={s.deviceId}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.displayName}</p>
                    <p className={`text-xs ${JOKKO.muted}`}>
                      {s.deviceId.replace(/^dev-/, '').slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(s.deviceId)}
                    aria-label="Retirer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <form onSubmit={submit} className={`${JOKKO.card} p-4 sm:p-6 space-y-4`}>
          <h2 className="font-semibold flex items-center gap-2">
            <Send className="w-5 h-5 text-jokko" />
            Envoyer à {activeClassId}
          </h2>
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={JOKKO.input} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className={JOKKO.input}
              placeholder="Consignes, rappel, lien…"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={onFile}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <FileText className="w-4 h-4" />
              PDF
            </Button>
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Image
            </Button>
          </div>
          {attachment && (
            <p className="text-sm text-jokko">
              Pièce jointe : {attachment.fileName}
              <button type="button" className="ml-2 underline" onClick={() => setAttachment(null)}>
                Retirer
              </button>
            </p>
          )}
          <Button type="submit" disabled={sending} className={`w-full gap-2 ${JOKKO.btnPrimary}`}>
            <Send className="w-4 h-4" />
            {sending ? 'Envoi…' : 'Envoyer aux élèves'}
          </Button>
        </form>

        <section className={`${JOKKO.card} p-4 sm:p-6 space-y-4`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-jokko" />
              Messages envoyés
            </h2>
            <Button variant="ghost" size="icon" onClick={refreshClass} disabled={loadingClass}>
              <RefreshCw className={`w-4 h-4 ${loadingClass ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {classData.communications.length === 0 && (
            <p className={`text-sm ${JOKKO.muted}`}>Aucun message envoyé.</p>
          )}
          <ul className="space-y-4">
            {classData.communications.map((comm) => {
              const readBy = comm.readBy || [];
              const total = classData.students.length;
              return (
                <li
                  key={comm.id}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{comm.title || 'Sans titre'}</p>
                      {comm.body && (
                        <p className={`text-sm ${JOKKO.muted} mt-1 line-clamp-2`}>{comm.body}</p>
                      )}
                      <p className={`text-xs ${JOKKO.muted} mt-2`}>{formatWhen(comm.createdAt)}</p>
                    </div>
                    <span className="text-xs shrink-0 px-2 py-1 rounded-full bg-jokko-50 dark:bg-jokko-950 text-jokko">
                      {readBy.length}/{total} lu{readBy.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {readBy.length > 0 ? (
                    <ul className="mt-3 space-y-1 border-t border-neutral-200 dark:border-neutral-800 pt-3">
                      {readBy.map((r) => (
                        <li key={r.deviceId} className={`text-xs ${JOKKO.muted} flex justify-between gap-2`}>
                          <span>{r.displayName || 'Élève'}</span>
                          <span>{formatWhen(r.seenAt)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={`text-xs ${JOKKO.muted} mt-3 border-t border-neutral-200 dark:border-neutral-800 pt-3`}>
                      Personne n&apos;a encore lu ce message.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default TeacherPortal;
