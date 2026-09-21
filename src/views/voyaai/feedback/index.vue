<template>
  <div class="app-container">
    <div class="page-heading">
      <div>
        <h2>意见反馈</h2>
        <p>查看用户提交的意见反馈，支持按状态筛选、关键词搜索和处理操作。</p>
      </div>
      <el-tag effect="plain">用户运营</el-tag>
    </div>

    <el-form v-show="showSearch" :model="query" :inline="true" class="search-form">
      <el-form-item label="处理状态">
        <el-select v-model="query.status" clearable placeholder="全部状态">
          <el-option v-for="item in feedbackStatuses" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词">
        <el-input v-model="query.keyword" clearable maxlength="200" placeholder="搜索反馈内容" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="联系方式">
        <el-input v-model="query.contact" clearable maxlength="100" placeholder="搜索联系方式" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="提交时间">
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button v-hasPermi="['voyaai:feedback:handle']" plain type="success" icon="Check" :disabled="!selection.length || busy" @click="handleSelection(selection)">批量处理</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button v-hasPermi="['voyaai:feedback:export']" plain icon="Download" @click="doExport">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>

    <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon class="mb8" />

    <el-table v-loading="loading" :data="rows" row-key="id" @selection-change="selection = $event">
      <el-table-column type="selection" width="48" />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="用户" min-width="130">
        <template #default="{ row }">
          <div class="user-cell">
            <img v-if="row.avatarUrl" :src="row.avatarUrl" class="user-avatar" />
            <span>{{ row.nickname || '匿名' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="反馈内容" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ row.content }}</template>
      </el-table-column>
      <el-table-column prop="contact" label="联系方式" min-width="130" show-overflow-tooltip />
      <el-table-column label="状态" width="95">
        <template #default="{ row }">
          <el-tag :type="statusStyle(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ parseTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button v-hasPermi="['voyaai:feedback:query']" link type="primary" @click="showDetail(row)">详情</el-button>
          <el-button v-if="row.status === '0'" v-hasPermi="['voyaai:feedback:handle']" link type="success" @click="openHandle(row)">处理</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" :page-sizes="[10, 20, 50, 100]" @pagination="loadList" />

    <el-dialog v-model="handleOpen" title="处理反馈" width="560px" :close-on-click-modal="false" append-to-body>
      <el-form ref="handleFormRef" :model="handleForm" :rules="handleRules" label-width="80px">
        <el-form-item label="反馈内容">
          <div class="handle-content">{{ handleTarget?.content }}</div>
        </el-form-item>
        <el-form-item v-if="handleTarget?.contact" label="联系方式">{{ handleTarget.contact }}</el-form-item>
        <el-form-item prop="handleRemark" label="处理备注">
          <el-input v-model="handleForm.handleRemark" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="记录处理结果或回复内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleOpen = false" :disabled="handling">取消</el-button>
        <el-button type="primary" :loading="handling" @click="doHandle">确认处理</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailOpen" title="反馈详情" size="560px">
      <template v-if="detail">
        <div class="detail-header">
          <img v-if="detail.avatarUrl" :src="detail.avatarUrl" class="detail-avatar" />
          <span v-else class="detail-avatar-placeholder">匿</span>
          <div class="detail-header-text">
            <h3>{{ detail.nickname || '匿名用户' }}</h3>
            <el-tag :type="statusStyle(detail.status)" size="small">{{ statusLabel(detail.status) }}</el-tag>
          </div>
        </div>
        <el-descriptions :column="1" border class="detail-info">
          <el-descriptions-item label="反馈 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="联系方式">{{ detail.contact || '—' }}</el-descriptions-item>
          <el-descriptions-item label="反馈内容">
            <div class="content-block">{{ detail.content }}</div>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.images" label="附件图片">
            <div class="image-list">
              <el-image v-for="(url, idx) in imageList(detail.images)" :key="idx" :src="url" :preview-src-list="imageList(detail.images)" :initial-index="idx" class="feedback-image" :preview-teleported="true" fit="cover" />
            </div>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.handleBy" label="处理人">{{ detail.handleBy }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.handleRemark" label="处理备注">
            <div class="content-block">{{ detail.handleRemark }}</div>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.handleTime" label="处理时间">{{ parseTime(detail.handleTime) }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ parseTime(detail.createTime) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="VoyaAiFeedback">
import { feedbackApi } from '@/api/voyaai/feedback'

const { proxy } = getCurrentInstance()
const feedbackStatuses = [
  { value: '0', label: '待处理' },
  { value: '1', label: '已处理' }
]
const statusLabel = value => feedbackStatuses.find(s => s.value === value)?.label || value
const statusStyle = value => (value === '0' ? 'warning' : 'success')
const imageList = str => (str ? str.split(',').map(s => s.trim()).filter(Boolean) : [])

const query = reactive({ pageNum: 1, pageSize: 10, status: undefined, keyword: undefined, contact: undefined })
const dateRange = ref([])
const rows = ref([]), selection = ref([]), total = ref(0), loading = ref(false), showSearch = ref(true)
const listError = ref(''), busy = ref(false)
const detail = ref(null), detailOpen = ref(false)
const handleOpen = ref(false), handling = ref(false), handleFormRef = ref(null), handleTarget = ref(null)
const handleForm = reactive({ handleRemark: '' })
const handleRules = {
  handleRemark: [{ required: true, message: '请输入处理备注', trigger: 'blur' }, { whitespace: true, message: '备注不能只有空格', trigger: 'blur' }]
}
let listVersion = 0

function filters() {
  return {
    ...query,
    status: query.status || undefined,
    keyword: query.keyword?.trim() || undefined,
    contact: query.contact?.trim() || undefined,
    beginCreateTime: dateRange.value?.[0],
    endCreateTime: dateRange.value?.[1]
  }
}

async function loadList() {
  const version = ++listVersion
  loading.value = true
  listError.value = ''
  try {
    const r = await feedbackApi.list(filters())
    if (version !== listVersion) return
    rows.value = r.rows
    total.value = r.total
    selection.value = []
    if (!r.rows.length && query.pageNum > 1) {
      query.pageNum = Math.max(1, Math.ceil(r.total / query.pageSize))
      await loadList()
    }
  } catch {
    if (version === listVersion) listError.value = '反馈数据加载失败，请检查接口或权限后刷新重试。'
  } finally {
    if (version === listVersion) loading.value = false
  }
}

function search() { query.pageNum = 1; loadList() }
function resetSearch() {
  Object.assign(query, { pageNum: 1, status: undefined, keyword: undefined, contact: undefined })
  dateRange.value = []
  loadList()
}

async function showDetail(row) {
  try {
    detail.value = (await feedbackApi.detail(row.id)).data
    detailOpen.value = true
  } catch { /* Error already displayed by interceptor. */ }
}

function openHandle(row) {
  handleTarget.value = row
  handleForm.handleRemark = ''
  handleOpen.value = true
}

function handleSelection(items) {
  if (busy.value) return
  const pendingItems = items.filter(item => item.status === '0')
  if (!pendingItems.length) return proxy.$modal.msgWarning('所选反馈已全部处理，无需再次处理。')
  if (pendingItems.length > 50) return proxy.$modal.msgWarning('每次最多处理50条')
  handleTarget.value = { id: pendingItems.map(x => x.id), content: `批量处理 ${pendingItems.length} 条反馈`, contact: null }
  handleForm.handleRemark = ''
  handleOpen.value = true
}

async function doHandle() {
  if (handling.value) return
  try {
    await handleFormRef.value.validate()
  } catch { return }
  handling.value = true
  try {
    const target = handleTarget.value
    const ids = Array.isArray(target.id) ? target.id : [target.id]
    const prefix = ids.length > 1 ? `${ids.length} 条反馈将标记为已处理，` : ''
    await proxy.$modal.confirm(`${prefix}确认执行？`)
    for (const id of ids) {
      await feedbackApi.handle(id, { handleRemark: handleForm.handleRemark })
    }
    proxy.$modal.msgSuccess('处理完成')
    handleOpen.value = false
    await loadList()
  } catch { /* Cancel and API failures handled by interceptor. */ }
  finally { handling.value = false }
}

async function doExport() {
  try {
    await feedbackApi.export(filters())
    proxy.$modal.msgSuccess('导出成功')
  } catch { /* Error displayed by interceptor. */ }
}

loadList()
</script>

<style scoped>
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.page-heading h2 {
  margin: 0 0 8px;
  font-size: 22px;
  color: var(--el-text-color-primary);
}

.page-heading p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.search-form {
  padding: 18px 18px 0;
  margin-bottom: 18px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.search-form .el-select {
  width: 140px;
}

.search-form .el-input {
  width: 190px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.handle-content {
  color: var(--el-text-color-regular);
  line-height: 1.6;
  max-height: 120px;
  overflow-y: auto;
  padding: 4px 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.detail-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.detail-avatar-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--el-fill-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--el-text-color-secondary);
}

.detail-header-text h3 {
  margin: 0 0 8px;
  font-size: 18px;
}

.detail-info {
  margin-top: 0;
}

.content-block {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  line-height: 1.6;
  padding: 4px 0;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.feedback-image {
  width: 100px;
  height: 100px;
  border-radius: 4px;
}
</style>
