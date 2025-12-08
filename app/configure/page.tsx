'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { InterviewConfig } from '@/types';
import { startInterview } from '@/lib/api';

const subjects = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'php', label: 'PHP' },
  { value: 'c', label: 'C' },
  { value: 'c++', label: 'C++' },
  { value: 'system design', label: 'System Design' },
  { value: 'dsa', label: 'Data Structures & Algorithms' },
  { value: 'sql', label: 'SQL' },
  { value: 'nosql', label: 'NoSQL' },
];

const difficulties = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const questionCounts = [
  { value: '10', label: '10 Questions' },
  { value: '15', label: '15 Questions' },
  { value: '20', label: '20 Questions' },
  { value: '25', label: '25 Questions' },
  { value: '30', label: '30 Questions' },
];

export default function ConfigurePage() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<Partial<InterviewConfig>>({
    subject: '',
    difficulty: undefined,
    numberOfQuestions: undefined,
    yearsOfExperience: undefined,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof InterviewConfig, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof InterviewConfig, string>> = {};

    if (!config.subject) {
      newErrors.subject = 'Please select a subject';
    }
    if (!config.difficulty) {
      newErrors.difficulty = 'Please select a difficulty level';
    }
    if (!config.numberOfQuestions) {
      newErrors.numberOfQuestions = 'Please select number of questions';
    }
    if (!config.yearsOfExperience || config.yearsOfExperience < 0) {
      newErrors.yearsOfExperience = 'Please enter valid years of experience';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalConfig: InterviewConfig = {
      subject: config.subject!,
      difficulty: config.difficulty!,
      numberOfQuestions: config.numberOfQuestions!,
      yearsOfExperience: config.yearsOfExperience!,
    };

    try {
      setIsSubmitting(true);
      const startResponse = await startInterview(finalConfig);

      localStorage.setItem('interviewConfig', JSON.stringify(finalConfig));
      localStorage.setItem(
        'interviewInit',
        JSON.stringify({
          interviewId: startResponse.interview_id,
          totalQuestions: startResponse.total_questions,
          firstQuestion: startResponse.first_question,
        })
      );
      router.push('/interview');
    } catch (error) {
      console.error('Failed to start interview:', error);
      alert('Could not start interview. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-600">AI Interview</h1>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.push('/')}>
                Home
              </Button>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Configure Your Interview</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Select
              label="Subject"
              options={subjects}
              value={config.subject || ''}
              onChange={(e) => {
                setConfig({ ...config, subject: e.target.value });
                setErrors({ ...errors, subject: undefined });
              }}
              error={errors.subject}
              required
            />

            <Select
              label="Difficulty Level"
              options={difficulties}
              value={config.difficulty || ''}
              onChange={(e) => {
                setConfig({ ...config, difficulty: e.target.value as 'easy' | 'medium' | 'hard' });
                setErrors({ ...errors, difficulty: undefined });
              }}
              error={errors.difficulty}
              required
            />

            <Select
              label="Number of Questions"
              options={questionCounts}
              value={config.numberOfQuestions?.toString() || ''}
              onChange={(e) => {
                setConfig({ ...config, numberOfQuestions: parseInt(e.target.value) });
                setErrors({ ...errors, numberOfQuestions: undefined });
              }}
              error={errors.numberOfQuestions}
              required
            />

            <Input
              label="Years of Experience"
              type="number"
              min="0"
              value={config.yearsOfExperience?.toString() || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value) || undefined;
                setConfig({ ...config, yearsOfExperience: value });
                setErrors({ ...errors, yearsOfExperience: undefined });
              }}
              error={errors.yearsOfExperience}
              placeholder="Enter years of experience"
              required
            />

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Starting...' : 'Start Interview'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

