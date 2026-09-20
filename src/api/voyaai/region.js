import request from '@/utils/request'

function regionApi(name) {
  const url = `/voyaai/${name}`
  return {
    list: params => request({ url: `${url}/list`, method: 'get', params }),
    detail: id => request({ url: `${url}/${id}`, method: 'get' }),
    create: data => request({ url, method: 'post', data }),
    update: data => request({ url, method: 'put', data }),
    remove: ids => request({ url: `${url}/${ids.join(',')}`, method: 'delete' }),
    changeStatus: data => request({ url: `${url}/changeStatus`, method: 'put', data })
  }
}

export const regionApis = {
  country: regionApi('country'),
  province: regionApi('province'),
  city: regionApi('city')
}

export const countryOptions = (enabledOnly = true) => request({
  url: '/voyaai/country/options', method: 'get', params: { enabledOnly }
})

export const provinceOptions = (countryId, enabledOnly = true) => request({
  url: '/voyaai/province/options', method: 'get', params: { countryId, enabledOnly }
})
