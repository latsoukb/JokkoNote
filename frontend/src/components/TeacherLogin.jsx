import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import Logo from './Logo';
import { useTeacher } from '../context/TeacherContext';
import { JOKKO } from '../lib/jokkoTheme';

const TeacherLogin = () => {
  const { login } = useTeacher();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setError(!login(user, pass));
  };

  return (
    <div className={`flex items-center justify-center px-4 ${JOKKO.page}`}>
      <form onSubmit={submit} className={`w-full max-w-sm p-8 ${JOKKO.card} text-center`}>
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        <h1 className="text-xl font-semibold mb-1">Portail professeur</h1>
        <p className={`text-sm mb-6 ${JOKKO.muted}`}>Messages, PDF et images vers vos classes.</p>
        <div className="space-y-3 text-left mb-4">
          <div className="space-y-1">
            <Label htmlFor="login">Identifiant</Label>
            <Input id="login" value={user} onChange={(e) => setUser(e.target.value)} className={JOKKO.input} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pass">Mot de passe</Label>
            <Input
              id="pass"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className={JOKKO.input}
            />
          </div>
        </div>
        {error && <p className="text-sm text-jokko mb-3">Identifiants incorrects</p>}
        <Button type="submit" className={`w-full ${JOKKO.btnPrimary}`}>
          Connexion
        </Button>
        <p className={`text-xs mt-4 ${JOKKO.muted}`}>Démo : diop / jokko2026</p>
      </form>
    </div>
  );
};

export default TeacherLogin;
