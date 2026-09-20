import request from '@/utils/request'

const url = '/voyaai/attraction'
export const attractionApi = {
  list: params => request({ url: `${url}/list`, method: 'get', params }),
  detail: id => request({ url: `${url}/${id}`, method: 'get' }),
  create: data => request({ url, method: 'post', data }),
  update: data => request({ url, method: 'put', data }),
  remove: ids => request({ url: `${url}/${ids.join(',')}`, method: 'delete' }),
  changeStatus: data => request({ url: `${url}/changeStatus`, method: 'put', data })
}
export const cityOptions = provinceId => request({ url: `${url}/cityOptions`, method: 'get', params: { provinceId } })
