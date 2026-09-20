<template>
  <div class="app-container region-page">
    <div class="page-heading">
      <div><h2>{{ label }}管理</h2><p>{{ headingDescription }}</p></div>
      <el-tag effect="plain">旅游资源</el-tag>
    </div>

    <el-form v-show="showSearch" :model="query" :inline="true" class="search-form">
      <el-form-item :label="`${label}名称`">
        <el-input v-model="query.name" clearable :maxlength="200" placeholder="输入名称搜索" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="国家">
        <el-select v-model="query.countryId" filterable clearable placeholder="全部国家" @change="changeQueryCountry">
          <el-option v-for="item in countries" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="省份">
        <el-select @change="changeQueryProvince" v-model="query.provinceId" filterable clearable :disabled="!query.countryId" placeholder="先选择国家">
          <el-option v-for="item in queryProvinces" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="城市">
        <el-select v-model="query.cityId" filterable clearable :disabled="!query.provinceId" placeholder="先选择省份">
          <el-option v-for="item in queryCities" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部状态">
          <el-option v-for="item in sys_normal_disable" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="创建时间">
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button v-hasPermi="[permission('add')]" type="primary" icon="Plus" @click="openCreate">新增{{ label }}</el-button></el-col>
      <el-col :span="1.5"><el-button v-hasPermi="[permission('remove')]" plain type="danger" icon="Delete" :disabled="!selection.length" @click="remove(selection)">批量删除</el-button></el-col>
      <el-col :span="1.5"><el-button v-hasPermi="[permission('export')]" plain icon="Download" @click="exportAttractions">导出</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>
    <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon class="mb8" />
    <el-table v-loading="loading" :data="rows" row-key="id" @selection-change="selection = $event">
      <el-table-column type="selection" width="48" />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="封面" width="90">
        <template #default="{ row }"><image-preview v-if="row.coverImage" :src="row.coverImage" :width="60" :height="40" /><span v-else>—</span></template>
      </el-table-column>
      <el-table-column prop="name" :label="`${label}名称`" min-width="130" />
      <el-table-column prop="countryName" label="国家" min-width="100" />
      <el-table-column prop="provinceName" label="省份" min-width="100" />
      <el-table-column prop="cityName" label="城市" min-width="100" />
      <el-table-column label="门票（元）" width="110"><template #default="{ row }">{{ money(row.ticketPrice) }}</template></el-table-column>
      <el-table-column prop="rating" label="评分" width="80" />
      <el-table-column prop="viewCount" label="浏览量" width="100" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="状态" width="95"><template #default="{ row }"><el-tag :type="row.status === '0' ? 'success' : 'info'">{{ row.status === '0' ? '上架' : '下架' }}</el-tag></template></el-table-column>
      <el-table-column label="创建时间" width="170"><template #default="{ row }">{{ parseTime(row.createTime) }}</template></el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button v-hasPermi="[permission('query')]" link type="primary" @click="showDetail(row)">查看</el-button>
          <el-button v-hasPermi="[permission('edit')]" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-dropdown v-hasPermi="[permission('edit')]" @command="value => changeStatus(row, value)">
            <el-button link type="primary">状态</el-button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item v-for="item in sys_normal_disable" :key="item.value" :command="item.value" :disabled="row.status === item.value">{{ item.label }}</el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>
          <el-button v-hasPermi="[permission('remove')]" link type="danger" @click="remove([row])">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" :page-sizes="[10, 20, 50, 100]" @pagination="loadList" />

    <el-dialog v-model="dialogOpen" :title="`${form.id ? '编辑' : '新增'}${label}`" width="min(820px, 95vw)" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving" destroy-on-close append-to-body>
      <el-alert v-if="optionError" :title="optionError" type="error" :closable="false" class="mb8" />
      <el-form :disabled="saving || formLoading" ref="formRef" :model="form" :rules="rules" label-width="96px">
        <h3>基本信息</h3>
        <el-form-item prop="name" :label="`${label}名称`"><el-input v-model="form.name" maxlength="200" show-word-limit /></el-form-item>
        <el-form-item prop="countryId" label="国家">
          <el-select v-model="form.countryId" filterable placeholder="请选择国家" @change="changeFormCountry">
            <el-option v-for="item in countries" :key="item.id" :value="item.id" :label="item.name" :disabled="item.status !== '0'" />
          </el-select>
        </el-form-item>
        <el-form-item prop="provinceId" label="省份">
          <el-select @change="changeFormProvince" v-model="form.provinceId" filterable :disabled="!form.countryId || formLoading" :loading="formLoading" placeholder="请选择省份">
            <el-option v-for="item in formProvinces" :key="item.id" :value="item.id" :label="item.name" :disabled="item.status !== '0'" />
          </el-select>
        </el-form-item>
        <el-form-item prop="cityId" label="城市">
          <el-select v-model="form.cityId" filterable :disabled="!form.provinceId || formLoading" placeholder="请选择城市">
            <el-option v-for="item in formCities" :key="item.id" :value="item.id" :label="item.name" :disabled="item.status !== '0'" />
          </el-select>
        </el-form-item>
          <h3>景点展示</h3>
          <el-form-item prop="coverImage" label="封面"><image-upload :disabled="saving || formLoading" v-model="form.coverImage" :limit="1" /><div class="field-help">建议尺寸 800 × 450，支持 JPG / PNG，最大 5MB。</div></el-form-item>
          <el-form-item label="景点图片"><image-upload :disabled="saving || formLoading" v-model="gallery" :limit="9" /><div class="field-help">最多9张，拖动图片可调整展示顺序。</div></el-form-item>
          <el-form-item prop="description" label="简介"><el-input v-model="form.description" type="textarea" :rows="4" maxlength="10000" show-word-limit /></el-form-item>
          <h3>游览信息</h3>
          <el-form-item prop="address" label="详细地址"><el-input v-model="form.address" maxlength="500" show-word-limit /></el-form-item>
          <el-form-item prop="openingHours" label="开放时间"><el-input v-model="form.openingHours" maxlength="200" placeholder="例如：每日 09:00—18:00，周一闭馆" /></el-form-item>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item prop="ticketPrice" label="门票（元）"><el-input-number v-model="form.ticketPrice" :min="0" :max="99999999.99" :precision="2" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item prop="recommendedDuration" label="游玩分钟"><el-input-number v-model="form.recommendedDuration" :min="0" :max="2147483647" :precision="0" /></el-form-item></el-col>
          </el-row>
          <el-form-item prop="rating" label="评分"><el-input-number v-model="form.rating" :min="0" :max="5" :precision="1" :step="0.1" /><span class="field-help">0—5分，当前由管理员维护</span></el-form-item>
          <h3>地理位置</h3>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item prop="latitude" label="纬度"><el-input-number v-model="form.latitude" :min="-90" :max="90" :precision="7" :controls="false" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item prop="longitude" label="经度"><el-input-number v-model="form.longitude" :min="-180" :max="180" :precision="7" :controls="false" /></el-form-item></el-col>
          </el-row>
        <h3>展示设置</h3>
        <el-form-item prop="sort" label="排序"><el-input-number v-model="form.sort" :min="0" :max="2147483647" :precision="0" /><span class="field-help">数值越大越靠前</span></el-form-item>
        <el-form-item prop="status" label="状态"><el-radio-group v-model="form.status"><el-radio v-for="item in sys_normal_disable" :key="item.value" :value="item.value">{{ item.label }}</el-radio></el-radio-group></el-form-item>
        <el-form-item prop="remark" label="备注"><el-input v-model="form.remark" type="textarea" maxlength="500" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogOpen = false" :disabled="saving">取消</el-button><el-button type="primary" :loading="saving" :disabled="formLoading || !!optionError" @click="save">保存</el-button></template>
    </el-dialog>

    <el-drawer v-model="detailOpen" :title="`${label}详情`" size="520px">
      <template v-if="detail">
        <image-preview v-if="detail.coverImage" :src="detail.coverImage" width="100%" height="220px" />
        <div class="gallery"><image-preview v-for="image in detail.images || []" :key="image" :src="image" :width="100" :height="75" /></div>
        <el-descriptions :column="1" border class="detail-info">
          <el-descriptions-item label="名称">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item label="国家">{{ detail.countryName }}</el-descriptions-item>
          <el-descriptions-item label="省份">{{ detail.provinceName }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detail.status === '0' ? '上架' : '下架' }}</el-descriptions-item>
          <el-descriptions-item label="城市">{{ detail.cityName }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ detail.address || '—' }}</el-descriptions-item>
          <el-descriptions-item label="门票">{{ money(detail.ticketPrice) }} 元</el-descriptions-item>
          <el-descriptions-item label="开放时间">{{ detail.openingHours || '—' }}</el-descriptions-item>
          <el-descriptions-item label="建议游玩">{{ detail.recommendedDuration }} 分钟</el-descriptions-item>
          <el-descriptions-item label="评分">{{ detail.rating }} / 5</el-descriptions-item>
          <el-descriptions-item label="点赞 / 收藏 / 评论">{{ detail.likeCount }} / {{ detail.favoriteCount }} / {{ detail.commentCount }}</el-descriptions-item>
          <el-descriptions-item label="排序">{{ detail.sort }}</el-descriptions-item>
          <el-descriptions-item label="浏览量">{{ detail.viewCount }}</el-descriptions-item>
          <el-descriptions-item label="经纬度">{{ detail.longitude ?? '—' }} / {{ detail.latitude ?? '—' }}</el-descriptions-item>
          <el-descriptions-item label="简介"><span class="description">{{ detail.description || '—' }}</span></el-descriptions-item>
          <el-descriptions-item label="创建人">{{ detail.createBy }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ parseTime(detail.createTime) }}</el-descriptions-item>
          <el-descriptions-item label="修改人">{{ detail.updateBy }}</el-descriptions-item>
          <el-descriptions-item label="修改时间">{{ parseTime(detail.updateTime) }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ detail.remark || '—' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="VoyaAiAttraction">
import { attractionApi as api, cityOptions } from '@/api/voyaai/attraction'
import { countryOptions, provinceOptions } from '@/api/voyaai/region'

const { proxy } = getCurrentInstance()
const label = '景点'
const headingDescription = '维护城市景点、图片和游览信息，管理景点上下架。'
const permission = action => `voyaai:attraction:${action}`
const sys_normal_disable = [{ value: '0', label: '上架' }, { value: '1', label: '下架' }]
const money = value => Number(value ?? 0).toFixed(2)
const rows = ref([]), selection = ref([]), total = ref(0), loading = ref(false), showSearch = ref(true)
const listError = ref(''), dateRange = ref([]), countries = ref([]), queryProvinces = ref([]), formProvinces = ref([])
const queryCities = ref([]), formCities = ref([])
const dialogOpen = ref(false), saving = ref(false), formRef = ref(), optionError = ref(''), formLoading = ref(false)
const detailOpen = ref(false), detail = ref(null), gallery = ref('')
const query = reactive({ pageNum: 1, pageSize: 10, name: undefined, countryId: undefined, provinceId: undefined, cityId: undefined, status: undefined })
const form = ref({})
let listRequest = 0, queryRegionRequest = 0, formRegionRequest = 0, dialogRequest = 0
const required = message => ({ required: true, message, trigger: 'change' })
const rules = {
  name: [required('请输入景点名称'), { whitespace: true, message: '名称不能只有空格', trigger: 'blur' }],
  countryId: [required('请选择国家')], provinceId: [required('请选择省份')], cityId: [required('请选择城市')],
  sort: [required('请输入排序')], status: [required('请选择状态')],
  ticketPrice: [required('请输入门票价格，免费填0')], recommendedDuration: [required('请输入游玩分钟数')], rating: [required('请输入评分')]
}

function filters() {
  return { ...query, name: query.name?.trim() || undefined, status: query.status || undefined,
    countryId: query.countryId || undefined, provinceId: query.provinceId || undefined, cityId: query.cityId || undefined,
    beginCreateTime: dateRange.value?.[0], endCreateTime: dateRange.value?.[1] }
}
async function loadList() {
  const request = ++listRequest
  loading.value = true
  listError.value = ''
  try {
    const response = await api.list(filters())
    if (request !== listRequest) return
    rows.value = response.rows
    total.value = response.total
    selection.value = []
    if (!rows.value.length && query.pageNum > 1) {
      query.pageNum = Math.max(1, Math.ceil(total.value / query.pageSize))
      await loadList()
    }
  } catch {
    if (request === listRequest) listError.value = '列表加载失败，请检查后端启动情况及菜单权限后重试。'
  } finally {
    if (request === listRequest) loading.value = false
  }
}
function search() { query.pageNum = 1; loadList() }
function resetSearch() {
  Object.assign(query, { pageNum: 1, name: undefined, countryId: undefined, provinceId: undefined, cityId: undefined, status: undefined })
  dateRange.value = []; queryProvinces.value = []; queryCities.value = []; queryRegionRequest++
  loadList()
  loadCountries().catch(() => { listError.value = '国家选项加载失败，请重试。' })
}
async function loadCountries() { countries.value = (await countryOptions(false)).data }
async function changeQueryCountry() {
  const request = ++queryRegionRequest
  query.provinceId = undefined; query.cityId = undefined
  queryProvinces.value = []; queryCities.value = []
  if (!query.countryId) return
  try {
    const response = await provinceOptions(query.countryId, false)
    if (request === queryRegionRequest) queryProvinces.value = response.data
  } catch { /* Request handler displays errors. */ }
}
async function changeQueryProvince() {
  const request = ++queryRegionRequest
  query.cityId = undefined; queryCities.value = []
  if (!query.provinceId) return
  try {
    const response = await cityOptions(query.provinceId)
    if (request === queryRegionRequest) queryCities.value = response.data
  } catch { /* Request handler displays errors. */ }
}
async function loadFormRegions(loadProvinces) {
  const request = ++formRegionRequest
  formLoading.value = true; optionError.value = ''
  try {
    if (loadProvinces) {
      const response = form.value.countryId ? await provinceOptions(form.value.countryId, false) : { data: [] }
      if (request !== formRegionRequest) return
      formProvinces.value = response.data
    }
    const response = form.value.provinceId ? await cityOptions(form.value.provinceId) : { data: [] }
    if (request === formRegionRequest) formCities.value = response.data
  } catch {
    if (request === formRegionRequest) optionError.value = '地区选项加载失败，请关闭表单后重新打开。'
  } finally { if (request === formRegionRequest) formLoading.value = false }
}
function changeFormCountry() {
  form.value.provinceId = undefined; form.value.cityId = undefined
  formProvinces.value = []; formCities.value = []
  loadFormRegions(true)
}
function changeFormProvince() {
  form.value.cityId = undefined; formCities.value = []
  loadFormRegions(false)
}
function emptyForm() {
  return { name: '', countryId: undefined, provinceId: undefined, cityId: undefined, coverImage: '',
    description: '', address: '', latitude: undefined, longitude: undefined, ticketPrice: 0,
    openingHours: '', recommendedDuration: 0, rating: 0, sort: 0, status: '0', remark: '' }
}
async function openForm(id) {
  const request = ++dialogRequest
  formRegionRequest++
  form.value = emptyForm(); gallery.value = ''; formProvinces.value = []; formCities.value = []
  optionError.value = ''; formLoading.value = true; dialogOpen.value = true
  await nextTick(); formRef.value?.clearValidate()
  try {
    const [countryResponse, detailResponse] = await Promise.all([countryOptions(false), id ? api.detail(id) : Promise.resolve(null)])
    if (request !== dialogRequest || !dialogOpen.value) return
    countries.value = countryResponse.data
    if (detailResponse) {
      form.value = { ...emptyForm(), ...detailResponse.data }
      gallery.value = (detailResponse.data.images || []).join(',')
      await loadFormRegions(true)
    }
  } catch {
    if (request === dialogRequest) optionError.value = '详情或地区加载失败，请关闭表单后重试。'
  } finally { if (request === dialogRequest) formLoading.value = false }
}
function openCreate() { openForm() }
function openEdit(row) { openForm(row.id) }
watch(dialogOpen, open => { if (!open) { dialogRequest++; formRegionRequest++ } })

async function save() {
  if (saving.value || formLoading.value || optionError.value || !(await formRef.value.validate().catch(() => false))) return
  saving.value = true
  // Submit only editable DTO fields, never counters or audit fields returned by detail.
  const data = {}
  for (const key of ['cityId','name','coverImage','description','address','latitude','longitude','ticketPrice','openingHours','recommendedDuration','rating','sort','status','remark']) {
    data[key] = form.value[key] ?? null
  }
  data.name = data.name.trim()
  data.images = gallery.value ? gallery.value.split(',').filter(Boolean) : []
  try {
    if (form.value.id) await api.update({ ...data, id: form.value.id })
    else await api.create(data)
    proxy.$modal.msgSuccess('保存成功'); dialogOpen.value = false
    await loadList()
  } catch { /* Preserve the form for correction. */ }
  finally { saving.value = false }
}
async function remove(items) {
  if (!items.length) return
  if (items.length > 100) return proxy.$modal.msgWarning('每次最多删除100条')
  try {
    await proxy.$modal.confirm(`确认删除${items.length === 1 ? `“${items[0].name}”` : `选中的 ${items.length} 个景点`}？有关联数据时会阻止删除，可选择下架。`)
    await api.remove(items.map(item => item.id))
    proxy.$modal.msgSuccess('删除成功'); await loadList()
  } catch { /* Cancellation and request errors leave existing rows intact. */ }
}
async function changeStatus(row, status) {
  const target = status === '0' ? '上架' : '下架'
  try {
    await proxy.$modal.confirm(`确认${target}“${row.name}”？`)
    await api.changeStatus({ id: row.id, status })
    proxy.$modal.msgSuccess(`${target}成功`); await loadList()
  } catch { /* No optimistic mutation. */ }
}
async function showDetail(row) {
  try { detail.value = (await api.detail(row.id)).data; detailOpen.value = true } catch { /* Error displayed by request handler. */ }
}
function exportAttractions() { proxy.download('voyaai/attraction/export', filters(), `景点_${Date.now()}.xlsx`) }
loadList()
loadCountries().catch(() => { listError.value = '国家选项加载失败，请点击重置重试。' })
</script>

<style scoped>
.page-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.page-heading h2 { margin: 0 0 8px; font-size: 22px; color: var(--el-text-color-primary); }
.page-heading p, .field-help { color: var(--el-text-color-secondary); font-size: 13px; }
.page-heading p { margin: 0; }
.search-form { padding: 18px 18px 0; margin-bottom: 18px; background: var(--el-fill-color-light); border-radius: 6px; }
.search-form .el-select { width: 180px; }
.search-form .el-input { width: 190px; }
h3 { font-size: 14px; border-left: 3px solid var(--el-color-primary); padding-left: 10px; margin: 20px 0; }
.field-help { margin-left: 8px; }
.el-dropdown { margin: 0 10px; vertical-align: middle; }
.detail-info { margin-top: 20px; }
.description { white-space: pre-wrap; overflow-wrap: anywhere; }
.gallery { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
</style>
