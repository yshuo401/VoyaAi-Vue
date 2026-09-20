<template>
  <div class="app-container region-page">
    <div class="page-heading">
      <div><h2>{{ label }}管理</h2><p>{{ headingDescription }}</p></div>
      <el-tag effect="plain">基础资料</el-tag>
    </div>

    <el-form v-show="showSearch" :model="query" :inline="true" class="search-form">
      <el-form-item :label="`${label}名称`">
        <el-input v-model="query.name" clearable :maxlength="100" placeholder="输入名称搜索" @keyup.enter="search" />
      </el-form-item>
      <el-form-item v-if="hasCountry" label="国家">
        <el-select v-model="query.countryId" filterable clearable placeholder="全部国家" @change="changeQueryCountry">
          <el-option v-for="item in countries" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="isCity" label="省份">
        <el-select v-model="query.provinceId" filterable clearable :disabled="!query.countryId" placeholder="先选择国家">
          <el-option v-for="item in queryProvinces" :key="item.id" :label="item.name" :value="item.id" />
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
      <el-col v-if="isCity" :span="1.5"><el-button v-hasPermi="[permission('export')]" plain icon="Download" @click="exportCities">导出</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>
    <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon class="mb8" />
    <el-table v-loading="loading" :data="rows" row-key="id" @selection-change="selection = $event">
      <el-table-column type="selection" width="48" />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column v-if="isCity" label="封面" width="90">
        <template #default="{ row }"><image-preview v-if="row.coverImage" :src="row.coverImage" :width="60" :height="40" /><span v-else>—</span></template>
      </el-table-column>
      <el-table-column prop="name" :label="`${label}名称`" min-width="130" />
      <el-table-column v-if="hasCountry" prop="countryName" label="国家" min-width="100" />
      <el-table-column v-if="isCity" prop="provinceName" label="省份" min-width="100" />
      <el-table-column v-if="!isCity" prop="code" label="编码" min-width="100" />
      <el-table-column v-if="isCity" prop="viewCount" label="浏览量" width="100" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="状态" width="95"><template #default="{ row }"><dict-tag :options="sys_normal_disable" :value="row.status" /></template></el-table-column>
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

    <el-dialog v-model="dialogOpen" :title="`${form.id ? '编辑' : '新增'}${label}`" width="680px" :close-on-click-modal="false" append-to-body>
      <el-alert v-if="optionError" :title="optionError" type="error" :closable="false" class="mb8" />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <h3>基本信息</h3>
        <el-form-item prop="name" :label="`${label}名称`"><el-input v-model="form.name" maxlength="100" show-word-limit /></el-form-item>
        <el-form-item v-if="hasCountry" prop="countryId" label="国家">
          <el-select v-model="form.countryId" filterable placeholder="请选择国家" @change="changeFormCountry">
            <el-option v-for="item in countries" :key="item.id" :value="item.id" :label="item.name" :disabled="item.status !== '0'" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isCity" prop="provinceId" label="省份">
          <el-select v-model="form.provinceId" filterable :disabled="!form.countryId || provincesLoading" :loading="provincesLoading" placeholder="请选择省份">
            <el-option v-for="item in formProvinces" :key="item.id" :value="item.id" :label="item.name" :disabled="item.status !== '0'" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isCity" prop="code" :label="`${label}编码`"><el-input v-model="form.code" maxlength="20" placeholder="选填" /></el-form-item>
        <template v-if="isCity">
          <h3>城市展示</h3>
          <el-form-item prop="coverImage" label="封面"><image-upload v-model="form.coverImage" :limit="1" /><div class="field-help">建议尺寸 800 × 450，支持 JPG / PNG，最大 5MB。</div></el-form-item>
          <el-form-item prop="description" label="简介"><el-input v-model="form.description" type="textarea" :rows="4" maxlength="10000" show-word-limit /></el-form-item>
          <h3>地理位置</h3>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item prop="latitude" label="纬度"><el-input-number v-model="form.latitude" :min="-90" :max="90" :precision="7" :controls="false" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item prop="longitude" label="经度"><el-input-number v-model="form.longitude" :min="-180" :max="180" :precision="7" :controls="false" /></el-form-item></el-col>
          </el-row>
        </template>
        <h3>展示设置</h3>
        <el-form-item prop="sort" label="排序"><el-input-number v-model="form.sort" :min="0" :max="2147483647" :precision="0" /><span class="field-help">数值越大越靠前</span></el-form-item>
        <el-form-item prop="status" label="状态"><el-radio-group v-model="form.status"><el-radio v-for="item in sys_normal_disable" :key="item.value" :value="item.value">{{ item.label }}</el-radio></el-radio-group></el-form-item>
        <el-form-item prop="remark" label="备注"><el-input v-model="form.remark" type="textarea" maxlength="500" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogOpen = false" :disabled="saving">取消</el-button><el-button type="primary" :loading="saving" :disabled="provincesLoading || !!optionError" @click="save">保存</el-button></template>
    </el-dialog>

    <el-drawer v-model="detailOpen" :title="`${label}详情`" size="520px">
      <template v-if="detail">
        <image-preview v-if="detail.coverImage" :src="detail.coverImage" width="100%" height="220px" />
        <el-descriptions :column="1" border class="detail-info">
          <el-descriptions-item label="名称">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item v-if="hasCountry" label="国家">{{ detail.countryName }}</el-descriptions-item>
          <el-descriptions-item v-if="isCity" label="省份">{{ detail.provinceName }}</el-descriptions-item>
          <el-descriptions-item v-if="!isCity" label="编码">{{ detail.code || '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态"><dict-tag :options="sys_normal_disable" :value="detail.status" /></el-descriptions-item>
          <el-descriptions-item label="排序">{{ detail.sort }}</el-descriptions-item>
          <el-descriptions-item v-if="isCity" label="浏览量">{{ detail.viewCount }}</el-descriptions-item>
          <el-descriptions-item v-if="isCity" label="经纬度">{{ detail.longitude ?? '—' }} / {{ detail.latitude ?? '—' }}</el-descriptions-item>
          <el-descriptions-item v-if="isCity" label="简介"><span class="description">{{ detail.description || '—' }}</span></el-descriptions-item>
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

<script setup>
import { regionApis, countryOptions, provinceOptions } from '@/api/voyaai/region'

const props = defineProps({ kind: { type: String, required: true } })
const api = regionApis[props.kind]
const isCity = props.kind === 'city'
const hasCountry = props.kind !== 'country'
const label = { country: '国家', province: '省份', city: '城市' }[props.kind]
const headingDescription = { country: '维护国家资料，为省份与城市提供基础数据。', province: '维护国家下的省份，建立清晰的地区归属。', city: '维护目的地信息、封面与展示状态。' }[props.kind]
const { proxy } = getCurrentInstance()
const { sys_normal_disable } = useDict('sys_normal_disable')
const permission = action => `voyaai:${props.kind}:${action}`
const rows = ref([]), selection = ref([]), total = ref(0), loading = ref(false), showSearch = ref(true)
const listError = ref(''), dateRange = ref([]), countries = ref([]), queryProvinces = ref([]), formProvinces = ref([])
const dialogOpen = ref(false), saving = ref(false), formRef = ref(), optionError = ref(''), provincesLoading = ref(false)
const detailOpen = ref(false), detail = ref(null)
const query = reactive({ pageNum: 1, pageSize: 10, name: undefined, countryId: undefined, provinceId: undefined, status: undefined })
const form = ref({})
let listRequest = 0, queryProvinceRequest = 0, formProvinceRequest = 0
const required = message => ({ required: true, message, trigger: 'change' })
const rules = {
  name: [required('请输入名称'), { whitespace: true, message: '名称不能只有空格', trigger: 'blur' }],
  countryId: [required('请选择国家')], provinceId: [required('请选择省份')],
  sort: [required('请输入排序')], status: [required('请选择状态')]
}

function filters() {
  return {
    ...query,
    status: query.status || undefined,
    countryId: query.countryId || undefined,
    provinceId: query.provinceId || undefined,
    beginCreateTime: dateRange.value?.[0], endCreateTime: dateRange.value?.[1]
  }
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
    if (request === listRequest) listError.value = '列表加载失败，请检查接口或权限后重试。'
  } finally {
    if (request === listRequest) loading.value = false
  }
}

function search() { query.pageNum = 1; loadList() }
function resetSearch() {
  Object.assign(query, { pageNum: 1, name: undefined, countryId: undefined, provinceId: undefined, status: undefined })
  dateRange.value = []
  queryProvinces.value = []
  queryProvinceRequest++
  loadList()
}

async function loadCountries() {
  if (!hasCountry) return
  countries.value = (await countryOptions(false)).data
}

async function changeQueryCountry() {
  const request = ++queryProvinceRequest
  query.provinceId = undefined
  queryProvinces.value = []
  if (!isCity || !query.countryId) return
  try {
    const response = await provinceOptions(query.countryId, false)
    if (request === queryProvinceRequest) queryProvinces.value = response.data
  } catch { /* The shared request handler displays the API error. */ }
}

async function loadFormProvinces(countryId) {
  const request = ++formProvinceRequest
  formProvinces.value = []
  provincesLoading.value = false
  if (!isCity || !countryId) return
  provincesLoading.value = true
  try {
    const response = await provinceOptions(countryId, false)
    if (request === formProvinceRequest) formProvinces.value = response.data
  } catch {
    if (request === formProvinceRequest) optionError.value = '省份加载失败，请重新选择国家或重新打开表单。'
  } finally {
    if (request === formProvinceRequest) provincesLoading.value = false
  }
}

function changeFormCountry() {
  form.value.provinceId = undefined
  optionError.value = ''
  loadFormProvinces(form.value.countryId)
}

async function openCreate() {
  form.value = { name: '', sort: 0, status: '0', remark: '', code: '', countryId: undefined, provinceId: undefined, coverImage: '', description: '', latitude: undefined, longitude: undefined }
  optionError.value = ''
  formProvinces.value = []
  formProvinceRequest++
  provincesLoading.value = false
  dialogOpen.value = true
  await nextTick()
  formRef.value?.clearValidate()
  try { await loadCountries() } catch { optionError.value = '国家加载失败，请关闭表单后重试。' }
}

async function openEdit(row) {
  try {
    const response = await api.detail(row.id)
    form.value = { ...response.data }
    optionError.value = ''
    dialogOpen.value = true
    await nextTick()
    formRef.value?.clearValidate()
    await loadCountries()
    await loadFormProvinces(form.value.countryId)
  } catch { optionError.value = '详情或国家加载失败，请重试。' }
}

async function save() {
  if (saving.value || !(await formRef.value.validate().catch(() => false))) return
  saving.value = true
  // Send only DTO fields, excluding labels, counters and audit fields from the detail response.
  const data = { name: form.value.name.trim(), sort: form.value.sort, status: form.value.status, remark: form.value.remark }
  if (isCity) {
    Object.assign(data, { provinceId: form.value.provinceId, coverImage: form.value.coverImage || null, description: form.value.description || null, latitude: form.value.latitude ?? null, longitude: form.value.longitude ?? null })
  } else {
    data.code = form.value.code?.trim() || null
    if (hasCountry) data.countryId = form.value.countryId
  }
  try {
    if (form.value.id) await api.update({ ...data, id: form.value.id })
    else await api.create(data)
    proxy.$modal.msgSuccess('保存成功')
    dialogOpen.value = false
    await loadList()
  } catch { /* Retain the form for correction; the request handler displays the error. */ }
  finally { saving.value = false }
}

async function remove(items) {
  if (!items.length) return
  if (items.length > 100) return proxy.$modal.msgWarning('每次最多删除100条')
  try {
    await proxy.$modal.confirm(`确认删除${items.length === 1 ? `“${items[0].name}”` : `选中的 ${items.length} 条记录`}？存在关联数据时将阻止删除。`)
    await api.remove(items.map(item => item.id))
    proxy.$modal.msgSuccess('删除成功')
    await loadList()
  } catch { /* Cancel and API failures leave the existing rows intact. */ }
}

async function changeStatus(row, status) {
  const target = sys_normal_disable.value.find(item => item.value === status)
  try {
    await proxy.$modal.confirm(`将“${row.name}”设置为“${target?.label}”？`)
    await api.changeStatus({ id: row.id, status })
    proxy.$modal.msgSuccess('状态已更新')
    await loadList()
  } catch { /* No optimistic row mutation, so failure needs no rollback. */ }
}

async function showDetail(row) {
  try { detail.value = (await api.detail(row.id)).data; detailOpen.value = true } catch { /* Error already displayed. */ }
}
function exportCities() { proxy.download('voyaai/city/export', filters(), `城市_${Date.now()}.xlsx`) }
loadList()
loadCountries().catch(() => { listError.value = '国家选项加载失败，请检查接口权限后刷新。' })
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
</style>
