const API_BASE_URL = '/api';

// Types for API responses
export interface ApiError {
  success: false;
  code: string;
  message: string;
}

export interface ApiSuccess<T = void> {
  success: true;
  code: string;
  message: string;
  data?: T;
}

export type ApiResponse<T = void> = ApiSuccess<T> | ApiError;

// Custom error class
export class ApiException extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

// Helper function to handle response
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  
  // Check if response is JSON
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new ApiException(
        data.code || 'UNKNOWN_ERROR',
        data.message || 'An error occurred',
        response.status
      );
    }
    
    return data;
  }
  
  // For non-JSON responses
  if (!response.ok) {
    const text = await response.text();
    throw new ApiException(
      'HTTP_ERROR',
      text || `HTTP Error: ${response.status}`,
      response.status
    );
  }
  
  return {} as T;
}

// Helper to build query string
function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, String(value));
    }
  });
  
  return query.toString();
}

// Main API object
export const api = {
  /**
   * GET request
   */
  get: async <T>(
    url: string,
    params?: Record<string, any>,
    options?: RequestInit
  ): Promise<T> => {
    const queryString = params ? `?${buildQueryString(params)}` : '';
    const fullUrl = `${API_BASE_URL}${url}${queryString}`;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    
    return handleResponse<T>(response);
  },

  /**
   * POST request
   */
  post: async <T>(
    url: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> => {
    const fullUrl = `${API_BASE_URL}${url}`;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    
    return handleResponse<T>(response);
  },

  /**
   * PUT request
   */
  put: async <T>(
    url: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> => {
    const fullUrl = `${API_BASE_URL}${url}`;
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    
    return handleResponse<T>(response);
  },

  /**
   * PATCH request
   */
  patch: async <T>(
    url: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> => {
    const fullUrl = `${API_BASE_URL}${url}`;
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    
    return handleResponse<T>(response);
  },

  /**
   * DELETE request
   */
  delete: async <T>(
    url: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> => {
    const fullUrl = `${API_BASE_URL}${url}`;
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    
    return handleResponse<T>(response);
  },

  /**
   * Upload file (multipart/form-data)
   */
  upload: async <T>(
    url: string,
    formData: FormData,
    options?: RequestInit
  ): Promise<T> => {
    const fullUrl = `${API_BASE_URL}${url}`;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      body: formData,
      ...options,
      // Don't set Content-Type header - browser will set it automatically with boundary
    });
    
    return handleResponse<T>(response);
  },

  /**
   * Download file
   */
  download: async (
    url: string,
    filename?: string,
    options?: RequestInit
  ): Promise<void> => {
    const fullUrl = `${API_BASE_URL}${url}`;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      ...options,
    });
    
    if (!response.ok) {
      throw new ApiException(
        'DOWNLOAD_ERROR',
        'Failed to download file',
        response.status
      );
    }
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },
};

// Export default for convenience
export default api;