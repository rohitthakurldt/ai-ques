'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { SpeechButton } from '@/components/ui/SpeechButton';
import { SpeechToText } from '@/components/ui/SpeechToText';
import { Toast } from '@/components/ui/Toast';
import { InterviewConfig, Question, Answer } from '@/types';
import { fetchQuestions, submitAnswer, submitInterview } from '@/lib/api';
import { getRandomIntroHeading } from '@/lib/utils';

export default function InterviewPage() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [, setConfig] = useState<InterviewConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 means intro section
  const [introAnswer, setIntroAnswer] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [introHeading] = useState(getRandomIntroHeading());

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Load config from localStorage
    const savedConfig = localStorage.getItem('interviewConfig');
    if (!savedConfig) {
      router.push('/configure');
      return;
    }

    const interviewConfig: InterviewConfig = JSON.parse(savedConfig);
    setConfig(interviewConfig);

    // Fetch questions
    loadQuestions(interviewConfig);
  }, [isAuthenticated, router]);

  const loadQuestions = async (interviewConfig: InterviewConfig) => {
    try {
      setIsLoading(true);
      const fetchedQuestions = await fetchQuestions(interviewConfig);
      setQuestions(fetchedQuestions);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading questions:', error);
      setIsLoading(false);
    }
  };

  const handleIntroSubmit = () => {
    if (!introAnswer.trim()) {
      alert('Please provide your introduction');
      return;
    }

    // Save intro answer
    const introAnswerObj: Answer = {
      questionId: 'intro',
      answer: introAnswer,
      timestamp: Date.now(),
    };
    setAnswers([introAnswerObj]);
    setCurrentQuestionIndex(0);
  };

  const handleQuestionSubmit = async () => {
    if (!currentAnswer.trim()) {
      alert('Please provide an answer');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setIsSubmitting(true);

    // Save answer locally
    const answerObj: Answer = {
      questionId: currentQuestion.id,
      answer: currentAnswer,
      timestamp: Date.now(),
    };

    const newAnswers = [...answers, answerObj];
    setAnswers(newAnswers);

    // Submit to backend
    try {
      await submitAnswer(currentQuestion.id, currentAnswer);
    } catch (error) {
      console.error('Error submitting answer:', error);
    }

    setIsSubmitting(false);
    setCurrentAnswer('');

    // Move to next question or finish
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleFinalSubmit = async () => {
    if (!currentAnswer.trim()) {
      alert('Please provide an answer to the last question');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setIsSubmitting(true);

    // Save last answer
    const answerObj: Answer = {
      questionId: currentQuestion.id,
      answer: currentAnswer,
      timestamp: Date.now(),
    };

    const finalAnswers = [...answers, answerObj];

    try {
      await submitAnswer(currentQuestion.id, currentAnswer);
      await submitInterview(finalAnswers);
      
      setShowSuccessToast(true);
      
      // Clear interview state
      localStorage.removeItem('interviewConfig');
      localStorage.removeItem('interviewState');
      
      setTimeout(() => {
        logout();
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error('Error submitting interview:', error);
      alert('Failed to submit interview. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isIntroSection = currentQuestionIndex === -1;
  const currentQuestion = currentQuestionIndex >= 0 ? questions[currentQuestionIndex] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-600">AI Interview</h1>
            <div className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length + 1}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          {isIntroSection ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {introHeading}
                </h2>
                <SpeechButton text={introHeading} />
              </div>
              
              <p className="text-gray-600 mb-6">
                Please provide a brief introduction about yourself. You can type your answer or use the microphone button to speak.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <textarea
                    value={introAnswer}
                    onChange={(e) => setIntroAnswer(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={8}
                    placeholder="Type your introduction here..."
                  />
                  <div className="flex flex-col gap-2">
                    <SpeechToText
                      onTranscript={(text) => setIntroAnswer((prev) => prev + ' ' + text)}
                      disabled={false}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleIntroSubmit} size="lg">
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : currentQuestion ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {currentQuestion.question}
                </h2>
                <SpeechButton text={currentQuestion.question} />
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={8}
                    placeholder="Type your answer here..."
                    disabled={isSubmitting}
                  />
                  <div className="flex flex-col gap-2">
                    <SpeechToText
                      onTranscript={(text) => setCurrentAnswer((prev) => prev + ' ' + text)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  {isLastQuestion ? (
                    <Button
                      onClick={handleFinalSubmit}
                      size="lg"
                      isLoading={isSubmitting}
                    >
                      Submit Interview
                    </Button>
                  ) : (
                    <Button
                      onClick={handleQuestionSubmit}
                      size="lg"
                      isLoading={isSubmitting}
                    >
                      Submit & Next
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Toast
        message="Interview submitted successfully! Redirecting..."
        type="success"
        isVisible={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  );
}

