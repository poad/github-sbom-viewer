let csrfToken: string | null = null;

interface CsrfResponse {
  csrfToken: string;
}

export async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }
  
  const response = await fetch('/api/csrf-token');
  const data = await response.json() as CsrfResponse;
  csrfToken = data.csrfToken;
  return csrfToken;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}
