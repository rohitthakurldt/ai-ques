"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { SpeechButton } from "@/components/ui/SpeechButton";
import { SpeechToText } from "@/components/ui/SpeechToText";
import { Toast } from "@/components/ui/Toast";
import { InterviewConfig, Question, Answer, InterviewReport } from "@/types";
import { answerQuestion, fetchInterviewReport } from "@/lib/api";
import { getRandomIntroHeading } from "@/lib/utils";

const INTERVIEW_STATE_KEY = "interviewState";

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
    console.error("Error saving interview state:", error);
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
    console.error("Error loading interview state:", error);
  }
  return null;
};

const clearInterviewState = () => {
  try {
    localStorage.removeItem(INTERVIEW_STATE_KEY);
  } catch (error) {
    console.error("Error clearing interview state:", error);
  }
};

export default function InterviewPage() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 means intro section
  const [introAnswer, setIntroAnswer] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [interviewId, setInterviewId] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [reportPage, setReportPage] = useState(0);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [introHeading, setIntroHeading] = useState(() => {
    // Only try to load saved heading on client side
    if (typeof window !== "undefined") {
      const saved = loadInterviewState();
      return saved?.introHeading || getRandomIntroHeading();
    }
    return getRandomIntroHeading();
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const savedReport = localStorage.getItem("interviewReport");

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
      if (savedReport) {
        try {
          setReport(JSON.parse(savedReport));
        } catch (err) {
          console.error("Failed to parse saved report", err);
        }
      }
      setIsLoading(false);
    } else {
      // Load config and initial interview data from localStorage
      const savedConfig = localStorage.getItem("interviewConfig");
      const savedInit = localStorage.getItem("interviewInit");
      if (!savedConfig || !savedInit) {
        router.push("/configure");
        return;
      }

      const interviewConfig: InterviewConfig = JSON.parse(savedConfig);
      const {
        interviewId: id,
        totalQuestions: total,
        firstQuestion,
      } = JSON.parse(savedInit) as {
        interviewId: string;
        totalQuestions: number;
        firstQuestion: {
          question_number: number;
          question: string;
          difficulty: "easy" | "medium" | "hard";
          topic: string;
        };
      };

      const mappedQuestion: Question = {
        id: `q-${firstQuestion.question_number}`,
        question: firstQuestion.question,
        type: "technical",
        questionNumber: firstQuestion.question_number,
        topic: firstQuestion.topic,
        difficulty: firstQuestion.difficulty,
      };

      setInterviewId(id);
      setTotalQuestions(total);
      setConfig(interviewConfig);
      setQuestions([mappedQuestion]);
      if (savedReport) {
        try {
          setReport(JSON.parse(savedReport));
        } catch (err) {
          console.error("Failed to parse saved report", err);
        }
      }
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
  }, [
    config,
    currentQuestionIndex,
    questions,
    answers,
    introAnswer,
    currentAnswer,
    introHeading,
    interviewId,
    totalQuestions,
  ]);

  // Save state whenever key values change
  useEffect(() => {
    saveState();
  }, [saveState]);

  const handleIntroSubmit = () => {
    if (!introAnswer.trim()) {
      alert("Please provide your introduction");
      return;
    }

    // Save intro answer
    const introAnswerObj: Answer = {
      questionId: "intro",
      answer: introAnswer,
      timestamp: Date.now(),
    };
    const newAnswers = [introAnswerObj];
    setAnswers(newAnswers);
    setCurrentQuestionIndex(0);
    setCurrentAnswer(""); // Clear current answer for next question
  };

  const handleQuestionSubmit = async () => {
    if (!currentAnswer.trim()) {
      alert("Please provide an answer");
      return;
    }

    if (!interviewId) {
      alert("Interview session missing. Please restart from Configure.");
      router.push("/configure");
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
        questionNumber:
          currentQuestion.questionNumber || currentQuestionIndex + 1,
      });

      setAnswers(newAnswers);
      setCurrentAnswer("");

      if (response.is_complete) {
        setShowSuccessToast(true);
        setIsReportLoading(true);
        try {
          const fetchedReport = await fetchInterviewReport(interviewId);
          setReport(fetchedReport);
          localStorage.setItem(
            "interviewReport",
            JSON.stringify(fetchedReport)
          );
        } catch (err) {
          console.error("Failed to load interview report:", err);
          alert(
            "Interview finished, but we could not load the report. Please try again."
          );
        } finally {
          setIsReportLoading(false);
        }
      } else if (response.next_question) {
        const nextQuestion: Question = {
          id: `q-${response.next_question.question_number}`,
          question: response.next_question.question,
          type: "technical",
          questionNumber: response.next_question.question_number,
          topic: response.next_question.topic,
          difficulty: response.next_question.difficulty,
        };
        setQuestions((prev) => [...prev, nextQuestion]);
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      alert("Failed to submit answer. Please try again.");
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
  const currentQuestion =
    currentQuestionIndex >= 0 ? questions[currentQuestionIndex] : null;
  const isLastQuestion =
    (currentQuestion?.questionNumber || 0) === totalQuestions ||
    currentQuestionIndex === questions.length - 1;
  const hasReport = Boolean(report);
  const breakdownItem = hasReport
    ? report!.question_wise_breakdown[reportPage] ||
      report!.question_wise_breakdown[0]
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left */}
            <h1 className="text-2xl font-bold text-blue-600">AI Interview</h1>

            {/* Right */}
            <div className="flex items-center gap-6">
              <div className="text-sm text-gray-600">
                {hasReport
                  ? "Interview Report"
                  : isIntroSection
                  ? "Introduction"
                  : `Question ${
                      currentQuestion?.questionNumber ||
                      currentQuestionIndex + 1
                    } of ${totalQuestions}`}
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="text-sm font-medium text-red-500 hover:text-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          {isReportLoading ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Generating your report...</p>
            </div>
          ) : hasReport && report ? (
            <div className="space-y-8">
              <div className="flex items-start justify-between">
                <h2 className="text-3xl font-bold text-gray-900">
                  Interview Summary
                </h2>
                <div className="text-sm text-gray-500">
                  ID: {report.interview_id}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-500">Overall Score</p>
                  <p className="text-2xl font-semibold text-blue-600">
                    {report.overall_score}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-500">Total Questions</p>
                  <p className="text-2xl font-semibold">
                    {report.total_questions}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-500">Experience (years)</p>
                  <p className="text-2xl font-semibold">
                    {report.experience_years}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-500">Subject</p>
                  <p className="text-2xl font-semibold capitalize">
                    {report.subject}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  Detailed Feedback
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {report.detailed_feedback}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Weak Areas
                  </h3>
                  {report.weak_areas.length === 0 ? (
                    <p className="text-gray-600">No weak areas reported.</p>
                  ) : (
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {report.weak_areas.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Recommendations
                  </h3>
                  {report.recommendations.length === 0 ? (
                    <p className="text-gray-600">
                      No recommendations provided.
                    </p>
                  ) : (
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {report.recommendations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">Hire Recommendation</p>
                <p className="text-lg font-semibold text-gray-900">
                  {report.hire_recommendation}
                </p>
              </div>

              {breakdownItem && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Question Status
                    </h3>
                    <div className="text-sm text-gray-600">
                      Question {reportPage + 1} of{" "}
                      {report.question_wise_breakdown.length}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        Question #{breakdownItem.question_number}
                      </div>
                      <div className="text-sm px-2 py-1 rounded bg-blue-50 text-blue-700 capitalize">
                        {breakdownItem.difficulty}
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {breakdownItem.question}
                    </p>
                    <p className="text-sm text-gray-600">
                      Topic: {breakdownItem.topic}
                    </p>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        Your Answer (summary)
                      </p>
                      <p className="text-gray-800 whitespace-pre-line">
                        {breakdownItem.answer_summary}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Score</p>
                      <p className="text-gray-900 font-semibold">
                        {breakdownItem.score}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Feedback</p>
                      <p className="text-gray-800 whitespace-pre-line">
                        {breakdownItem.feedback}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setReportPage((prev) => Math.max(0, prev - 1))
                      }
                      disabled={reportPage === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setReportPage((prev) =>
                          Math.min(
                            report.question_wise_breakdown.length - 1,
                            prev + 1
                          )
                        )
                      }
                      disabled={
                        reportPage === report.question_wise_breakdown.length - 1
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : isIntroSection ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {introHeading}
                </h2>
                <SpeechButton text={introHeading} />
              </div>

              <p className="text-gray-600 mb-6">
                Please provide a brief introduction about yourself. You can type
                your answer or use the microphone button to speak.
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
                      onTranscript={(text) =>
                        setIntroAnswer(() => text)
                      }
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
                      onTranscript={(text) =>
                        setCurrentAnswer(() => text)
                      }
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
                    {isLastQuestion ? "Submit Interview" : "Submit & Next"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Toast
        message={
          hasReport
            ? "Interview completed. Report ready!"
            : "Interview submitted successfully!"
        }
        type="success"
        isVisible={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  );
}
