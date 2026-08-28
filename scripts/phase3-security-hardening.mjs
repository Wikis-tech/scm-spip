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

  const handleForgotPassword`;

const registerPattern = /const handleRegister = async \(event: React\.FormEvent\) => \{[\s\S]*?\n  \};\n\n  const handleForgotPassword/;
if (!registerPattern.test(auth)) throw new Error('Could not locate handleRegister for security hardening');
auth = auth.replace(registerPattern, replacement);
fs.writeFileSync(authPath, auth);

const publicAuthPath = 'src/server/publicAuthRoutes.ts';
fs.writeFileSync(publicAuthPath, `import type { Express } from 'express';\nimport type { SupabaseClient } from '@supabase/supabase-js';\n\n/**\n * Legacy Phase 3 registration endpoint.\n * Registration now uses Supabase's public signup flow with mailbox confirmation.\n * Never expose service-role account creation from an unauthenticated endpoint.\n */\nexport function registerPublicAuthRoutes(app: Express, _supabase: SupabaseClient) {\n  app.post('/api/auth/register-v2', (_req, res) => {\n    return res.status(410).json({\n      error: 'This registration route has been retired. Use the secure SPIP access request screen.'\n    });\n  });\n}\n`);

// Require proof of control of the SCM mailbox before an administrator can activate a
// pending account. This prevents accidental approval of an unverified identity.
const phase2Path = 'src/server/phase2Routes.ts';
let phase2 = fs.readFileSync(phase2Path, 'utf8');
const oldApprovalBlock = `      if (nextStatus === 'ACTIVE') {\n        patch.approved_at = new Date().toISOString();\n        patch.approved_by = actor.userId;\n      }`;
const newApprovalBlock = `      if (nextStatus === 'ACTIVE') {\n        const { data: authRecord, error: authLookupError } = await supabase.auth.admin.getUserById(targetId);\n        const confirmedAt = authRecord?.user?.email_confirmed_at || authRecord?.user?.confirmed_at;\n        if (authLookupError || !authRecord?.user) {\n          return res.status(503).json({ error: 'Unable to verify this corporate identity before approval.' });\n        }\n        if (!confirmedAt) {\n          return res.status(400).json({ error: 'This user must confirm their SCM corporate email before an administrator can activate the account.' });\n        }\n        patch.approved_at = new Date().toISOString();\n        patch.approved_by = actor.userId;\n      }`;
if (!phase2.includes(newApprovalBlock)) {
  if (!phase2.includes(oldApprovalBlock)) throw new Error('Could not locate Phase 2 approval block for hardening');
  phase2 = phase2.replace(oldApprovalBlock, newApprovalBlock);
  fs.writeFileSync(phase2Path, phase2);
}

console.log('Phase 3 security hardening applied.');
