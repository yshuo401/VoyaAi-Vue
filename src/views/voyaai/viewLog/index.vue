<template>
  <div class="app-container">
    <div class="page-heading">
      <div>
        <h2>浏览记录</h2>
        <p>查看用户在平台上的浏览行为数据，支持按目标类型和用户筛选。</p>
      </div>
      <el-tag effect="plain">数据分析</el-tag>
    </div>

    <el-form v-show="showSearch" :model="query" :inline="true" class="search-form">
      <el-form-item label="目标类型">
        <el-select v-model="query.targetType" clearable placeholder="全部类型">
          <el-option v-for="item in targetTypes" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="用户昵称">
        <el-input v-model="query.nickname" clearable maxlength="100" placeholder="输入用户昵称搜索" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="浏览时间">
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>

    <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon class="mb8" />

    <el-table v-loading="loading" :data="rows" row-key="id">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="用户" min-width="140">
        <template #default="{ row }">
          <div class="user-cell">
            <img v-if="row.avatarUrl" :src="row.avatarUrl" class="user-avatar" />
            <span>{{ row.nickname || '—' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="目标类型" width="90">
        <template #default="{ row }">
          <el-tag :type="targetTypeStyle(row.targetType)" size="small">{{ targetTypeLabel(row.targetType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="目标" min-width="180">
        <template #default="{ row }">
          <div class="target-cell">
            <img v-if="row.targetCoverImage" :src="row.targetCoverImage" class="target-cover" />
            <span>{{ row.targetTitle || `目标 ${row.targetId}` }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="浏览时间" width="170">
        <template #default="{ row }">{{ parseTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button v-hasPermi="['voyaai:viewLog:query']" link type="primary" @click="showDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" :page-sizes="[10, 20, 50, 100]" @pagination="loadList" />

    <el-drawer v-model="detailOpen" title="浏览详情" size="480px">
      <template v-if="detail">
        <el-descriptions :column="1" border class="detail-info">
          <el-descriptions-item label="记录 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="用户昵称">{{ detail.nickname || '—' }}</el-descriptions-item>
          <el-descriptions-item label="用户头像">
            <img v-if="detail.avatarUrl" :src="detail.avatarUrl" class="detail-avatar" />
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="目标类型">{{ targetTypeLabel(detail.targetType) }}</el-descriptions-item>
          <el-descriptions-item label="目标名称">{{ detail.targetTitle || '—' }}</el-descriptions-item>
          <el-descriptions-item label="目标 ID">{{ detail.targetId }}</el-descriptions-item>
          <el-descriptions-item label="目标封面">
            <img v-if="detail.targetCoverImage" :src="detail.targetCoverImage" class="detail-cover" />
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="浏览时间">{{ parseTime(detail.createTime) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="VoyaAiViewLog">
import { viewLogApi as api } from '@/api/voyaai/viewLog'

const { proxy } = getCurrentInstance()
const targetTypes = [
  { value: 'city', label: '城市' },
  { value: 'attraction', label: '景点' },
  { value: 'guide', label: '攻略' }
]
const targetTypeLabel = value => targetTypes.find(t => t.value === value)?.label || value
const targetTypeStyle = value => {
  const map = { city: '', attraction: 'success', guide: 'warning' }
  return map[value] || 'info'
}

const query = reactive({ pageNum: 1, pageSize: 10, targetType: undefined, nickname: undefined })
const dateRange = ref([])
const rows = ref([]), total = ref(0), loading = ref(false), showSearch = ref(true)
const listError = ref('')
const detail = ref(null), detailOpen = ref(false)
let listVersion = 0

function filters() {
  return {
    ...query,
    targetType: query.targetType || undefined,
    nickname: query.nickname?.trim() || undefined,
    beginCreateTime: dateRange.value?.[0],
    endCreateTime: dateRange.value?.[1]
  }
}

async function loadList() {
  const version = ++listVersion
  loading.value = true
  listError.value = ''
  try {
    const r = await api.list(filters())
    if (version !== listVersion) return
    rows.value = r.rows
    total.value = r.total
    if (!r.rows.length && query.pageNum > 1) {
      query.pageNum = Math.max(1, Math.ceil(r.total / query.pageSize))
      await loadList()
    }
  } catch {
    if (version === listVersion) listError.value = '浏览记录加载失败，请检查接口或权限后刷新重试。'
  } finally {
    if (version === listVersion) loading.value = false
  }
}

function search() { query.pageNum = 1; loadList() }
function resetSearch() {
  Object.assign(query, { pageNum: 1, targetType: undefined, nickname: undefined })
  dateRange.value = []
  loadList()
}

async function showDetail(row) {
  try {
    detail.value = (await api.detail(row.id)).data
    detailOpen.value = true
  } catch {}
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
  width: 180px;
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

.target-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.target-cover {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.detail-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.detail-cover {
  width: 120px;
  border-radius: 4px;
  object-fit: cover;
}

.detail-info {
  margin-top: 20px;
}
</style>
