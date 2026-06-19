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
  Clock,
  CalendarClock,
  Plus,
  Pencil,
  GraduationCap,
} from 'lucide-react';
import Logo from '../components/Logo';
import JokkoDialog from '../components/JokkoDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogClose,
  DialogTrigger,
} from '../components/ui/dialog';
import { useTeacher } from '../context/TeacherContext';
import { useTheme } from '../context/ThemeContext';
import { COMM_TYPES, filesToAttachments, isSyncConfigured } from '../lib/classSync';
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
    addClass,
    editClass,
    removeClass,
    removeCommunication,
  } = useTeacher();
  const { theme, toggleTheme } = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [deviceCode, setDeviceCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [recipientMode, setRecipientMode] = useState('all');
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [editClassName, setEditClassName] = useState('');
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const fileRef = useRef(null);

  const activeClass = classes.find((c) => c.id === activeClassId);

  const formatDeadline = (ts) =>
    ts
      ? new Date(ts).toLocaleString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

  const onFiles = async (e) => {
    const { files } = e.target;
    e.target.value = '';
    if (!files?.length) return;
    try {
      const added = await filesToAttachments(files);
      setAttachments((prev) => [...prev, ...added]);
      if (!title && added.length === 1) {
        setTitle(added[0].fileName.replace(/\.[^.]+$/, ''));
      }
      toast.success(
        added.length === 1 ? 'Fichier ajouté' : `${added.length} fichiers ajoutés`,
      );
    } catch {
      toast.error('Fichier non supporté');
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() && !body.trim() && !attachments.length) {
      toast.error('Ajoutez un titre, un message ou un fichier');
      return;
    }
    try {
      const deadlineAt =
        hasDeadline && deadline ? new Date(deadline).getTime() : null;
      if (hasDeadline && deadline && Number.isNaN(deadlineAt)) {
        toast.error('Date d\'échéance invalide');
        return;
      }
      const targetDeviceIds =
        recipientMode === 'one' && targetDeviceId ? [targetDeviceId] : null;
      await sendToClass({
        title,
        body,
        attachments,
        deadlineAt,
        targetDeviceIds,
      });
      const dest =
        recipientMode === 'one'
          ? classData.students.find((s) => s.deviceId === targetDeviceId)?.displayName || 'élève'
          : 'toute la classe';
      toast.success('Message envoyé', { description: dest });
      setTitle('');
      setBody('');
      setAttachments([]);
      setHasDeadline(false);
      setDeadline('');
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-jokko" />
              <h2 className="font-semibold">Mes classes</h2>
            </div>
            <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Nouvelle
                </Button>
              </DialogTrigger>
              <JokkoDialog
                icon={GraduationCap}
                title="Créer une classe"
                description="Les élèves rejoignent avec le code classe dans SeNote."
                footer={
                  <>
                    <DialogClose asChild>
                      <Button type="button" variant="ghost" className={JOKKO.btnGhost}>
                        Annuler
                      </Button>
                    </DialogClose>
                    <Button
                      type="button"
                      className={JOKKO.btnPrimary}
                      onClick={async () => {
                        try {
                          await addClass({
                            classId: newClassId.trim(),
                            name: newClassName.trim() || newClassId.trim(),
                          });
                          toast.success('Classe créée');
                          setNewClassId('');
                          setNewClassName('');
                          setClassDialogOpen(false);
                        } catch (err) {
                          toast.error(err.message || 'Erreur');
                        }
                      }}
                    >
                      Créer la classe
                    </Button>
                  </>
                }
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-class-id" className="text-sm font-medium">
                      Code classe
                    </Label>
                    <Input
                      id="new-class-id"
                      value={newClassId}
                      onChange={(e) => setNewClassId(e.target.value.toUpperCase())}
                      placeholder="MATH-6A"
                      className={JOKKO.input}
                      autoFocus
                    />
                    <p className={JOKKO.fieldHint}>
                      Court et unique — les élèves le saisissent pour s&apos;inscrire.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-class-name" className="text-sm font-medium">
                      Nom affiché
                    </Label>
                    <Input
                      id="new-class-name"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="Mathématiques 6ème A"
                      className={JOKKO.input}
                    />
                    <p className={JOKKO.fieldHint}>Libellé visible dans votre liste de classes.</p>
                  </div>
                </div>
              </JokkoDialog>
            </Dialog>
          </div>
          {classes.length === 0 && (
            <p className={`text-sm ${JOKKO.muted}`}>
              Aucune classe — créez-en une pour commencer.
            </p>
          )}
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
                <p className={`text-xs ${JOKKO.muted}`}>
                  {c.id} · {c.studentCount ?? 0} élève{(c.studentCount ?? 0) > 1 ? 's' : ''}
                </p>
              </button>
            ))}
          </div>
          {activeClassId && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <Dialog
                open={editDialogOpen}
                onOpenChange={(open) => {
                  setEditDialogOpen(open);
                  if (open) setEditClassName(activeClass?.name || activeClassId);
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Pencil className="w-3.5 h-3.5" />
                    Renommer
                  </Button>
                </DialogTrigger>
                <JokkoDialog
                  icon={Pencil}
                  title="Renommer la classe"
                  description={`Code : ${activeClassId}`}
                  footer={
                    <>
                      <DialogClose asChild>
                        <Button type="button" variant="ghost" className={JOKKO.btnGhost}>
                          Annuler
                        </Button>
                      </DialogClose>
                      <Button
                        type="button"
                        className={JOKKO.btnPrimary}
                        onClick={async () => {
                          try {
                            await editClass(activeClassId, editClassName);
                            toast.success('Classe mise à jour');
                            setEditDialogOpen(false);
                          } catch (err) {
                            toast.error(err.message || 'Erreur');
                          }
                        }}
                      >
                        Enregistrer
                      </Button>
                    </>
                  }
                >
                  <div className="space-y-2">
                    <Label htmlFor="edit-class-name" className="text-sm font-medium">
                      Nom affiché
                    </Label>
                    <Input
                      id="edit-class-name"
                      value={editClassName}
                      onChange={(e) => setEditClassName(e.target.value)}
                      className={JOKKO.input}
                      autoFocus
                    />
                  </div>
                </JokkoDialog>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-red-600"
                onClick={async () => {
                  if (!window.confirm(`Supprimer la classe ${activeClassId} ?`)) return;
                  try {
                    await removeClass(activeClassId);
                    toast.success('Classe supprimée');
                  } catch (err) {
                    toast.error(err.message || 'Erreur');
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </Button>
            </div>
          )}
        </section>

        <section className={`${JOKKO.card} p-4 sm:p-6 space-y-4`}>
          <h2 className="font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-jokko" />
            Inscrire un élève
          </h2>
          <p className={`text-sm ${JOKKO.muted}`}>
            L&apos;élève vous donne les <strong>8 caractères</strong> affichés dans SeNote → Réception.
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
            Envoyer — {activeClass?.name || activeClassId || '…'}
          </h2>
          {!activeClassId && (
            <p className={`text-sm ${JOKKO.muted}`}>Créez ou sélectionnez une classe d&apos;abord.</p>
          )}
          {activeClassId && classData.students.length > 0 && (
            <div className="space-y-2">
              <Label>Destinataires</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientMode('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${
                    recipientMode === 'all'
                      ? 'border-jokko bg-jokko-50 dark:bg-jokko-950'
                      : 'border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  Toute la classe
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('one')}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${
                    recipientMode === 'one'
                      ? 'border-jokko bg-jokko-50 dark:bg-jokko-950'
                      : 'border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  Un élève
                </button>
              </div>
              {recipientMode === 'one' && (
                <select
                  value={targetDeviceId}
                  onChange={(e) => setTargetDeviceId(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${JOKKO.input}`}
                  required
                >
                  <option value="">Choisir un élève…</option>
                  {classData.students.map((s) => (
                    <option key={s.deviceId} value={s.deviceId}>
                      {s.displayName} (
                      {s.deviceId.replace(/^dev-/, '').slice(0, 8).toUpperCase()})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
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
            multiple
            className="hidden"
            onChange={onFiles}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            <ImageIcon className="w-4 h-4" />
            Ajouter des fichiers
          </Button>
          {attachments.length > 0 && (
            <ul className="space-y-2 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              {attachments.map((att, idx) => (
                <li
                  key={`${att.fileName}-${idx}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate min-w-0">
                    {att.type === COMM_TYPES.PDF ? (
                      <FileText className="w-3.5 h-3.5 inline mr-1 text-jokko" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 inline mr-1 text-jokko" />
                    )}
                    {att.fileName}
                  </span>
                  <button
                    type="button"
                    className="text-xs underline shrink-0"
                    onClick={() => removeAttachment(idx)}
                  >
                    Retirer
                  </button>
                </li>
              ))}
              <p className="text-xs text-slate-500 pt-1">
                {attachments.length} fichier{attachments.length > 1 ? 's' : ''} — vous pouvez en ajouter
                d&apos;autres
              </p>
            </ul>
          )}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={hasDeadline}
                onChange={(e) => setHasDeadline(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <CalendarClock className="w-4 h-4 text-jokko" />
              Ajouter une échéance pour le travail
            </label>
            {hasDeadline && (
              <div className="space-y-2">
                <Label htmlFor="deadline">Date et heure limite</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={JOKKO.input}
                  required={hasDeadline}
                />
                <p className={`text-xs ${JOKKO.muted}`}>
                  L&apos;élève verra un compte à rebours : rouge (urgent), jaune, vert.
                </p>
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={sending || !activeClassId}
            className={`w-full gap-2 ${JOKKO.btnPrimary}`}
          >
            <Send className="w-4 h-4" />
            {sending ? 'Envoi…' : recipientMode === 'one' ? 'Envoyer à cet élève' : 'Envoyer à la classe'}
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
              const targets = comm.targetDeviceIds;
              const fileCount =
                comm.attachments?.length || (comm.attachment?.fileName ? 1 : 0);
              const total = targets?.length
                ? targets.length
                : classData.students.length;
              return (
                <li
                  key={comm.id}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{comm.title || 'Sans titre'}</p>
                      {fileCount > 1 && (
                        <p className="text-xs text-jokko mt-0.5">{fileCount} fichiers</p>
                      )}
                      {targets?.length > 0 && (
                        <p className="text-xs text-jokko mt-0.5">
                          Privé · {targets.length} élève{targets.length > 1 ? 's' : ''}
                        </p>
                      )}
                      {comm.body && (
                        <p className={`text-sm ${JOKKO.muted} mt-1 line-clamp-2`}>{comm.body}</p>
                      )}
                      <p className={`text-xs ${JOKKO.muted} mt-2`}>{formatWhen(comm.createdAt)}</p>
                      {comm.deadlineAt && (
                        <p className="text-xs text-jokko mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Échéance : {formatDeadline(comm.deadlineAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs px-2 py-1 rounded-full bg-jokko-50 dark:bg-jokko-950 text-jokko">
                        {readBy.length}/{total} lu{readBy.length > 1 ? 's' : ''}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer le message"
                        onClick={async () => {
                          if (!window.confirm('Supprimer ce message ?')) return;
                          try {
                            await removeCommunication(comm.id);
                            toast.success('Message supprimé');
                          } catch {
                            toast.error('Suppression impossible');
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
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
