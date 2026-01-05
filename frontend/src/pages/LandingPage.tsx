import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, Zap } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const loginSchema = Yup.object({
  identifier: Yup.string()
    .required('Email or mobile number is required')
    .test('identifier', 'Invalid email or mobile number', (value) => {
      if (!value) return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const mobileRegex = /^[0-9]{10}$/;
      return emailRegex.test(value) || mobileRegex.test(value);
    }),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setForgotLoading(true);
    try {
      // Call backend to send password reset email
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setResetSent(true);
      toast.success('Password reset link sent to your email!');
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSent(false);
        setForgotEmail('');
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process forgot password request');
    } finally {
      setForgotLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      identifier: '',
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setLoginError('');
      try {
        await login(values.identifier, values.password);

        const user = useAuthStore.getState().user;

        toast.success(`Welcome, ${user?.full_name}!`);
        
        // Redirect based on role
        if (user?.role === 'Main Admin') {
          navigate('/dashboard');
        } else if (user?.role === 'Hostel Owner') {
          navigate('/owner/dashboard');
        } else {
          navigate('/dashboard');
        }
      } catch (error: any) {
        let errorMessage = 'Invalid credentials. Please try again.';

        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response?.status === 401) {
          errorMessage = 'Invalid email/phone or password. Please check your credentials.';
        } else if (error.response?.status === 400) {
          errorMessage = 'Please enter valid email/phone and password.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        setLoginError(errorMessage);
        toast.error(errorMessage);
        console.error('Login error:', error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Main Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            {/* Left Side - Branding & Info */}
            <div className="text-white order-2 lg:order-1 text-center lg:text-left hidden lg:block">
              <div className="mb-4 inline-flex lg:flex items-center justify-center lg:justify-start gap-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                  <div className="relative px-2 py-1 bg-gray-900 rounded-lg">
                    <Zap className="h-4 w-4 text-purple-400" />
                  </div>
                </div>
                <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Modern Solution</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight">
                Hostel Management
                <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h1>

              <p className="text-sm text-gray-300 mb-6 leading-relaxed max-w-lg">
                Complete control over your hostel operations. Manage students, rooms, finances, and more.
              </p>

              <div className="flex flex-col gap-2 justify-center lg:justify-start mb-6">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
                  Student Management
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                  Fee Tracking
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-blue-400 rounded-full"></div>
                  Real-time Analytics
                </div>
              </div>
            </div>

            {/* Right Side - Login Card */}
            <div className="order-1 lg:order-2">
              <div className="relative group">
                {/* Glowing Border */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-500"></div>

                {/* Card */}
                <div className="relative bg-gray-900 rounded-2xl p-6 border border-gray-800 backdrop-blur-xl">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center mb-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-75"></div>
                        <div className="relative p-2 bg-gray-900 rounded-lg">
                          <Building2 className="h-5 w-5 text-purple-400" />
                        </div>
                      </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      Welcome Back
                    </h2>
                    <p className="text-gray-400 text-xs">Sign in to your account</p>
                  </div>

                  {/* Error Alert */}
                  {loginError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-start gap-2">
                        <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm text-red-300">{loginError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={formik.handleSubmit} className="space-y-4">
                    {/* Email Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Email or Phone
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                        <input
                          type="text"
                          name="identifier"
                          placeholder="owner@example.com"
                          value={formik.values.identifier}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className={`w-full pl-10 pr-3 py-2 bg-gray-800 border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                            loginError
                              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                              : 'border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                          }`}
                        />
                      </div>
                      {formik.touched.identifier && formik.errors.identifier && (
                        <p className="mt-1 text-xs text-red-400">{formik.errors.identifier}</p>
                      )}
                    </div>

                    {/* Password Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Password
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          placeholder="••••••••"
                          value={formik.values.password}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className={`w-full pl-10 pr-10 py-2 bg-gray-800 border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                            loginError
                              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                              : 'border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {formik.touched.password && formik.errors.password && (
                        <p className="mt-1 text-xs text-red-400">{formik.errors.password}</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={formik.isSubmitting}
                      className="w-full py-2 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {formik.isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Signing in...
                        </span>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </form>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-700 text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 pt-8 border-t border-gray-800/50">
            {[
              {
                icon: '🔐',
                title: 'Secure',
                desc: 'Enterprise-grade security',
              },
              {
                icon: '⚡',
                title: 'Fast',
                desc: 'Lightning-fast performance',
              },
              {
                icon: '📊',
                title: 'Smart',
                desc: 'Intelligent analytics',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="text-center text-gray-300 hover:text-white transition-colors group cursor-pointer"
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="font-semibold text-xs mb-0.5">{feature.title}</h3>
                <p className="text-xs text-gray-500 group-hover:text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative group w-full max-w-sm">
            {/* Glowing Border */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-500"></div>

            {/* Modal Content */}
            <div className="relative bg-gray-900 rounded-2xl p-6 border border-gray-800">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Reset Password</h2>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setForgotEmail('');
                  }}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {resetSent ? (
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 border border-green-500">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm mb-0.5">Check Your Email</p>
                    <p className="text-gray-400 text-xs">
                      We've sent a reset link to <span className="text-purple-400 font-medium">{forgotEmail}</span>
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 pt-2">Expires in 1 hour</p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <p className="text-xs text-gray-300 mb-4">
                    Enter your email and we'll send a reset link.
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotEmail('');
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg font-medium text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-1.5 px-3 rounded-lg font-medium text-xs text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? (
                        <>
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        'Send Link'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
