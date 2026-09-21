<template>
  <div class="app-container">
    <h2>攻略管理</h2>
    <p class="muted">维护旅行攻略、预算和标签，发布后展示在小程序中。</p>
    <el-form v-show="showSearch" :inline="true" :model="query" class="filters">
      <el-form-item label="标题"><el-input v-model="query.name" clearable maxlength="200" @keyup.enter="search" /></el-form-item>
      <el-form-item label="城市"><el-select v-model="query.cityId" filterable clearable><el-option v-for="c in cities" :key="c.id" :label="c.name" :value="c.id" /></el-select></el-form-item>
      <el-form-item label="类型"><el-input v-model="query.guideType" clearable maxlength="50" @keyup.enter="search" /></el-form-item>
      <el-form-item label="发布状态"><el-select v-model="query.publishStatus" clearable><el-option v-for="s in statuses" :key="s.value" :label="s.label" :value="s.value" /></el-select></el-form-item>
      <el-form-item label="创建时间"><el-date-picker v-model="dates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" /></el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="search">搜索</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <el-alert v-if="optionsError" :title="optionsError" type="warning" :closable="false"><el-button link @click="loadOptions">重新加载选项</el-button></el-alert>
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button v-hasPermi="['voyaai:guide:add']" type="primary" icon="Plus" @click="openForm()">新增攻略</el-button></el-col>
      <el-col :span="1.5"><el-button v-hasPermi="['voyaai:guide:remove']" type="danger" plain :disabled="!selection.length || busy" @click="remove(selection)">批量删除</el-button></el-col>
      <el-col :span="1.5"><el-button v-hasPermi="['voyaai:guide:export']" icon="Download" @click="exportData">导出</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>
    <el-alert v-if="listError" :title="listError" type="error" :closable="false" />
    <el-table v-loading="loading" :data="rows" row-key="id" @selection-change="selection = $event">
      <el-table-column type="selection" width="48" /><el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="封面" width="90"><template #default="{ row }"><image-preview v-if="row.coverImage" :src="row.coverImage" :width="60" :height="40" /><span v-else>—</span></template></el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip /><el-table-column prop="cityName" label="城市" width="110" />
      <el-table-column prop="guideType" label="类型" width="100" /><el-table-column prop="tagNames" label="标签" min-width="130" />
      <el-table-column prop="days" label="天数" width="70" /><el-table-column label="预算（元）" min-width="150"><template #default="{ row }">{{ row.budgetMin }} — {{ row.budgetMax }}</template></el-table-column>
      <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.publishStatus === '1' ? 'success' : 'info'">{{ statusLabel(row.publishStatus) }}</el-tag></template></el-table-column>
      <el-table-column prop="sort" label="排序" width="70" /><el-table-column prop="viewCount" label="浏览量" width="90" /><el-table-column prop="publishTime" label="发布时间" width="170" />
      <el-table-column label="操作" fixed="right" width="240"><template #default="{ row }">
        <el-button v-hasPermi="['voyaai:guide:query']" link type="primary" @click="showDetail(row.id)">详情</el-button>
        <el-button v-hasPermi="['voyaai:guide:edit']" link type="primary" @click="openForm(row.id)">编辑</el-button>
        <el-dropdown v-hasPermi="['voyaai:guide:edit']" :disabled="busy" @command="value => changeStatus(row, value)"><el-button link type="primary">状态</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item v-for="s in statuses" :key="s.value" :command="s.value" :disabled="row.publishStatus === s.value">{{ s.label }}</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
        <el-button v-hasPermi="['voyaai:guide:remove']" link type="danger" :disabled="busy" @click="remove([row])">删除</el-button>
      </template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="loadList" />
    <el-dialog v-model="formOpen" :title="form.id ? '编辑攻略' : '新增攻略'" width="min(900px, 95vw)" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving" destroy-on-close>
      <el-alert v-if="formError" :title="formError" type="error" :closable="false" />
      <el-form ref="formRef" v-loading="formLoading" :model="form" :rules="rules" label-width="100px" :disabled="saving || formLoading">
        <el-form-item label="标题" prop="title"><el-input v-model="form.title" maxlength="200" show-word-limit /></el-form-item>
        <el-form-item label="城市" prop="cityId"><el-select v-model="form.cityId" filterable placeholder="选择启用城市"><el-option v-if="form.cityId && !cities.some(c => c.id === form.cityId)" :value="form.cityId" :label="`${form.cityName || form.cityId}（不可用，请重新选择）`" disabled /><el-option v-for="c in cities" :key="c.id" :value="c.id" :label="c.name" /></el-select></el-form-item>
        <el-form-item label="封面"><image-upload v-model="form.coverImage" :limit="1" :disabled="saving || formLoading" /></el-form-item>
        <el-form-item label="摘要"><el-input v-model="form.summary" type="textarea" :rows="2" maxlength="500" show-word-limit /></el-form-item>
        <el-form-item label="正文" prop="content"><el-input v-model="form.content" type="textarea" :rows="12" maxlength="1000000" placeholder="填写每日路线、景点、美食和出行建议。正文按文本展示，保留换行。" /></el-form-item>
        <el-form-item label="攻略类型"><el-input v-model="form.guideType" maxlength="50" placeholder="例如：自由行、亲子游" /></el-form-item>
        <el-form-item label="标签"><el-select v-model="form.tagIds" multiple filterable :multiple-limit="20" placeholder="可不选择"><el-option v-for="t in tags" :key="t.id" :value="t.id" :label="t.name" /><el-option v-for="id in unavailableTags" :key="id" :value="id" :label="`标签 ${id}（不可用，请移除）`" disabled /></el-select></el-form-item>
        <el-form-item label="建议天数" prop="days"><el-input-number v-model="form.days" :min="1" :max="365" :precision="0" /></el-form-item>
        <el-form-item label="最低预算" prop="budgetMin"><el-input-number v-model="form.budgetMin" :min="0" :max="99999999.99" :precision="2" /></el-form-item>
        <el-form-item label="最高预算" prop="budgetMax"><el-input-number v-model="form.budgetMax" :min="0" :max="99999999.99" :precision="2" /></el-form-item>
        <el-form-item label="发布状态" prop="publishStatus"><el-radio-group v-model="form.publishStatus"><el-radio v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</el-radio></el-radio-group></el-form-item>
        <el-form-item label="排序" prop="sort"><el-input-number v-model="form.sort" :min="0" :max="2147483647" :precision="0" /><span class="muted">数值越大推荐越靠前</span></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="saving" @click="formOpen = false">取消</el-button><el-button type="primary" :loading="saving" :disabled="formLoading || !!formError || !!optionsError" @click="save">保存</el-button></template>
    </el-dialog>
    <el-drawer v-model="detailOpen" title="攻略详情" size="min(720px, 95vw)">
      <template v-if="detail"><image-preview v-if="detail.coverImage" :src="detail.coverImage" width="100%" height="220px" /><h2>{{ detail.title }}</h2>
        <el-descriptions :column="2" border><el-descriptions-item label="城市">{{ detail.cityName }}</el-descriptions-item><el-descriptions-item label="状态">{{ statusLabel(detail.publishStatus) }}</el-descriptions-item><el-descriptions-item label="类型">{{ detail.guideType }}</el-descriptions-item><el-descriptions-item label="天数">{{ detail.days }}</el-descriptions-item><el-descriptions-item label="预算">{{ detail.budgetMin }} — {{ detail.budgetMax }} 元</el-descriptions-item><el-descriptions-item label="标签">{{ detail.tagNames }}</el-descriptions-item><el-descriptions-item label="发布时间">{{ detail.publishTime || '—' }}</el-descriptions-item><el-descriptions-item label="浏览 / 点赞 / 收藏">{{ detail.viewCount }} / {{ detail.likeCount }} / {{ detail.favoriteCount }}</el-descriptions-item></el-descriptions>
        <p class="body-text">{{ detail.summary }}</p><div class="body-text">{{ detail.content }}</div><p class="muted body-text">备注：{{ detail.remark || '无' }}</p>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="VoyaAiGuide">
import { guideApi as api } from '@/api/voyaai/guide'
const { proxy } = getCurrentInstance()
const statuses = [{ value: '0', label: '草稿' }, { value: '1', label: '已发布' }, { value: '2', label: '已下架' }]
const statusLabel = value => statuses.find(s => s.value === value)?.label || value
const query = reactive({ pageNum: 1, pageSize: 10, name: '', cityId: undefined, guideType: '', publishStatus: undefined })
const dates = ref([]), rows = ref([]), total = ref(0), selection = ref([]), cities = ref([]), tags = ref([])
const loading = ref(false), showSearch = ref(true), listError = ref(''), optionsError = ref(''), busy = ref(false)
const form = ref({}), formOpen = ref(false), formRef = ref(), formLoading = ref(false), formError = ref(''), saving = ref(false)
const detail = ref(null), detailOpen = ref(false)
let listVersion = 0, formVersion = 0, detailVersion = 0
const unavailableTags = computed(() => (form.value.tagIds || []).filter(id => !tags.value.some(t => t.id === id)))
const required = message => ({ required: true, message, trigger: 'change' })
const rules = {
  title: [required('请输入标题'), { whitespace: true, message: '标题不能只有空格', trigger: 'blur' }],
  content: [required('请输入正文'), { whitespace: true, message: '正文不能只有空格', trigger: 'blur' }],
  cityId: [required('请选择城市')], days: [required('请输入天数')], budgetMin: [required('请输入最低预算')],
  budgetMax: [required('请输入最高预算')], sort: [required('请输入排序')], publishStatus: [required('请选择状态')]
}
function filters() { return { ...query, name: query.name?.trim() || undefined, guideType: query.guideType?.trim() || undefined, publishStatus: query.publishStatus || undefined, cityId: query.cityId || undefined, beginCreateTime: dates.value?.[0], endCreateTime: dates.value?.[1] } }
async function loadList() {
  const version = ++listVersion; loading.value = true; listError.value = ''
  try { const r = await api.list(filters()); if (version !== listVersion) return; rows.value = r.rows; total.value = r.total; selection.value = []
    if (!r.rows.length && query.pageNum > 1) { query.pageNum = Math.max(1, Math.ceil(r.total / query.pageSize)); await loadList() }
  } catch { if (version === listVersion) listError.value = '攻略加载失败，请检查接口或权限并刷新重试。' }
  finally { if (version === listVersion) loading.value = false }
}
async function loadOptions() {
  optionsError.value = ''
  try { const [c, t] = await Promise.all([api.cities(), api.tags()]); cities.value = c.data; tags.value = t.data }
  catch { optionsError.value = '城市或标签加载失败，请重新加载后再保存。' }
}
function search() { query.pageNum = 1; loadList() }
function reset() { Object.assign(query, { pageNum: 1, name: '', cityId: undefined, guideType: '', publishStatus: undefined }); dates.value = []; loadList() }
async function openForm(id) {
  const version = ++formVersion; formOpen.value = true; formLoading.value = true; formError.value = ''
  form.value = { cityId: undefined, title: '', coverImage: '', summary: '', content: '', guideType: '', days: 1, budgetMin: 0, budgetMax: 0, publishStatus: '0', sort: 0, remark: '', tagIds: [] }
  await nextTick(); formRef.value?.clearValidate()
  try { const [r] = await Promise.all([id ? api.detail(id) : Promise.resolve(null), loadOptions()]); if (version !== formVersion) return; if (r) form.value = { ...r.data, tagIds: r.data.tagIds || [] } }
  catch { if (version === formVersion) formError.value = '详情加载失败，请关闭后重试。' }
  finally { if (version === formVersion) formLoading.value = false }
}
watch(formOpen, value => { if (!value) formVersion++ })
async function save() {
  if (saving.value || formLoading.value || formError.value || optionsError.value || !(await formRef.value.validate().catch(() => false))) return
  if (form.value.budgetMin > form.value.budgetMax) return proxy.$modal.msgWarning('最低预算不能高于最高预算')
  if (!cities.value.some(c => c.id === form.value.cityId)) return proxy.$modal.msgWarning('请选择启用的城市')
  if (unavailableTags.value.length) return proxy.$modal.msgWarning('请移除不可用的标签')
  const data = {}
  for (const key of ['cityId', 'title', 'coverImage', 'summary', 'content', 'guideType', 'days', 'budgetMin', 'budgetMax', 'publishStatus', 'sort', 'remark', 'tagIds']) data[key] = form.value[key]
  data.title = data.title.trim(); saving.value = true
  try { if (form.value.id) await api.update({ ...data, id: form.value.id }); else await api.create(data); proxy.$modal.msgSuccess('保存成功'); formOpen.value = false; await loadList() }
  catch { /* The request interceptor displays server validation; keep the form. */ }
  finally { saving.value = false }
}
async function remove(items) {
  if (busy.value) return
  if (items.length > 100) return proxy.$modal.msgWarning('每次最多删除100条')
  busy.value = true
  try { await proxy.$modal.confirm(`确认删除 ${items.length} 篇攻略？存在收藏、点赞或评论时无法删除，请改为下架。`); await api.remove(items.map(x => x.id)); proxy.$modal.msgSuccess('删除成功'); await loadList() }
  catch { /* Server 409 details are displayed by the shared interceptor. */ }
  finally { busy.value = false }
}
async function changeStatus(row, publishStatus) {
  if (busy.value) return; busy.value = true
  try { await proxy.$modal.confirm(`确认将“${row.title}”设为${statusLabel(publishStatus)}？${publishStatus === '1' ? '发布后小程序可见。' : '小程序将不再展示，发布时间会被清空。'}`); await api.changeStatus({ id: row.id, publishStatus }); proxy.$modal.msgSuccess('状态已更新'); await loadList() }
  catch { /* Preserve rows on cancellation or error. */ }
  finally { busy.value = false }
}
async function showDetail(id) { const version = ++detailVersion; try { const r = await api.detail(id); if (version === detailVersion) { detail.value = r.data; detailOpen.value = true } } catch { /* Interceptor displays errors. */ } }
function exportData() { proxy.download('voyaai/guide/export', filters(), `攻略_${Date.now()}.xlsx`) }
loadList(); loadOptions()
</script>

<style scoped>
.muted { color: var(--el-text-color-secondary); font-size: 13px; margin: 12px 0; }
.filters { padding: 18px 18px 0; background: var(--el-fill-color-light); margin-bottom: 20px; border-radius: 8px; }
.filters .el-select, .filters .el-input { width: 180px; }
.el-form .el-select { min-width: 220px; }
.el-dropdown { margin: 0 10px; vertical-align: middle; }
.body-text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.9; }
</style>
