import request from '@/utils/request'

const url = '/voyaai/guide'
export const guideApi = {
  list: params => request({ url: `${url}/list`, method: 'get', params }),
  detail: id => request({ url: `${url}/${id}`, method: 'get' }),
  create: data => request({ url, method: 'post', data }),
  update: data => request({ url, method: 'put', data }),
  changeStatus: data => request({ url: `${url}/changeStatus`, method: 'put', data }),
  remove: ids => request({ url: `${url}/${ids.join(',')}`, method: 'delete' }),
  cities: () => request({ url: '/app/voyaai/cities', headers: { isToken: false } }),
  tags: () => request({ url: '/app/voyaai/tags', params: { type: 'guide' }, headers: { isToken: false } })
}
