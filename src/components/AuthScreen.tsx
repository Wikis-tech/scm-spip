import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle, Lock, Mail, RefreshCw, User } from 'lucide-react';
import { UserProfile } from '../types';
import { ScmLogo } from './ScmLogo';
import { isScmCorporateEmail, isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

type Mode = 'login' | 'signup' | 'forgot_password' | 'reset_password';

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
  role:
    profile.permission_level === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : profile.permission_level === 'HOD_ADMIN'
        ? 'Admin'
        : 'Business Development Officer',
  permissionLevel: profile.permission_level,
  department: profile.department || 'Asset Management',
  avatarUrl: profile.avatar_url || '',
  status: profile.status === 'ACTIVE' ? 'Active' : profile.status,
});

const friendlyAuthError = (message?: string) => {
  const text = message || 'Unable to complete authentication.';
  if (text.toLowerCase().includes('invalid login credentials')) return 'Incorrect email or password.';
  if (text.toLowerCase().includes('email not confirmed')) return 'Please confirm your corporate email before signing in.';
  if (text.toLowerCase().includes('user already registered')) return 'An account already exists for this corporate email.';
  if (text.toLowerCase().includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  return text;
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Asset Management');
  const [jobTitle, setJobTitle] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset_password');
        setInfoMsg('Create a new password for your SPIP account.');
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setErrorMsg('');
    setInfoMsg('');
  }, [mode]);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, permission_level, job_title, department, status, avatar_url')
      .eq('id', userId)
      .single();

    if (error || !data) throw new Error('Your SPIP profile could not be loaded. Contact an administrator.');
    return data as ProfileRow;
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isScmCorporateEmail(normalizedEmail)) {
      setErrorMsg('Please use your SCM Capital corporate email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error || !data.user) throw new Error(friendlyAuthError(error?.message));

      const profile = await loadProfile(data.user.id);
      if (profile.status !== 'ACTIVE') {
        await supabase.auth.signOut();
        if (profile.status === 'PENDING') throw new Error('Your SPIP access request is waiting for administrator approval.');
        if (profile.status === 'SUSPENDED') throw new Error('Your SPIP account is suspended. Contact an administrator.');
        throw new Error('Your SPIP access request has been rejected. Contact an administrator if this is unexpected.');
      }

      onLoginSuccess(mapProfile(profile));
    } catch (error: any) {
      setErrorMsg(friendlyAuthError(error?.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!fullName.trim() || !normalizedEmail || !password || !confirmPassword) {
      setErrorMsg('Full name, corporate email and password are required.');
      return;
    }
    if (!isScmCorporateEmail(normalizedEmail)) {
      setErrorMsg('Registration is restricted to @scmcapitalng.com email addresses.');
      return;
    }
    if (password.length < 12) {
      setErrorMsg('Use a password with at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      // Use Supabase's public signup flow so the corporate mailbox remains part of the
      // trust boundary. A second PENDING approval gate still blocks platform access.
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName.trim().slice(0, 150),
            department: (department.trim() || 'Asset Management').slice(0, 120),
            job_title: jobTitle.trim().slice(0, 120) || null,
          },
        },
      });

      if (error) throw new Error(friendlyAuthError(error.message));
      if (!data.user) throw new Error('Unable to submit your access request. Please try again.');

      await supabase.auth.signOut();
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setJobTitle('');
      setMode('login');
      setInfoMsg('Access request submitted. Confirm your SCM corporate email if prompted, then wait for administrator approval.');
    } catch (error: any) {
      const message = error?.message || 'Unable to submit your access request. Please try again.';
      setErrorMsg(friendlyAuthError(String(message)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isScmCorporateEmail(normalizedEmail)) {
      setErrorMsg('Please enter your SCM Capital corporate email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw new Error(friendlyAuthError(error.message));
      setInfoMsg('If this account exists, a secure password recovery email has been sent.');
    } catch (error: any) {
      setErrorMsg(friendlyAuthError(error?.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setErrorMsg('Use a password with at least 12 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(friendlyAuthError(error.message));
      await supabase.auth.signOut();
      setMode('login');
      setNewPassword('');
      setConfirmNewPassword('');
      setInfoMsg('Password updated successfully. Sign in with your new password.');
    } catch (error: any) {
      setErrorMsg(friendlyAuthError(error?.message));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-red-900/60 bg-slate-900 rounded-2xl p-8">
          <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
          <h1 className="text-xl font-bold">SPIP configuration required</h1>
          <p className="text-sm text-slate-400 mt-2">Supabase environment variables have not been configured for this deployment.</p>
        </div>
      </div>
    );
  }

  const title = mode === 'login' ? 'Sign in to SPIP' : mode === 'signup' ? 'Request SPIP access' : mode === 'forgot_password' ? 'Reset your password' : 'Create a new password';
  const subtitle = mode === 'login' ? 'Use your SCM Capital corporate email to continue.' : mode === 'signup' ? 'New accounts require administrator approval.' : mode === 'forgot_password' ? 'We will send a secure recovery link to your corporate email.' : 'Choose a new password for your account.';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="w-full max-w-7xl mx-auto px-6 py-5 border-b border-slate-800 flex items-center justify-between">
        <ScmLogo variant="light" size="md" />
        <span className="text-[11px] text-slate-400">SCM Capital Asset Management</span>
      </header>

      <main className="grow flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-7">
            <div className="flex justify-center mb-4"><ScmLogo variant="light" size="lg" showText={false} /></div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-sm text-slate-400 mt-2">{subtitle}</p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-lg border border-red-900/60 bg-red-950/40 text-red-300 text-sm flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{errorMsg}</span>
            </div>
          )}
          {infoMsg && (
            <div className="mb-5 p-3 rounded-lg border border-emerald-900/60 bg-emerald-950/30 text-emerald-300 text-sm flex gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{infoMsg}</span>
            </div>
          )}

          <form
            className="space-y-4"
            onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleRegister : mode === 'forgot_password' ? handleForgotPassword : handleResetPassword}
          >
            {mode === 'signup' && (
              <>
                <Field icon={<User className="w-4 h-4" />} label="Full name" value={fullName} onChange={setFullName} placeholder="Your full name" />
                <Field icon={<User className="w-4 h-4" />} label="Job title" value={jobTitle} onChange={setJobTitle} placeholder="e.g. Relationship Officer" required={false} />
                <Field icon={<User className="w-4 h-4" />} label="Department / Unit" value={department} onChange={setDepartment} placeholder="Asset Management" />
              </>
            )}

            {mode !== 'reset_password' && (
              <Field icon={<Mail className="w-4 h-4" />} label="Corporate email" type="email" value={email} onChange={setEmail} placeholder="firstname.lastname@scmcapitalng.com" />
            )}

            {(mode === 'login' || mode === 'signup') && (
              <Field icon={<Lock className="w-4 h-4" />} label="Password" type="password" value={password} onChange={setPassword} placeholder="Enter password" />
            )}

            {mode === 'signup' && (
              <Field icon={<Lock className="w-4 h-4" />} label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />
            )}

            {mode === 'reset_password' && (
              <>
                <Field icon={<Lock className="w-4 h-4" />} label="New password" type="password" value={newPassword} onChange={setNewPassword} placeholder="Minimum 12 characters" />
                <Field icon={<Lock className="w-4 h-4" />} label="Confirm new password" type="password" value={confirmNewPassword} onChange={setConfirmNewPassword} placeholder="Confirm new password" />
              </>
            )}

            <button disabled={isLoading} className="w-full mt-2 bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Submit access request' : mode === 'forgot_password' ? 'Send recovery email' : 'Update password'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400 space-y-2">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('forgot_password')} className="hover:text-white">Forgot password?</button>
                <div><button onClick={() => setMode('signup')} className="text-red-400 hover:text-red-300">Request access</button></div>
              </>
            )}
            {mode !== 'login' && mode !== 'reset_password' && (
              <button onClick={() => setMode('login')} className="hover:text-white">Back to sign in</button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  type?: string;
  required?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, value, onChange, placeholder, icon, type = 'text', required = true }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-slate-300 mb-1.5">{label}</span>
    <div className="relative">
      <span className="absolute left-3 top-3 text-slate-500">{icon}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
      />
    </div>
  </label>
);
