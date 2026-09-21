import request from '@/utils/request'

export const feedbackApi = {
  list: params => request({ url: '/voyaai/feedback/list', params }),

  detail: id => request({ url: `/voyaai/feedback/${id}` }),

  handle: (id, data) => request({ url: `/voyaai/feedback/${id}/handle`, method: 'put', data }),

  export: params => request({ url: '/voyaai/feedback/export', params, responseType: 'blob' })
}