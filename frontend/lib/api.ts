const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('flex_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      return { success: false, message: `Server error (${response.status})` };
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('flex_token');
        localStorage.removeItem('flex_user');
        // Only redirect to login from protected pages, not public ones
        if (typeof window !== 'undefined') {
          const publicPaths = ['/', '/buyer/browse', '/buyer/product', '/cart', '/login', '/register', '/verify-otp'];
          const isPublic = publicPaths.some(p => window.location.pathname === p || window.location.pathname.startsWith('/buyer/product/'));
          if (!isPublic) {
            window.location.href = '/login';
          }
        }
      } else if (response.status === 403 && data.message?.toLowerCase().includes('blocked')) {
        // Update user status in localStorage if blocked
        if (typeof window !== 'undefined') {
          const savedUser = localStorage.getItem('flex_user');
          if (savedUser) {
            const user = JSON.parse(savedUser);
            user.is_blocked = 1;
            localStorage.setItem('flex_user', JSON.stringify(user));
            // Trigger a page reload to show the block overlay from GeolocationBlocker
            window.location.reload();
          }
        }
      }
      return {
        success: false,
        message: data.message || 'Something went wrong',
        errors: data.errors,
      };
    }

    return data;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      return { success: false, message: `Upload failed (${response.status})` };
    }
    if (!response.ok) {
      return { success: false, message: data.message || 'Upload failed', errors: data.errors };
    }
    return data;
  }
}

export const api = new ApiClient(API_BASE);
export type { ApiResponse };
