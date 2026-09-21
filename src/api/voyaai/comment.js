import request from '@/utils/request'

export const commentApi = {
  list: params => request({ url: '/voyaai/comment/list', params }),

  detail: id => request({ url: `/voyaai/comment/${id}` }),

  remove: ids => request({ url: `/voyaai/comment/${ids.join(',')}`, method: 'delete' })
}