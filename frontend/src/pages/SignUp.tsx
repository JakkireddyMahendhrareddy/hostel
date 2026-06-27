import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Phone, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/authStore';
import { getPasswordStrength } from '../utils/passwordStrength';

const inputClass =
  'w-full pl-11 pr-4 py-3.5 text-white placeholder-slate-500 bg-slate-800/80 border-2 border-slate-700 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim()) return setError('Full name is required');
    if (!/^[0-9]{10}$/.test(form.phone.trim())) return setError('Enter a valid 10-digit phone number');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return setError('Enter a valid email address');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    try {
      await authService.signup({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast.success('Account created! Signing you in…');
      await login(form.email.trim(), form.password);
      const user = useAuthStore.getState().user;
      navigate(user?.role_id === 1 ? '/dashboard' : '/owner/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const strengthText =
    strength.label === 'Strong'
      ? 'text-emerald-400'
      : strength.label === 'Medium'
        ? 'text-amber-400'
        : 'text-red-400';
  const strengthBar =
    strength.label === 'Strong'
      ? 'bg-emerald-500'
      : strength.label === 'Medium'
        ? 'bg-amber-500'
        : 'bg-red-500';
  const filled =
    strength.label === 'Strong' ? 4 : strength.label === 'Medium' ? 3 : strength.score <= 1 ? 1 : 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-900/60 ring-4 ring-white/10">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-white">
            Hostel<span className="text-indigo-400">Hub</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Create your account</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-white text-center">Sign Up</h2>
          <p className="text-slate-400 text-sm text-center mt-1 mb-5">Join HostelHub in a minute</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  className={inputClass}
                  placeholder="Your name"
                  value={form.full_name}
                  onChange={set('full_name')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  className={inputClass}
                  placeholder="10-digit number"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={set('phone')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  className={inputClass}
                  type="email"
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={set('email')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pl-11 pr-11 py-3.5 text-white placeholder-slate-500 bg-slate-800/80 border-2 border-slate-700 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={set('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${i < filled ? strengthBar : 'bg-slate-700'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-semibold mt-1.5 ${strengthText}`}>
                    {strength.label} password
                  </p>
                </div>
              )}
              {form.password && strength.label !== 'Strong' && (
                <p className="text-xs text-slate-500 mt-1">
                  Tip: add uppercase, numbers &amp; symbols for a stronger password — you can still
                  continue.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-3.5 rounded-2xl font-semibold shadow-lg shadow-indigo-900/50 hover:from-indigo-400 hover:to-blue-500 transition disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm">
            <span className="text-slate-400">Already have an account? </span>
            <Link to="/" className="text-indigo-400 font-semibold hover:text-indigo-300">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
