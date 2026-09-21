import request from '@/utils/request'

export const tripApi = {
  list: params => request({ url: '/voyaai/trip/list', params }),

  detail: id => request({ url: `/voyaai/trip/${id}` })
}