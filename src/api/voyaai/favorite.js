import request from '@/utils/request'

const url = '/voyaai/favorite'
export const favoriteApi = {
  list: params => request({ url: `${url}/list`, method: 'get', params }),
  detail: id => request({ url: `${url}/${id}`, method: 'get' }),
  remove: ids => request({ url: `${url}/${ids.join(',')}`, method: 'delete' })
}