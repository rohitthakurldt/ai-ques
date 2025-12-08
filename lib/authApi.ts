'use client';

const AUTH_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://interview-ai-one-bay.vercel.app';

export interface RegisterPayload {
  email: string;
  password: string;
  is_active?: boolean;
  is_superuser?: boolean;
  is_verified?: boolean;
}

export interface RegisterResponse {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  error?: string;
}

export async function registerUser(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${AUTH_API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_active: true,
        is_superuser: false,
        is_verified: false,
        ...payload,
      }),
    });

    const data = await safeParseJson(response);

    if (!response.ok) {
      const parsedMessage = parseRegisterError(data);
      throw new Error(parsedMessage || 'Registration failed. Please try again.');
    }

    return data as RegisterResponse;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected error during registration.';
    throw new Error(message);
  }
}

export async function loginUser(
  username: string,
  password: string
): Promise<LoginResult> {
  try {
    const body = new URLSearchParams({
      username,
      password,
    });

    const response = await fetch(`${AUTH_API_BASE_URL}/auth/jwt/login`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await safeParseJson(response);

    if (!response.ok) {
      const parsedMessage = parseLoginError(data);
      return { success: false, error: parsedMessage || 'Login failed.' };
    }

    const token = (data as LoginResponse)?.access_token;
    if (!token) {
      return { success: false, error: 'Invalid login response.' };
    }

    return { success: true, token };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error during login.';
    return { success: false, error: message };
  }
}

function parseRegisterError(data: any): string | null {
  if (!data) return null;

  // FastAPI validation array
  if (Array.isArray(data.detail) && data.detail[0]?.msg) {
    return data.detail[0].msg;
  }

  // Structured object with reason
  if (data.detail?.reason) return data.detail.reason;
  if (data.detail?.code) return data.detail.code;

  if (typeof data.detail === 'string') return data.detail;

  return null;
}

function parseLoginError(data: any): string | null {
  if (!data) return null;
  if (Array.isArray(data.detail) && data.detail[0]?.msg) {
    return data.detail[0].msg;
  }
  if (data.detail?.reason) return data.detail.reason;
  if (data.detail?.code) return data.detail.code;
  if (typeof data.detail === 'string') return data.detail;
  return null;
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}


