import { api } from '@/core/interceptor/api.interceptor'

export interface FileUploadResponse {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy?: string
}

export const fileUploadService = {
  uploadFile: async (file: File, uploadedBy?: string): Promise<FileUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    if (uploadedBy) {
      formData.append('uploadedBy', uploadedBy)
    }

    const response = await api.post<{ data: FileUploadResponse }>(
      '/api/files/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    return response.data
  },

  uploadMultipleFiles: async (
    files: File[],
    uploadedBy?: string
  ): Promise<FileUploadResponse[]> => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })
    if (uploadedBy) {
      formData.append('uploadedBy', uploadedBy)
    }

    const response = await api.post<{ data: FileUploadResponse[] }>(
      '/api/files/upload/multiple',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    return response.data
  },

  downloadFile: (fileName: string): string => {
    return `${api.defaults.baseURL}/api/files/download/${fileName}`
  },

  deleteFile: async (fileName: string): Promise<void> => {
    await api.delete(`/api/files/delete/${fileName}`)
  },
}