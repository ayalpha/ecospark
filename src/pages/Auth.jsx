// src/pages/Auth.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  applyActionCode,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { createUserProfile, processReferral } from '../services/firestoreService';
import {
  setUsername, checkUsernameAvailable, usernameFormatError, normalizeUsername,
} from '../services/usernameService';
import { useSettingsStore } from '../store/settingsStore';
import toast from 'react-hot-toast';
import { Leaf, Globe2, Trophy, Sparkles, ShieldCheck, MailCheck } from 'lucide-react';
import styles from './Auth.module.css';

export default function Auth() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const [form, setForm] = useState({ name: '', email: '', password: '', username: '', referralCode: refCode });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [usernameCheck, setUsernameCheck] = useState({ status: 'idle' });
  const [justVerified, setJustVerified] = useState(searchParams.get('verified') === '1');
  const { settings } = useSettingsStore();

  const isSignupDisabled = settings?.maintenanceMode || !settings?.allowSignups;

  /* live availability probe for the signup username (debounced; works
     pre-auth — the API's check action is public-safe) */
  useEffect(() => {
    if (mode !== 'signup') return undefined;
    const next = normalizeUsername(form.username);
    if (!next) { setUsernameCheck({ status: 'idle' }); return undefined; }
    const formatError = usernameFormatError(next);
    if (formatError) { setUsernameCheck({ status: 'invalid', message: formatError }); return undefined; }
    setUsernameCheck({ status: 'checking' });
    const t = setTimeout(() => {
      checkUsernameAvailable(next).then((r) => {
        setUsernameCheck(r.available ? { status: 'ok' } : { status: 'taken', message: r.message });
      }).catch(() => setUsernameCheck({ status: 'idle' }));
    }, 350);
    return () => clearTimeout(t);
  }, [form.username, mode]);

  // If the user lands back here with mode=verifyEmail&oobCode=…, consume the
  // code in-app — this is the path where the email link points directly at the
  // app instead of the Firebase-hosted handler.
  useEffect(() => {
    const oobCode = searchParams.get('oobCode');
    if (searchParams.get('mode') === 'verifyEmail' && oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => {
          setJustVerified(true);
          setMode('signin');
          toast.success('Email verified! You can sign in now.');
        })
        .catch(() => {
          toast.error('That verification link is invalid or has expired.');
        });
    }
  }, []);

  const handleForgotPassword = async () => {
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      toast.error('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, form.email, {
        url: `${window.location.origin}/auth`,
      });
      toast.success('Password reset email sent! Check your inbox.');
    } catch (err) {
      toast.error(err.code === 'auth/user-not-found' ? 'No account found with that email.' : 'Could not send reset email.');
    }
  };

  const validate = () => {
    const e = {};
    if (mode === 'signup' && !form.name.trim()) e.name = 'Name is required';
    if (mode === 'signup' && form.username.trim()) {
      const formatError = usernameFormatError(normalizeUsername(form.username));
      if (formatError) e.username = formatError;
      else if (usernameCheck.status === 'taken') e.username = usernameCheck.message;
    }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(cred.user, { displayName: form.name });

        // Send the verification link so it returns to this page after the
        // user clicks it — not to a dead Firebase hosting domain.
        try {
          await sendEmailVerification(cred.user, {
            url: `${window.location.origin}/auth?verified=1`,
            handleCodeInApp: false,
          });
        } catch (sendErr) {
          // auth/too-many-requests must not abort account creation — the
          // verification email can be requested again from the sign-in gate.
          console.warn('[Auth] verification email not sent:', sendErr.code);
        }

        await createUserProfile(cred.user.uid, {
          displayName: form.name,
          email: form.email,
          photoURL: null,
        });
        if (form.referralCode) await processReferral(cred.user.uid, form.referralCode);

        // Claim the requested @handle while the fresh token is valid. A
        // failure here must not lose the account — it can be claimed from
        // the profile later.
        const wanted = normalizeUsername(form.username);
        if (wanted) {
          try {
            await setUsername(wanted);
          } catch (uErr) {
            toast.error(`${uErr?.message || 'Username could not be claimed'} — you can claim it from your profile later.`, { duration: 8000 });
          }
        }

        // Sign them out until they verify
        await auth.signOut();

        toast.success('Account created! Check your inbox and verify your email before signing in.', { duration: 8000, icon: '📬' });
        setMode('signin');
        setLoading(false);
        return; // Stay on the sign-in form — never straight into the app
      } else {
        const cred = await signInWithEmailAndPassword(auth, form.email, form.password);

        // Enforce Email Verification
        if (!cred.user.emailVerified) {
          try {
            await sendEmailVerification(cred.user, {
              url: `${window.location.origin}/auth?verified=1`,
              handleCodeInApp: false,
            });
            toast.error('Please verify your email first — we just sent a fresh link to your inbox.', { duration: 8000, icon: '📬' });
          } catch {
            toast.error('Please verify your email first. Open the link we emailed you.', { duration: 8000, icon: '📬' });
          }
          await auth.signOut();
          setLoading(false);
          return;
        }

        // Check if banned
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));

        if (userDoc.exists() && userDoc.data().banned) {
          await auth.signOut();
          toast.error('You are banned! This account cannot access EcoSpark.', { duration: 5000 });
          setLoading(false);
          return;
        }

        // Self-heal: if the auth user has no Firestore profile (interrupted
        // signup, console-created account…), create one now so the app has
        // something to render.
        if (!userDoc.exists()) {
          await createUserProfile(cred.user.uid, {
            displayName: cred.user.displayName || cred.user.email.split('@')[0],
            email: cred.user.email,
            photoURL: cred.user.photoURL || null,
          });
        }

        toast.success('Welcome back!');
      }
      navigate('/');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Email already in use. Try signing in!'
        : ['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(err.code)
        ? 'Invalid email or password. Please try again.'
        : err.message.replace('Firebase:', '').trim();
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);

      // Check if banned
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));

      if (userDoc.exists() && userDoc.data().banned) {
        await auth.signOut();
        toast.error('You are banned! This account cannot access EcoSpark.', { duration: 5000 });
        return;
      }

      const isNew = cred._tokenResponse?.isNewUser || !userDoc.exists();
      if (isNew) {
        await createUserProfile(cred.user.uid, {
          displayName: cred.user.displayName,
          email: cred.user.email,
          photoURL: cred.user.photoURL,
        });
        if (form.referralCode) await processReferral(cred.user.uid, form.referralCode);
        toast.success('Welcome to EcoSpark! 🌱');
      } else {
        toast.success('Welcome back!');
      }
      navigate('/');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Brand panel — desktop only */}
      <aside className={styles.brandPanel}>
        <div className={styles.brandGlow} />
        <div className={styles.brandContent}>
          <div className={styles.brandMark}>
            <Leaf size={28} strokeWidth={2.2} />
            <span>EcoSpark</span>
          </div>
          <h1 className={styles.brandHeadline}>
            Small habits.<br />
            <em>Planetary</em> impact.
          </h1>
          <p className={styles.brandSub}>
            Log eco-actions, verify them with AI, and watch your streak — and your
            planet — light up.
          </p>
          <ul className={styles.brandPoints}>
            <li><Sparkles size={18} /> AI-verified photo challenges</li>
            <li><Trophy size={18} /> Live leaderboards &amp; weekly prizes</li>
            <li><Globe2 size={18} /> Real CO₂, water &amp; waste saved</li>
          </ul>
          <div className={styles.brandFooter}>
            <ShieldCheck size={16} />
            <span>Free forever for students &amp; classrooms</span>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className={styles.formPanel}>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.logo}>
            <img src="/logo-8k.jpeg" alt="EcoSpark Icon" className={styles.logoImg} />
            <div>
              <p className={styles.logoTitle}>Welcome</p>
              <p className={styles.logoSub}>Sustainability, made a habit</p>
            </div>
          </div>

          <AnimatePresence>
            {justVerified && (
              <motion.div
                className={styles.verifiedBanner}
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <MailCheck size={18} />
                <div>
                  <strong>Email verified!</strong>
                  <span>Sign in below to start your journey.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mode toggle */}
          <div className={styles.toggle} role="tablist">
            <button
              type="button"
              className={`${styles.toggleBtn} ${mode === 'signin' ? styles.toggleActive : ''}`}
              onClick={() => { setMode('signin'); setErrors({}); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${mode === 'signup' ? styles.toggleActive : ''}`}
              onClick={() => { setMode('signup'); setErrors({}); }}
            >
              Sign Up
            </button>
          </div>

          {settings?.maintenanceMode && (
            <div className={styles.notice}>
              <span className={styles.noticeIcon}>🚧</span>
              <div>
                <strong>System maintenance</strong>
                <p>Only authorized staff may sign in at this time.</p>
              </div>
            </div>
          )}

          {mode === 'signup' && isSignupDisabled ? (
            <div className={styles.notice}>
              <span className={styles.noticeIcon}>🚧</span>
              <div>
                <strong>Signups paused</strong>
                <p>We are not accepting new registrations right now. Please check back soon!</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className={styles.form}>
              <AnimatePresence initial={false}>
                {mode === 'signup' && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="auth-name">Full Name</label>
                      <input
                        id="auth-name"
                        type="text"
                        className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                        placeholder="Your name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        autoComplete="name"
                      />
                      {errors.name && <p className={styles.error}>{errors.name}</p>}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="auth-username">Username <span className={styles.optional}>(optional)</span></label>
                      <div className={styles.usernameRow}>
                        <span className={styles.usernamePrefix}>@</span>
                        <input
                          id="auth-username"
                          type="text"
                          className={`${styles.input} ${styles.usernameField} ${errors.username || usernameCheck.status === 'taken' || usernameCheck.status === 'invalid' ? styles.inputError : ''} ${usernameCheck.status === 'ok' ? styles.inputOk : ''}`}
                          placeholder="eco_warrior"
                          value={form.username}
                          onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                          maxLength={20}
                          autoComplete="off"
                        />
                      </div>
                      {(errors.username || usernameCheck.status !== 'idle') && (
                        <p className={`${styles.hint} ${errors.username || usernameCheck.status === 'taken' || usernameCheck.status === 'invalid' ? styles.hintBad : styles.hintOk}`}>
                          {errors.username
                            || (usernameCheck.status === 'checking' ? 'Checking…'
                              : usernameCheck.status === 'ok' ? `ecosprk.vercel.app/@${form.username} is available!`
                              : usernameCheck.message || '')}
                        </p>
                      )}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="auth-referral">Referral Code <span className={styles.optional}>(optional)</span></label>
                      <input
                        id="auth-referral"
                        type="text"
                        className={styles.input}
                        placeholder="ECO-…"
                        value={form.referralCode}
                        onChange={(e) => setForm({ ...form, referralCode: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                />
                {errors.email && <p className={styles.error}>{errors.email}</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                {errors.password && <p className={styles.error}>{errors.password}</p>}
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className={styles.forgotLink}
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <motion.button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
              >
                {loading ? <span className={styles.spinner} /> : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </motion.button>
            </form>
          )}

          <div className={styles.divider}><span>or</span></div>

          <motion.button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogleAuth}
            disabled={loading || settings?.maintenanceMode || (mode === 'signup' && isSignupDisabled)}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </motion.button>

          <p className={styles.terms}>
            By continuing, you agree to our <a href="/about">Terms</a> and <a href="/about">Privacy Policy</a>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
