import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, LockKeyhole, Mail, RefreshCw, UserRound } from 'lucide-react';
import { UserProfile } from '../types';
import { ScmLogo } from './ScmLogo';
import { isScmCorporateEmail, isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  permission_level: 'SUPER_ADMIN' | 'HOD_ADMIN' | 'STAFF';
  job_title?: string | null;
  department?: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  avatar_url?: string | null;
};

const mapProfile = (profile: ProfileRow): UserProfile => ({
  id: profile.id,
  fullName: profile.full_name,
  email: profile.email,
  role: profile.permission_level === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : profile.permission_level === 'HOD_ADMIN' ? 'Admin' : 'Business Development Officer',
  permissionLevel: profile.permission_level,
  department: profile.department || 'Asset Management',
  avatarUrl: profile.avatar_url || '',
  status: profile.status === 'ACTIVE' ? 'Active' : profile.status,
});

const friendlyAuthError = (error: unknown) => {
  const raw = typeof error === 'string'
    ? error
    : error instanceof Error
      ? error.message
      : (error as any)?.message || (error as any)?.error_description || (error as any)?.error || '';
  const text = String(raw || 'Unable to complete this request.').trim();
  const lower = text.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (lower.includes('email not confirmed')) return 'Confirm your SCM corporate email before signing in.';
  if (lower.includes('already registered') || lower.includes('already exists')) return 'An SPIP account already exists for this corporate email.';
  if (lower.includes('rate limit') || lower.includes('too many')) return 'Too many attempts. Please wait a moment and try again.';
  if (lower.includes('database error') || lower.includes('saving new user')) return 'Your access request could not be created. Please contact the SPIP administrator.';
  if (lower.includes('weak password')) return 'Use a stronger password with at least 12 characters.';
  return text === '{}' ? 'Unable to complete this request. Please try again.' : text;
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('Asset Management');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setMessage('Create a new password for your SPIP account.');
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const clearFeedback = () => {
    setMessage('');
    setErrorMessage('');
  };

  const setModeSafe = (next: Mode) => {
    clearFeedback();
    setMode(next);
  };

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, permission_level, job_title, department, status, avatar_url')
      .eq('id', userId)
      .single();
    if (error || !data) throw new Error('Your SPIP profile is unavailable. Contact an administrator.');
    return data as ProfileRow;
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isScmCorporateEmail(normalizedEmail)) return setErrorMessage('Use your @scmcapitalng.com corporate email address.');
    if (!password) return setErrorMessage('Enter your password.');

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error || !data.user) throw error || new Error('Unable to sign in.');
      const profile = await loadProfile(data.user.id);
      if (profile.status !== 'ACTIVE') {
        await supabase.auth.signOut();
        if (profile.status === 'PENDING') throw new Error('Your access request is waiting for administrator approval.');
        if (profile.status === 'SUSPENDED') throw new Error('Your SPIP account is suspended. Contact an administrator.');
        throw new Error('Your SPIP access request is not active. Contact an administrator.');
      }
      onLoginSuccess(mapProfile(profile));
    } catch (error) {
      setErrorMessage(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const signup = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    const normalizedEmail = email.trim().toLowerCase();

    if (fullName.trim().length < 2) return setErrorMessage('Enter your full name.');
    if (!isScmCorporateEmail(normalizedEmail)) return setErrorMessage('Registration is restricted to @scmcapitalng.com email addresses.');
    if (password.length < 12) return setErrorMessage('Use a password with at least 12 characters.');
    if (password !== confirmPassword) return setErrorMessage('Passwords do not match.');

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          fullName: fullName.trim(),
          department: department.trim() || 'Asset Management',
          jobTitle: jobTitle.trim() || null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = body?.detail ? ` ${String(body.detail)}` : '';
        throw new Error(`${body?.error || 'Unable to create the access request.'}${detail}`.trim());
      }

      await supabase.auth.signOut().catch(() => undefined);
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setJobTitle('');
      setMessage(body?.message || 'Access request submitted. An administrator must approve the account before it can be used.');
    } catch (error) {
      setErrorMessage(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isScmCorporateEmail(normalizedEmail)) return setErrorMessage('Enter your SCM Capital corporate email address.');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: window.location.origin });
      if (error) throw error;
      setMessage('If the account exists, a password reset email has been sent.');
    } catch (error) {
      setErrorMessage(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    if (password.length < 12) return setErrorMessage('Use a password with at least 12 characters.');
    if (password !== confirmPassword) return setErrorMessage('Passwords do not match.');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully. Sign in with your new password.');
    } catch (error) {
      setErrorMessage(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-900/50 bg-slate-900 p-8">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <h1 className="mt-4 text-xl font-bold">SPIP configuration required</h1>
          <p className="mt-2 text-sm text-slate-400">Supabase environment variables are missing from this deployment.</p>
        </div>
      </div>
    );
  }

  const content = {
    login: { title: 'Sign in to SPIP', subtitle: 'Use your SCM Capital corporate email to continue.', action: 'Sign in' },
    signup: { title: 'Request SPIP access', subtitle: 'New staff accounts require administrator approval.', action: 'Submit access request' },
    forgot: { title: 'Reset your password', subtitle: 'We will send a secure recovery link to your SCM email.', action: 'Send recovery email' },
    reset: { title: 'Create a new password', subtitle: 'Use at least 12 characters.', action: 'Update password' },
  }[mode];

  return (
    <div className="min-h-screen bg-[#071524] text-slate-100">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between border-b border-white/10 px-6 py-5">
        <ScmLogo variant="light" size="md" />
        <span className="hidden text-xs text-slate-400 sm:block">SCM Capital Asset Management</span>
      </header>

      <main className="flex min-h-[calc(100vh-81px)] items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-7 shadow-2xl backdrop-blur sm:p-8">
          <div className="mb-7">
            <div className="mb-5 flex justify-center"><ScmLogo variant="light" size="lg" showText={false} /></div>
            <h1 className="text-center text-2xl font-bold tracking-tight text-white">{content.title}</h1>
            <p className="mt-2 text-center text-sm leading-6 text-slate-400">{content.subtitle}</p>
          </div>

          {errorMessage && <Feedback tone="error" text={errorMessage} />}
          {message && <Feedback tone="success" text={message} />}

          <form className="mt-5 space-y-4" onSubmit={mode === 'login' ? login : mode === 'signup' ? signup : mode === 'forgot' ? sendReset : updatePassword}>
            {mode === 'signup' && (
              <>
                <Field label="Full name" icon={UserRound} value={fullName} onChange={setFullName} placeholder="Your full name" />
                <Field label="Job title" icon={UserRound} value={jobTitle} onChange={setJobTitle} placeholder="e.g. Relationship Officer" required={false} />
                <Field label="Department / Unit" icon={UserRound} value={department} onChange={setDepartment} placeholder="Asset Management" />
              </>
            )}

            {mode !== 'reset' && <Field label="Corporate email" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="firstname.lastname@scmcapitalng.com" />}
            {mode !== 'forgot' && <Field label={mode === 'reset' ? 'New password' : 'Password'} icon={LockKeyhole} type="password" value={password} onChange={setPassword} placeholder={mode === 'login' ? 'Enter password' : 'Minimum 12 characters'} />}
            {(mode === 'signup' || mode === 'reset') && <Field label="Confirm password" icon={LockKeyhole} type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />}

            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b1191f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#94151a] disabled:opacity-50">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {content.action}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-slate-400">
            {mode === 'login' && (
              <>
                <button onClick={() => setModeSafe('forgot')} className="hover:text-white">Forgot password?</button>
                <div><button onClick={() => setModeSafe('signup')} className="font-medium text-red-400 hover:text-red-300">Request access</button></div>
              </>
            )}
            {mode !== 'login' && mode !== 'reset' && <button onClick={() => setModeSafe('login')} className="hover:text-white">Back to sign in</button>}
          </div>
        </div>
      </main>
    </div>
  );
};

const Feedback = ({ tone, text }: { tone: 'error' | 'success'; text: string }) => (
  <div className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm ${tone === 'error' ? 'border-red-900/60 bg-red-950/40 text-red-300' : 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300'}`}>
    {tone === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
    <span>{text}</span>
  </div>
);

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  type?: string;
  required?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, value, onChange, placeholder, icon: Icon, type = 'text', required = true }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>
    <span className="relative block">
      <Icon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-red-700 focus:ring-2 focus:ring-red-900/30"
      />
    </span>
  </label>
);
