import type { AuthUser } from "./auth";

const API_BASE_URL = "http://127.0.0.1:5000";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export type GroupMember = AuthUser & {
  is_paid: number | null;
  amount: number | null;
  paid_at: number | null;
};

export type GroupOwner = AuthUser | null;

export type Group = {
  id: number;
  title: string;
  description: string;
  total_amount: number;
  count: number;
  owner_id: number | null;
  owner: GroupOwner;
  user_count: number;
  users: GroupMember[];
};

export type UserDetailsResponse = {
  user: AuthUser;
  groups: Array<{
    id: number;
    title: string;
    description: string;
    total_amount: number;
    count: number;
    owner_id: number | null;
    owner: GroupOwner;
    is_paid: number | null;
    amount: number | null;
    paid_at: number | null;
  }>;
};

export type UsersResponse = {
  users: AuthUser[];
};

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as ApiErrorPayload & T;

  if (!response.ok) {
    throw new Error(data.error || data.message || "Something went wrong");
  }

  return data;
}

async function apiRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  return parseResponse<T>(response);
}

export function getUserDetails(userId: number) {
  return apiRequest<UserDetailsResponse>(`/users/${userId}/details`);
}

export function getAllGroups() {
  return apiRequest<{ groups: Group[] }>("/groups/details");
}

export function createGroup(payload: {
  title: string;
  description: string;
  total_amount: number;
  count: number;
  owner_id: number;
}) {
  return apiRequest<{ message: string; group: Group }>("/groups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateGroup(
  groupId: number,
  payload: {
    requester_id: number;
    title: string;
    description: string;
    total_amount: number;
    count: number;
  },
) {
  return apiRequest<{ message: string; group: Group }>(`/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function inviteToGroup(
  groupId: number,
  payload: {
    requester_id: number;
    invitee_id?: number;
    identifier?: string;
  },
) {
  return apiRequest<{ message: string; group: Group; invited_user: AuthUser }>(
    `/groups/${groupId}/invite`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function markPayment(
  groupId: number,
  payload: {
    requester_id: number;
    user_id?: number;
    is_paid?: boolean;
  },
) {
  return apiRequest<{ message: string; group: Group }>(`/groups/${groupId}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function searchUsers(query: string) {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }
  params.set("limit", "8");

  return apiRequest<UsersResponse>(`/users?${params.toString()}`);
}
