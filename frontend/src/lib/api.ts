import type { HistoryItem, Marker, PaginatedHistory } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface AnalyzeResponse {
  status: string;
  analysis_id?: string;
  report_type?: string;
  diagnostic_center?: string;
  query: string;
  analysis: string;
  agents: {
    medical: string;
    verification: string;
    nutrition: string;
    exercise: string;
  };
  markers: Marker[];
  file_processed: string;
}

async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  return res.blob();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ name: string; email: string }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ status: string }>("/auth/logout", { method: "POST" }),
  me: () => request<{ name: string; email: string }>("/auth/me"),
  history: (params?: { page?: number; pageSize?: number; search?: string; reportType?: string }) => {
    const queryParts: string[] = [];
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.pageSize) queryParts.push(`page_size=${params.pageSize}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.reportType) queryParts.push(`report_type=${encodeURIComponent(params.reportType)}`);
    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return request<PaginatedHistory>(`/history${queryString}`);
  },
  profile: () => request<import("./types").HealthProfile>("/profile"),
  updateProfile: (profile: Partial<import("./types").HealthProfile>) =>
    request<import("./types").HealthProfile>("/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    }),
  exportData: () => requestBlob("/settings/export"),
  deleteAccount: () => request<{ status: string }>("/settings/account", { method: "DELETE" }),
  submitSupportRequest: (data: { subject: string; message: string }) =>
    request<{ status: string; request_id?: string }>("/support/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  getChatHistory: (reportId: string) =>
    request<{ report_id: string; messages: import("./types").ChatMessage[] }>(`/reports/${encodeURIComponent(reportId)}/chat`),
  getReportChat: (reportId: string) =>
    request<{ report_id: string; messages: import("./types").ChatMessage[] }>(`/reports/${encodeURIComponent(reportId)}/chat`),
  sendChatMessage: (reportId: string, message: string) =>
    request<{ report_id: string; user_message: string; reply: string; timestamp: string }>(
      `/reports/${encodeURIComponent(reportId)}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }
    ),
  sendReportChatMessage: (reportId: string, message: string) =>
    request<{ reply: string }>(
      `/reports/${encodeURIComponent(reportId)}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }
    ),


  analyze: (file: File, query: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("query", query);
    return request<AnalyzeResponse>("/analyze", { method: "POST", body: form });
  },
};




