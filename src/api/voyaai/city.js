import request from '@/utils/request'

export const listCity = query => request({ url: '/voyaai/city/list', method: 'get', params: query })
export const getCity = id => request({ url: `/voyaai/city/${id}`, method: 'get' })
export const addCity = data => request({ url: '/voyaai/city', method: 'post', data })
export const updateCity = data => request({ url: '/voyaai/city', method: 'put', data })
export const delCity = ids => request({ url: `/voyaai/city/${ids}`, method: 'delete' })
export const changeCityStatus = data => request({ url: '/voyaai/city/changeStatus', method: 'put', data })
