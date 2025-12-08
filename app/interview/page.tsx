'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { SpeechButton } from '@/components/ui/SpeechButton';
import { SpeechToText } from '@/components/ui/SpeechToText';
import { Toast } from '@/components/ui/Toast';
import { InterviewConfig, Question, Answer } from '@/types';
import { answerQuestion } from '@/lib/api';
import { getRandomIntroHeading } from '@/lib/utils';

const INTERVIEW_STATE_KEY = 'interviewState';

const saveInterviewState = (state: {
  config: InterviewConfig;
  currentQuestionIndex: number;
  questions: Question[];
  answers: Answer[];
  introAnswer: string;
  currentAnswer: string;
  introHeading: string;
  interviewId: string;
  totalQuestions: number;
}) => {
  try {
    localStorage.setItem(INTERVIEW_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving interview state:', error);
  }
};

const loadInterviewState = (): {
  config: InterviewConfig;
  currentQuestionIndex: number;
  questions: Question[];
  answers: Answer[];
  introAnswer: string;
  currentAnswer: string;
  introHeading: string;
  interviewId: string;
  totalQuestions: number;
} | null => {
  try {
    const saved = localStorage.getItem(INTERVIEW_STATE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading interview state:', error);
  }
  return null;
};

const clearInterviewState = () => {
  try {
    localStorage.removeItem(INTERVIEW_STATE_KEY);
  } catch (error) {
    console.error('Error clearing interview state:', error);
  }
};

export default function InterviewPage() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 means intro section
  const [introAnswer, setIntroAnswer] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [interviewId, setInterviewId] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [introHeading, setIntroHeading] = useState(() => {
    // Only try to load saved heading on client side
    if (typeof window !== 'undefined') {
      const saved = loadInterviewState();
      return saved?.introHeading || getRandomIntroHeading();
    }
    return getRandomIntroHeading();
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Try to load saved interview state first
    const savedState = loadInterviewState();
    
    if (savedState) {
      // Restore from saved state
      setConfig(savedState.config);
      setQuestions(savedState.questions);
      setAnswers(savedState.answers);
      setCurrentQuestionIndex(savedState.currentQuestionIndex);
      setIntroAnswer(savedState.introAnswer);
      setCurrentAnswer(savedState.currentAnswer);
      setIntroHeading(savedState.introHeading);
      setInterviewId(savedState.interviewId);
      setTotalQuestions(savedState.totalQuestions);
      setIsLoading(false);
    } else {
      // Load config and initial interview data from localStorage
      const savedConfig = localStorage.getItem('interviewConfig');
      const savedInit = localStorage.getItem('interviewInit');
      if (!savedConfig || !savedInit) {
        router.push('/configure');
        return;
      }

      const interviewConfig: InterviewConfig = JSON.parse(savedConfig);
      const { interviewId: id, totalQuestions: total, firstQuestion } = JSON.parse(savedInit) as {
        interviewId: string;
        totalQuestions: number;
        firstQuestion: {
          question_number: number;
          question: string;
          difficulty: 'easy' | 'medium' | 'hard';
          topic: string;
        };
      };

      const mappedQuestion: Question = {
        id: `q-${firstQuestion.question_number}`,
        question: firstQuestion.question,
        type: 'technical',
        questionNumber: firstQuestion.question_number,
        topic: firstQuestion.topic,
        difficulty: firstQuestion.difficulty,
      };

      setInterviewId(id);
      setTotalQuestions(total);
      setConfig(interviewConfig);
      setQuestions([mappedQuestion]);
      setIsLoading(false);
    }
  }, [isAuthenticated, router]);

  // Helper function to save state
  const saveState = useCallback(() => {
    if (config && questions.length > 0) {
      saveInterviewState({
        config,
        currentQuestionIndex,
        questions,
        answers,
        introAnswer,
        currentAnswer,
        introHeading,
        interviewId,
        totalQuestions,
      });
    }
  }, [config, currentQuestionIndex, questions, answers, introAnswer, currentAnswer, introHeading, interviewId, totalQuestions]);

  // Save state whenever key values change
  useEffect(() => {
    saveState();
  }, [saveState]);

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
    const newAnswers = [introAnswerObj];
    setAnswers(newAnswers);
    setCurrentQuestionIndex(0);
    setCurrentAnswer(''); // Clear current answer for next question
  };

  const handleQuestionSubmit = async () => {
    if (!currentAnswer.trim()) {
      alert('Please provide an answer');
      return;
    }

    if (!interviewId) {
      alert('Interview session missing. Please restart from Configure.');
      router.push('/configure');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setIsSubmitting(true);
    const answerObj: Answer = {
      questionId: currentQuestion.id,
      answer: currentAnswer,
      timestamp: Date.now(),
    };
    const newAnswers = [...answers, answerObj];

    try {
      const response = await answerQuestion({
        interviewId,
        answer: currentAnswer,
        questionNumber: currentQuestion.questionNumber || currentQuestionIndex + 1,
      });

      setAnswers(newAnswers);
      setCurrentAnswer('');

      if (response.is_complete) {
        setShowSuccessToast(true);
        localStorage.removeItem('interviewConfig');
        localStorage.removeItem('interviewInit');
        clearInterviewState();

        setTimeout(() => {
          logout();
          router.push('/');
        }, 2000);
      } else if (response.next_question) {
        const nextQuestion: Question = {
          id: `q-${response.next_question.question_number}`,
          question: response.next_question.question,
          type: 'technical',
          questionNumber: response.next_question.question_number,
          topic: response.next_question.topic,
          difficulty: response.next_question.difficulty,
        };
        setQuestions((prev) => [...prev, nextQuestion]);
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
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

  const isIntroSection = currentQuestionIndex === -1;
  const currentQuestion = currentQuestionIndex >= 0 ? questions[currentQuestionIndex] : null;
  const isLastQuestion =
    (currentQuestion?.questionNumber || 0) === totalQuestions ||
    currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-600">AI Interview</h1>
            <div className="text-sm text-gray-600">
              {isIntroSection
                ? 'Introduction'
                : `Question ${currentQuestion?.questionNumber || currentQuestionIndex + 1} of ${totalQuestions}`}
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
                  <Button
                    onClick={handleQuestionSubmit}
                    size="lg"
                    isLoading={isSubmitting}
                  >
                    {isLastQuestion ? 'Submit Interview' : 'Submit & Next'}
                  </Button>
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

