
import apiClient from './client'

export interface ReportCreateRequest {
  notebook_id: string
  title: string
  description?: string
  config?: Record<string, unknown>
}

export interface ReportUpdateRequest {
  title?: string
  description?: string
  status?: 'draft' | 'collecting' | 'analyzing' | 'generating' | 'review' | 'completed' | 'failed'
  config?: Record<string, unknown>
}

export interface ReportResponse {
  id: string
  notebook_id: string
  title: string
  description: string
  status: string
  config: Record<string, unknown>
  current_version: number
  created: string
  updated: string
}

export const reportsApi = {
  create: async (data: ReportCreateRequest) => {
    const response = await apiClient.post<ReportResponse>('/reports', data)
    return response.data
  },

  list: async (notebookId: string) => {
    const response = await apiClient.get<ReportResponse[]>(
      `/notebooks/${notebookId}/reports`
    )
    return response.data
  },

  get: async (reportId: string) => {
    const response = await apiClient.get<ReportResponse>(
      `/reports/${reportId}`
    )
    return response.data
  },

  update: async (reportId: string, data: ReportUpdateRequest) => {
    const response = await apiClient.put<ReportResponse>(
      `/reports/${reportId}`,
      data
    )
    return response.data
  },

  delete: async (reportId: string) => {
    const response = await apiClient.delete(`/reports/${reportId}`)
    return response.data
  },
}
