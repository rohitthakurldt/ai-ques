'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { registerUser } from '@/lib/authApi';

interface FieldErrors {
  email?: string;
  password?: string;
  submit?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(value: string): string | null {
  const issues = [];
  if (value.length < 8) issues.push('be at least 8 characters');
  if (!/[A-Z]/.test(value)) issues.push('contain an uppercase letter');
  if (!/[a-z]/.test(value)) issues.push('contain a lowercase letter');
  if (!/[0-9]/.test(value)) issues.push('include a number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) issues.push('include a special character');

  return issues.length ? `Password must ${issues.join(', ')}.` : null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [showToast, setShowToast] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FieldErrors = {};

    if (!email) {
      nextErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else {
      const passwordIssue = validatePassword(password);
      if (passwordIssue) nextErrors.password = passwordIssue;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const messages = Object.values(nextErrors).filter(Boolean).join(' ');
      setToastMessage(messages || 'Please fix the errors above.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await registerUser({ email, password });
      setToastMessage('Registration successful.');
      setToastType('success');
      setShowToast(true);
      setTimeout(() => router.push('/login?registered=1'), 1200);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Registration failed. Please try again.';
      setErrors({ submit: message });
      setToastMessage(message);
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Create account</h2>
          <p className="text-sm text-gray-600">
            Register with your email and a strong password to continue.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              error={errors.email}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              error={errors.password}
            />
            <div className="flex justify-end text-sm">
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-blue-600 hover:text-blue-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide password' : 'Show password'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Must be at least 8 characters and include uppercase, lowercase,
              number, and special character.
            </p>
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}


