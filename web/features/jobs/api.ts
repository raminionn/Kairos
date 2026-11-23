import type { Job, JobKind, Output } from "@/lib/api-types";

/** The fake API in app/api/mock until NEXT_PUBLIC_API_URL points at the real one. */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/mock";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: "no-store", ...init });
  } catch {
    throw new ApiError("Can't reach the server.", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(typeof body?.detail === "string" ? body.detail : `Request failed (${res.status}).`, res.status);
  return body as T;
}

export const listJobs = () => request<Job[]>("/jobs");
export const getOutputs = (id: string) => request<Output[]>(`/jobs/${encodeURIComponent(id)}/outputs`);
export const createJob = (kind: JobKind, form: FormData) => request<Job>(`/jobs/${kind}`, { method: "POST", body: form });

/** Output URLs are API paths like /files/<job>/<path>; empty means "no file". */
export const fileUrl = (url: string) => (url.startsWith("/") ? `${API_BASE}${url}` : url);
