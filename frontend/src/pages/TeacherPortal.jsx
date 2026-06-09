import React, { useRef, useState } from 'react';
import { Image as ImageIcon, FileText, Send, LogOut, Users } from 'lucide-react';
import Logo from '../components/Logo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useTeacher } from '../context/TeacherContext';
import { COMM_TYPES, fileToAttachment, isSyncConfigured } from '../lib/classSync';
import { JOKKO } from '../lib/jokkoTheme';
import { toast } from 'sonner';

const TeacherPortal = () => {
  const {
    teacher,
    classes,
    activeClassId,
    setActiveClassId,
    logout,
    sendToClass,
    sending,
  } = useTeacher();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState(null);
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

  return (
    <div className={JOKKO.page}>
      <header className={`${JOKKO.header} px-4 py-3 flex items-center gap-3`}>
        <Logo size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{teacher.displayName}</p>
          <p className={`text-xs ${JOKKO.muted}`}>JokkoNote — professeurs</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Déconnexion">
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      <main className="max-w-2xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {!isSyncConfigured() && (
          <p className="text-sm text-jokko border border-jokko/30 rounded-xl p-4">
            Configurez <code>REACT_APP_JOKKO_SYNC_URL</code> (ex. http://localhost:8787) pour que les
            élèves reçoivent vos envois dans SeNote.
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
                <p className={`text-xs ${JOKKO.muted}`}>Code élève : {c.id}</p>
              </button>
            ))}
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
      </main>
    </div>
  );
};

export default TeacherPortal;
