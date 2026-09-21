import request from '@/utils/request'

export const userApi = {
  list: params => request({ url: '/voyaai/user/list', params }),

  detail: id => request({ url: `/voyaai/user/${id}` })
}