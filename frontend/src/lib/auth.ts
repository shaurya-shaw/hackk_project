const API_BASE_URL = "http://127.0.0.1:5000";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export type SignupPayload = {
  name: string;
  username: string;
  email: string;
  password: string;
};

export type AuthUser = {
  id: number;
  email: string;
  username: string;
  name: string;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  user: AuthUser;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as ApiErrorPayload & T;

  if (!response.ok) {
    throw new Error(data.error || data.message || "Something went wrong");
  }

  return data;
}

export async function signup(payload: SignupPayload) {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ message: string }>(response);
}

export async function login(payload: LoginPayload) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<LoginResponse>(response);
}

export function saveAuthenticatedUser(user: AuthUser) {
  localStorage.setItem("auth-user", JSON.stringify(user));
}

export function getAuthenticatedUser() {
  const rawUser = localStorage.getItem("auth-user");
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem("auth-user");
    return null;
  }
}

export function clearAuthenticatedUser() {
  localStorage.removeItem("auth-user");
}
