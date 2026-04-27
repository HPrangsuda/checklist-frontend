import type { RegisterDTO } from "@/types/register";

const API_BASE_URL = '/api';

export const registerAPI = {
  create: async (data: RegisterDTO) => {
    const response = await fetch(`${API_BASE_URL}/registers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  getAll: async (keyword = '', page = 0, size = 10) => {
    const response = await fetch(
      `${API_BASE_URL}/registers?keyword=${keyword}&page=${page}&size=${size}`
    );
    return response.json();
  },

  update: async (id: number, data: RegisterDTO) => {
    const response = await fetch(`${API_BASE_URL}/registers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  delete: async (ids: number[]) => {
    const response = await fetch(`${API_BASE_URL}/registers`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ids),
    });
    return response.json();
  },
};