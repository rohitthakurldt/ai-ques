import {
  InterviewConfig,
  Question,
  Answer,
  InterviewStartResponse,
  AnswerQuestionResponse,
  InterviewReport,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchQuestions(config: InterviewConfig): Promise<Question[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch questions');
    }

    const data = await response.json();
    return data.questions || [];
  } catch (error) {
    console.error('Error fetching questions:', error);
    // Return dummy questions for development
    return generateDummyQuestions(config);
  }
}

export async function submitAnswer(questionId: string, answer: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ questionId, answer }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit answer');
    }
  } catch (error) {
    console.error('Error submitting answer:', error);
  }
}

export async function submitInterview(answers: Answer[]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/interview/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answers }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit interview');
    }
  } catch (error) {
    console.error('Error submitting interview:', error);
  }
}

export async function startInterview(config: InterviewConfig): Promise<InterviewStartResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/interview/start`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        experience_years: config.yearsOfExperience,
        subject: config.subject,
        difficulty: config.difficulty,
        num_questions: config.numberOfQuestions,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start interview');
    }

    const data = await response.json();
    return data.data as InterviewStartResponse;
  } catch (error) {
    console.error('Error starting interview:', error);
    throw error;
  }
}

export async function answerQuestion(params: {
  interviewId: string;
  answer: string;
  questionNumber: number;
}): Promise<AnswerQuestionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/interview/answer`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interview_id: params.interviewId,
        answer: params.answer,
        question_number: params.questionNumber,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit answer');
    }

    const data = await response.json();
    return data.data as AnswerQuestionResponse;
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
}

export async function fetchInterviewReport(interviewId: string): Promise<InterviewReport> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/interview/report/${interviewId}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch interview report');
    }

    const data = await response.json();
    return data.data as InterviewReport;
  } catch (error) {
    console.error('Error fetching interview report:', error);
    throw error;
  }
}

export async function transcribeSpeech(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'answer.webm');
  formData.append('language', '');
  formData.append('prompt', '');

  const response = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
    method: 'POST',
    body: formData,
    // headers: {
    //   'Content-Type': 'multipart/form-data',
    // },
  });

  if (!response.ok) {
    throw new Error('Failed to transcribe audio');
  }

  const data: { text?: string; transcript?: string } = await response.json();
  const text = data.text || data.transcript;
  if (!text) {
    throw new Error('No transcript returned');
  }

  return text;
}

function generateDummyQuestions(config: InterviewConfig): Question[] {
  const questions: Question[] = [];
  const questionTemplates: Record<string, string[]> = {
    javascript: [
      'What is the difference between let, const, and var?',
      'Explain closures in JavaScript.',
      'What is the event loop?',
      'How does async/await work?',
      'What are promises?',
    ],
    python: [
      'What are Python decorators?',
      'Explain list comprehensions.',
      'What is the difference between lists and tuples?',
      'How does garbage collection work in Python?',
      'What are generators?',
    ],
    java: [
      'What is the difference between ArrayList and LinkedList?',
      'Explain the concept of inheritance.',
      'What are interfaces in Java?',
      'How does garbage collection work?',
      'What is the difference between == and equals()?',
    ],
    'system design': [
      'How would you design a URL shortener?',
      'Explain how you would design a chat system.',
      'How would you design a distributed cache?',
      'What is load balancing?',
      'Explain database sharding.',
    ],
    dsa: [
      'Explain time complexity of quicksort.',
      'What is the difference between BFS and DFS?',
      'How does a hash table work?',
      'Explain dynamic programming.',
      'What is a binary search tree?',
    ],
  };

  const templates = questionTemplates[config.subject.toLowerCase()] || questionTemplates.javascript;
  
  for (let i = 0; i < config.numberOfQuestions; i++) {
    questions.push({
      id: `q-${i + 1}`,
      question: templates[i % templates.length] || `Question ${i + 1} about ${config.subject}`,
      type: 'technical',
    });
  }

  return questions;
}

