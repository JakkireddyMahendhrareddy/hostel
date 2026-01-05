import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

const loginSchema = Yup.object({
  identifier: Yup.string()
    .required('Email or mobile number is required')
    .test('identifier', 'Invalid email or mobile number', (value) => {
      if (!value) return false;
      // Check if it's a valid email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Check if it's a valid mobile number (10 digits)
      const mobileRegex = /^[0-9]{10}$/;
      return emailRegex.test(value) || mobileRegex.test(value);
    }),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      identifier: '',
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await login(values.identifier, values.password);
        toast.success('Login successful!');
        
        const user = useAuthStore.getState().user;
        // Redirect based on role
        if (user?.role === 'Main Admin') {
          navigate('/dashboard');
        } else if (user?.role === 'Hostel Owner') {
          navigate('/owner/dashboard');
        } else {
          navigate('/dashboard');
        }
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Invalid credentials');
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Hostel Management
          </h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <Input
            name="identifier"
            type="text"
            label="Email or Mobile Number"
            placeholder="admin@hostelapp.com or 9876543210"
            prefixIcon={<Mail className="h-5 w-5 text-gray-400" />}
            value={formik.values.identifier}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.identifier && formik.errors.identifier
                ? formik.errors.identifier
                : undefined
            }
          />

          <Input
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="Enter your password"
            prefixIcon={<Lock className="h-5 w-5 text-gray-400" />}
            suffixIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            }
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.password && formik.errors.password
                ? formik.errors.password
                : undefined
            }
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={formik.isSubmitting}
          >
            Login
          </Button>

          <div className="flex items-center justify-between text-xs">
            <Link
              to="/forgot-password"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Forgot Password?
            </Link>
            <Link
              to="/change-password"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Change Password
            </Link>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Demo Credentials:</p>
          <p className="font-mono mt-1">admin@hostelapp.com / password123</p>
        </div>
      </Card>
    </div>
  );
};
