import request from '@/utils/request'

export const tagApi = {
  list: params => request({ url: '/voyaai/tag/list', params }),

  detail: id => request({ url: `/voyaai/tag/${id}` }),

  add: data => request({ url: '/voyaai/tag', method: 'post', data }),

  update: data => request({ url: '/voyaai/tag', method: 'put', data }),

  changeStatus: data => request({ url: '/voyaai/tag/changeStatus', method: 'put', data }),

  remove: ids => request({ url: `/voyaai/tag/${ids.join(',')}`, method: 'delete' })
}