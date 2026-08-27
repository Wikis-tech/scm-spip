import fs from 'fs';

const authPath = 'src/components/AuthScreen.tsx';
let auth = fs.readFileSync(authPath, 'utf8');

const replacement = `const handleRegister = async (event: React.FormEvent) => {
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
      // Use Supabase's public signup flow instead of exposing a public endpoint backed by
      // the service-role admin API. Email confirmation + PENDING approval are both required.
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName.trim(),
            department: department.trim() || 'Asset Management',
            job_title: jobTitle.trim() || null,
          },
        },
      });

      if (error) throw new Error(friendlyAuthError(error.message));
      if (!data.user) throw new Error('Unable to submit your access request. Please try again.');

      // If identities are disabled by Supabase's anti-enumeration behavior, do not reveal
      // whether an address already exists. The administrator can verify the pending queue.
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

  const handleForgotPassword`;

const registerPattern = /const handleRegister = async \(event: React\.FormEvent\) => \{[\s\S]*?\n  \};\n\n  const handleForgotPassword/;
if (!registerPattern.test(auth)) throw new Error('Could not locate handleRegister for security hardening');
auth = auth.replace(registerPattern, replacement);
fs.writeFileSync(authPath, auth);

const publicAuthPath = 'src/server/publicAuthRoutes.ts';
fs.writeFileSync(publicAuthPath, `import type { Express } from 'express';\nimport type { SupabaseClient } from '@supabase/supabase-js';\n\n/**\n * Legacy Phase 3 registration endpoint.\n *\n * Registration now uses Supabase's public signup flow so email confirmation remains\n * authoritative. Never expose auth.admin.createUser from an unauthenticated endpoint.\n */\nexport function registerPublicAuthRoutes(app: Express, _supabase: SupabaseClient) {\n  app.post('/api/auth/register-v2', (_req, res) => {\n    return res.status(410).json({\n      error: 'This registration route has been retired. Use the secure SPIP access request screen.'\n    });\n  });\n}\n`);

console.log('Phase 3 security hardening applied.');
