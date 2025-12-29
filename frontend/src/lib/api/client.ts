export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string
  ) {
    super(message || `${status} ${statusText}`);
    this.name = "ApiError";
  }
}

interface ApiClientOptions extends RequestInit {
  accessToken?: string;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  // サーバーサイド（Server Actions）では API_URL を優先
  // クライアントサイドでは NEXT_PUBLIC_API_URL を使用
  const baseUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";
  const { accessToken, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(accessToken && {
      Authorization: `Bearer ${accessToken}`,
    }),
    ...options.headers,
  };

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}
