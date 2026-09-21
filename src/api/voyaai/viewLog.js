import request from '@/utils/request'

const url = '/voyaai/viewLog'
export const viewLogApi = {
  list: params => request({ url: `${url}/list`, method: 'get', params }),
  detail: id => request({ url: `${url}/${id}`, method: 'get' })
}