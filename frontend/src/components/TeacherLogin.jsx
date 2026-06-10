import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import Logo from './Logo';
import { useTeacher } from '../context/TeacherContext';
import { useTheme } from '../context/ThemeContext';
import { JOKKO } from '../lib/jokkoTheme';

const TeacherLogin = () => {
  const { login, register, syncConfigured } = useTeacher();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState('login');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [registerUser, setRegisterUser] = useState('');
  const [registerPass, setRegisterPass] = useState('');
  const [registerPassConfirm, setRegisterPassConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        if (registerPass.length < 6) {
          setError('Mot de passe : 6 caractères minimum');
          return;
        }
        if (registerPass !== registerPassConfirm) {
          setError('Les mots de passe ne correspondent pas');
          return;
        }
        await register(registerUser, registerPass, displayName || registerUser);
      } else {
        await login(loginUser, loginPass);
      }
    } catch (err) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative flex items-center justify-center px-4 ${JOKKO.page}`}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4"
        onClick={toggleTheme}
        aria-label="Thème"
        type="button"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </Button>
      <form onSubmit={submit} className={`w-full max-w-sm p-8 ${JOKKO.card} text-center`}>
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        <h1 className="text-xl font-semibold mb-1">Portail professeur</h1>
        <p className={`text-sm mb-6 ${JOKKO.muted}`}>Messages, PDF et images vers vos classes.</p>

        <div className="flex gap-1 mb-4 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${
              mode === 'login' ? 'bg-white dark:bg-neutral-800 font-medium shadow-sm' : ''
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${
              mode === 'register' ? 'bg-white dark:bg-neutral-800 font-medium shadow-sm' : ''
            }`}
          >
            Créer un compte
          </button>
        </div>

        <div className="space-y-3 text-left mb-4">
          {mode === 'register' && (
            <div className="space-y-1">
              <Label htmlFor="displayName">Nom affiché</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="M. Diop"
                className={JOKKO.input}
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="login">Identifiant</Label>
            <Input
              id="login"
              value={mode === 'register' ? registerUser : loginUser}
              onChange={(e) =>
                mode === 'register'
                  ? setRegisterUser(e.target.value)
                  : setLoginUser(e.target.value)
              }
              className={JOKKO.input}
              required
              autoComplete={mode === 'register' ? 'username' : 'username'}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pass">Mot de passe</Label>
            <Input
              id="pass"
              type="password"
              value={mode === 'register' ? registerPass : loginPass}
              onChange={(e) =>
                mode === 'register'
                  ? setRegisterPass(e.target.value)
                  : setLoginPass(e.target.value)
              }
              className={JOKKO.input}
              required
              minLength={mode === 'register' ? 6 : 1}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>
          {mode === 'register' && (
            <div className="space-y-1">
              <Label htmlFor="passConfirm">Confirmer le mot de passe</Label>
              <Input
                id="passConfirm"
                type="password"
                value={registerPassConfirm}
                onChange={(e) => setRegisterPassConfirm(e.target.value)}
                className={JOKKO.input}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          )}
        </div>
        {!syncConfigured && (
          <p className="text-xs text-amber-600 mb-3">Serveur sync non configuré.</p>
        )}
        {error && <p className="text-sm text-jokko mb-3">{error}</p>}
        <Button type="submit" className={`w-full ${JOKKO.btnPrimary}`} disabled={loading}>
          {loading
            ? '…'
            : mode === 'register'
              ? 'Créer mon compte'
              : 'Connexion'}
        </Button>
        {mode === 'login' && (
          <p className={`text-xs mt-4 ${JOKKO.muted}`}>Démo : diop / jokko2026</p>
        )}
      </form>
    </div>
  );
};

export default TeacherLogin;
