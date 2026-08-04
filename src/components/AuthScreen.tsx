import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ShieldCheck, 
  Briefcase, 
  ArrowRight, 
  Key, 
  CheckCircle, 
  AlertCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { ScmLogo } from './ScmLogo';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify' | 'forgot_password' | 'reset_password'>('login');
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Form values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('Business Development Officer');
  const [department, setDepartment] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [activeOtp, setActiveOtp] = useState<string | null>(null);

  // Status values
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validate SCM Capital email domain and format
  const validateEmailFormat = (emailVal: string): boolean => {
    if (!emailVal) return false;
    const trimmed = emailVal.trim().toLowerCase();
    if (!trimmed.endsWith("@scmcapitalng.com")) return false;
    const localPart = trimmed.split("@")[0];
    if (!localPart) return false;
    return /^[a-z0-9._-]+$/.test(localPart);
  };

  // Clear errors on mode switch
  useEffect(() => {
    setErrorMsg('');
    setInfoMsg('');
    if (mode === 'login' || mode === 'signup' || mode === 'forgot_password') {
      setActiveOtp(null);
    }
  }, [mode]);

  // Load SCM Enterprise Security Configurations
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/auth/config');
        if (res.ok) {
          const data = await res.json();
          setIsDemoMode(data.demoMode);
        }
      } catch (err) {
        console.warn("[SCM AUTH SYSTEM] Failed to fetch server configurations:", err);
      }
    };
    fetchConfig();
  }, []);

  // Handle standard login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please specify both corporate email and password.');
      return;
    }

    if (!validateEmailFormat(email)) {
      setErrorMsg('Only SCM Capital email addresses are permitted.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server rejected credential validation.');
      }

      if (data.error === "email_unverified") {
        setEmail(data.email);
        setMode('verify');
        if (data.code) {
          setActiveOtp(data.code);
        }
        setInfoMsg(`Your corporate account remains unverified. Please enter the security verification key.`);
      } else if (data.user) {
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network delay communicating with SCM login unit.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword || !department) {
      setErrorMsg('Full Name, Email, Password, Confirm Password, and Department are mandatory.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!validateEmailFormat(email)) {
      setErrorMsg('Only SCM Capital email addresses are permitted.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fullName: fullName.trim(), 
          email: email.trim(), 
          password, 
          department: department.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration rejected.');
      }

      setInfoMsg(`Your request has been submitted. Please contact an administrator for approval. wisdom.okoh@scmcapitalng.com`);
      setMode('login');
      setPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed connecting to SCM Capital registers.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email verification code check
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setErrorMsg('Please input the 6-digit security code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification code validation failed.');
      }

      setInfoMsg('Account verified successfully! Please login with your password.');
      setMode('login');
      setPassword('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle forgot password request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please specify your registered corporate email.');
      return;
    }

    if (!validateEmailFormat(email)) {
      setErrorMsg('Only SCM Capital email addresses are permitted.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password recovery initiation rejected.');
      }

      setMode('reset_password');
      if (data.code) {
        setActiveOtp(data.code);
      }
      setInfoMsg(`Dispatched credentials security token. Please enter your security recovery code.`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset validation and replacement
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !newPassword) {
      setErrorMsg('Enter both security code and new secret password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          code: code.trim(), 
          newPassword 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credential reset rejected.');
      }

      setInfoMsg('Password redefined! Please proceed to login with your new secret key.');
      setMode('login');
      setPassword(newPassword);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="scm-auth-page" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-y-auto select-none font-sans">
      
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-red-950/20 rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-950/25 rounded-full filter blur-[120px] pointer-events-none"></div>

      {/* Corporate Header */}
      <div className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-800 relative z-10">
        <ScmLogo variant="light" size="md" />
        <div className="flex items-center gap-1 bg-emerald-900/30 text-emerald-400 border border-emerald-800/60 px-2.5 py-1 rounded text-[10px] font-mono leading-none tracking-wide font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          SCM SECURE NODE
        </div>
      </div>

      {/* Main Content Layout - Centered for pristine corporate portal feel */}
      <div className="w-full max-w-md mx-auto px-6 py-12 grow flex flex-col justify-center relative z-10">
        
        {/* Core Form Container */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl shadow-2xl p-8 backdrop-blur-md">
          
          {/* Logo & Motive */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <ScmLogo variant="light" size="lg" showText={false} />
            </div>
            <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
              {mode === 'login' && 'Terminal Authentication'}
              {mode === 'signup' && 'Register Corporate Roster'}
              {mode === 'verify' && 'Verify Security Token'}
              {mode === 'forgot_password' && 'Recover Workspace Passwords'}
              {mode === 'reset_password' && 'Define Secret Password'}
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              {mode === 'login' && 'Provide valid SCM Capital investment officer credentials.'}
              {mode === 'signup' && 'Create your B2B personnel account to request pipeline authorization.'}
              {mode === 'verify' && 'An evaluation key has been routed to authorize your profile.'}
              {mode === 'forgot_password' && 'Enter your registered corporate address to trigger verification.'}
              {mode === 'reset_password' && 'Complete validation and assign your new access key.'}
            </p>
          </div>

          {/* SCM Demo Mode Active Banner */}
          {isDemoMode && (
            <div id="scm-demo-mode-banner" className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-lg text-[11px] text-amber-300 flex items-start gap-2.5 mb-5 select-text animate-fade-in">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-bold block text-amber-200">SCM Platform Pilot Mode Active</span>
                Email delivery is disabled in Demo Mode. Verification codes are displayed locally.
              </div>
            </div>
          )}

          {/* Feedback Toasts */}
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/50 rounded-lg text-xs text-red-300 flex items-start gap-2.5 mb-5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 bg-emerald-950/65 border border-emerald-800/50 rounded-lg text-xs text-emerald-300 flex flex-col gap-2 mb-5">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium text-slate-100">{infoMsg}</span>
              </div>
            </div>
          )}

          {/* Mode-Specific Forms */}
          <form className="space-y-4 font-sans" onSubmit={
            mode === 'login' ? handleLogin :
            mode === 'signup' ? handleRegister :
            mode === 'verify' ? handleVerifyCode :
            mode === 'forgot_password' ? handleForgotPassword :
            handleResetPassword
          }>
            
            {/* FULL NAME (Signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Full Personnel Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Julian Draxler"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-primary-brand focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>
              </div>
            )}

            {/* EMAIL (All except Reset Password) */}
            {mode !== 'reset_password' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Corporate Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    required
                    placeholder="firstname.lastname@scmcapitalng.com"
                    disabled={mode === 'verify'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-550 outline-none focus:border-primary-brand focus:ring-1 focus:ring-primary-brand transition-all ${mode === 'verify' ? 'opacity-65 cursor-not-allowed' : ''}`}
                  />
                </div>
                <span className="text-[9px] text-slate-500 block mt-1">Must use SCM format: <span className="font-mono text-slate-400">firstname.lastname@scmcapitalng.com</span></span>
              </div>
            )}

            {/* PASSWORD (Login & Signup only) */}
            {(mode === 'login' || mode === 'signup') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Secret Key / Password</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot_password')}
                      className="text-[10px] text-red-400 font-semibold hover:text-red-300 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-primary-brand focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>
                {mode === 'login' && (
                  <span className="text-[9px] text-slate-550 block mt-1">Tested roster password: <span className="font-mono font-bold text-slate-400">scmcapital2026</span></span>
                )}
              </div>
            )}

            {/* CONFIRM PASSWORD (Signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-primary-brand focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>
              </div>
            )}

            {/* DEPT (Signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Department</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Wealth Advisory Unit"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-primary-brand focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>
              </div>
            )}

            {/* VERIFICATION KEY (Verify & Reset Password modes) */}
            {(mode === 'verify' || mode === 'reset_password') && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">6-Digit Security Token</label>
                {isDemoMode && activeOtp && (
                  <div className="mb-3.5 p-3.5 bg-amber-955/40 border border-amber-800/40 rounded-xl text-center animate-fade-in select-text">
                    <span className="block text-[9px] text-amber-400 uppercase tracking-widest font-extrabold mb-1.5">Secure Gateway Sandbox Receipt</span>
                    <span className="font-mono text-2xl font-black text-amber-300 tracking-widest bg-slate-900/90 px-4 py-1 rounded-lg border border-amber-950">{activeOtp}</span>
                    <button 
                      type="button" 
                      onClick={() => setCode(activeOtp)}
                      className="block mx-auto text-[10px] text-emerald-400 hover:text-emerald-300 font-bold mt-2 hover:underline cursor-pointer"
                    >
                      Autofill this security key
                    </button>
                  </div>
                )}
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    placeholder="e.g. 593810"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm font-bold tracking-widest text-emerald-400 placeholder-slate-500 outline-none focus:border-primary-brand focus:ring-1 focus:ring-primary-brand transition-all text-center"
                  />
                </div>
              </div>
            )}

            {/* NEW PASSWORD (Reset Password only) */}
            {mode === 'reset_password' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Define New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    required
                    placeholder="Assign new secret key"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-primary-brand focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary-brand hover:bg-primary-dark text-white font-semibold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 focus:ring-2 focus:ring-red-900 shadow-lg shadow-red-950/50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {mode === 'login' && 'Sign In to Workspace'}
                  {mode === 'signup' && 'Request Access'}
                  {mode === 'verify' && 'Verify Credentials'}
                  {mode === 'forgot_password' && 'Route Recovery Codes'}
                  {mode === 'reset_password' && 'Reset Access Key'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Toggle Alternate Mode */}
          <div className="mt-6 pt-5 border-t border-slate-800/60 text-center flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-slate-400">
            {mode === 'login' ? (
              <>
                <span>New SCM investment officer?</span>
                <button 
                  onClick={() => setMode('signup')}
                  className="font-bold text-white hover:text-red-400 transition-colors cursor-pointer"
                >
                  Create Personnel Account
                </button>
              </>
            ) : (
              <>
                <span>Already enrolled on SCM registers?</span>
                <button 
                  onClick={() => setMode('login')}
                  className="font-bold text-white hover:text-red-400 transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </>
            )}
          </div>
        </div>

        {/* Brand spec specifier */}
        <div className="mt-6 text-center text-[10.5px] text-slate-500 bg-slate-955 px-4 py-3 rounded-lg border border-slate-850">
          <span className="font-bold text-slate-400 block mb-1">SCM Staff Credentials Hub</span>
          Access restricted to personnel possessing domain emails configured with Microsoft 365 identity pools.
        </div>

      </div>

      {/* Corporate footer */}
      <footer className="w-full text-center py-5 border-t border-slate-800 text-[10px] text-slate-500">
        © 2026 SCM Capital Group Limited. SCM Capital is licensed by SEC Nigeria. All sessions are monitored and logged.
      </footer>
    </div>
  );
};
