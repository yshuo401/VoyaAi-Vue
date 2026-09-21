<template>
  <div class="app-container">
    <div class="page-heading">
      <div>
        <h2>行程管理</h2>
        <p>查看和管理用户创建的行程，支持按城市、来源和关键词筛选，详情中按天展示行程安排。</p>
      </div>
      <el-tag effect="plain">用户运营</el-tag>
    </div>

    <el-form v-show="showSearch" :model="query" :inline="true" class="search-form">
      <el-form-item label="城市">
        <el-select v-model="query.cityId" filterable clearable placeholder="全部城市">
          <el-option v-for="item in cities" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词">
        <el-input v-model="query.keyword" clearable maxlength="200" placeholder="搜索行程标题" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="来源">
        <el-select v-model="query.source" clearable placeholder="全部来源">
          <el-option v-for="item in sourceTypes" :key="item.value" :label="item.label" :value="item.value" />
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
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>

    <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon class="mb8" />

    <el-table v-loading="loading" :data="rows" row-key="id">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="用户" min-width="120">
        <template #default="{ row }">
          <div class="user-cell">
            <img v-if="row.avatarUrl" :src="row.avatarUrl" class="user-avatar" />
            <span>{{ row.nickname || '—' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="cityName" label="城市" width="90" />
      <el-table-column prop="title" label="行程标题" min-width="160" show-overflow-tooltip />
      <el-table-column label="行程日期" min-width="200">
        <template #default="{ row }">
          <span>{{ row.startDate }} ~ {{ row.endDate }}</span>
          <el-tag v-if="row.dayCount" size="small" effect="plain" class="day-count">{{ row.dayCount }}天</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="peopleCount" label="人数" width="60" align="center" />
      <el-table-column label="预算" width="110" align="right">
        <template #default="{ row }">
          <span v-if="row.budget != null">{{ formatBudget(row.budget) }}</span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="来源" width="90">
        <template #default="{ row }">
          <el-tag :type="sourceStyle(row.source)" size="small">{{ sourceLabel(row.source) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ parseTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button v-hasPermi="['voyaai:trip:query']" link type="primary" @click="showDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" :page-sizes="[10, 20, 50, 100]" @pagination="loadList" />

    <el-drawer v-model="detailOpen" title="行程详情" size="720px">
      <template v-if="detail">
        <div class="detail-header">
          <div class="detail-header-main">
            <h3>{{ detail.title }}</h3>
            <div class="detail-meta">
              <el-tag :type="sourceStyle(detail.source)" size="small">{{ sourceLabel(detail.source) }}</el-tag>
              <span class="meta-divider">|</span>
              <span>{{ detail.cityName }}</span>
              <span class="meta-divider">|</span>
              <span>{{ detail.startDate }} ~ {{ detail.endDate }}</span>
              <span v-if="detail.peopleCount" class="meta-divider">|</span>
              <span v-if="detail.peopleCount">{{ detail.peopleCount }}人</span>
            </div>
          </div>
        </div>

        <el-descriptions :column="2" border class="detail-descriptions">
          <el-descriptions-item label="用户">{{ detail.nickname || '—' }}</el-descriptions-item>
          <el-descriptions-item label="城市">{{ detail.cityName }}</el-descriptions-item>
          <el-descriptions-item label="开始日期">{{ detail.startDate }}</el-descriptions-item>
          <el-descriptions-item label="结束日期">{{ detail.endDate }}</el-descriptions-item>
          <el-descriptions-item label="人数">{{ detail.peopleCount || '—' }}</el-descriptions-item>
          <el-descriptions-item label="预算">{{ detail.budget != null ? `¥${detail.budget.toLocaleString()}` : '—' }}</el-descriptions-item>
          <el-descriptions-item label="出行方式">{{ detail.travelType || '—' }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ sourceLabel(detail.source) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.description" label="行程描述" :span="2">
            <div class="content-block">{{ detail.description }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ parseTime(detail.createTime) }}</el-descriptions-item>
        </el-descriptions>

        <template v-if="detail.days && detail.days.length">
          <h3 class="section-title">行程安排（{{ detail.days.length }}天）</h3>
          <el-collapse v-model="activeDays">
            <el-collapse-item v-for="day in detail.days" :key="day.id" :name="day.id">
              <template #title>
                <div class="day-title">
                  <span class="day-number">第{{ day.dayNumber }}天</span>
                  <span class="day-date">{{ day.date }}</span>
                  <span class="day-name">{{ day.title || '未命名' }}</span>
                  <el-tag v-if="day.items && day.items.length" size="small" effect="plain">{{ day.items.length }}项</el-tag>
                </div>
              </template>
              <div v-if="day.description" class="day-desc">{{ day.description }}</div>
              <el-table v-if="day.items && day.items.length" :data="day.items" size="small" class="items-table">
                <el-table-column prop="sort" label="#" width="40" align="center" />
                <el-table-column label="类型" width="80">
                  <template #default="{ row: item }">
                    <el-tag :type="itemTypeStyle(item.itemType)" size="small">{{ itemTypeLabel(item.itemType) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="title" label="项目名称" min-width="140" show-overflow-tooltip />
                <el-table-column label="时间" min-width="150">
                  <template #default="{ row: item }">
                    <span v-if="item.startTime || item.endTime">{{ item.startTime || '' }} ~ {{ item.endTime || '' }}</span>
                    <span v-else>—</span>
                  </template>
                </el-table-column>
                <el-table-column prop="address" label="地址" min-width="140" show-overflow-tooltip />
                <el-table-column label="费用" width="100" align="right">
                  <template #default="{ row: item }">
                    <span v-if="item.estimatedCost != null">¥{{ item.estimatedCost }}</span>
                    <span v-else>—</span>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="该天暂无行程安排" :image-size="48" />
            </el-collapse-item>
          </el-collapse>
        </template>
        <el-empty v-else description="暂无行程日数据" :image-size="60" />
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="VoyaAiTrip">
import { tripApi } from '@/api/voyaai/trip'
import { listCity } from '@/api/voyaai/city'

const { proxy } = getCurrentInstance()

const sourceTypes = [
  { value: 'USER', label: '用户创建' },
  { value: 'AI', label: 'AI 生成' },
  { value: 'ADMIN', label: '管理员' }
]
const sourceLabel = value => sourceTypes.find(s => s.value === value)?.label || value
const sourceStyle = value => {
  const map = { USER: 'success', AI: 'warning', ADMIN: 'primary' }
  return map[value] || 'info'
}

const itemTypes = [
  { value: 1, label: '景点', style: 'success' },
  { value: 2, label: '餐饮', style: 'warning' },
  { value: 3, label: '酒店', style: 'primary' },
  { value: 4, label: '交通', style: 'info' },
  { value: 5, label: '购物', style: 'danger' },
  { value: 6, label: '其他', style: '' }
]
const itemTypeLabel = value => itemTypes.find(t => t.value === value)?.label || value
const itemTypeStyle = value => itemTypes.find(t => t.value === value)?.style || 'info'

const formatBudget = num => `¥${num.toLocaleString()}`

const query = reactive({ pageNum: 1, pageSize: 10, cityId: undefined, keyword: undefined, source: undefined })
const dateRange = ref([])
const rows = ref([]), total = ref(0), loading = ref(false), showSearch = ref(true)
const listError = ref('')
const cities = ref([])
const detail = ref(null), detailOpen = ref(false), activeDays = ref([])
let listVersion = 0

function filters() {
  return {
    ...query,
    cityId: query.cityId || undefined,
    keyword: query.keyword?.trim() || undefined,
    source: query.source || undefined,
    beginCreateTime: dateRange.value?.[0],
    endCreateTime: dateRange.value?.[1]
  }
}

async function loadList() {
  const version = ++listVersion
  loading.value = true
  listError.value = ''
  try {
    const r = await tripApi.list(filters())
    if (version !== listVersion) return
    rows.value = r.rows
    total.value = r.total
    if (!r.rows.length && query.pageNum > 1) {
      query.pageNum = Math.max(1, Math.ceil(r.total / query.pageSize))
      await loadList()
    }
  } catch {
    if (version === listVersion) listError.value = '行程数据加载失败，请检查接口或权限后刷新重试。'
  } finally {
    if (version === listVersion) loading.value = false
  }
}

function search() { query.pageNum = 1; loadList() }
function resetSearch() {
  Object.assign(query, { pageNum: 1, cityId: undefined, keyword: undefined, source: undefined })
  dateRange.value = []
  loadList()
}

async function loadCities() {
  try {
    cities.value = (await listCity({ pageNum: 1, pageSize: 9999, status: '0' })).rows
  } catch { /* Error displayed by interceptor. */ }
}

async function showDetail(row) {
  try {
    const resp = await tripApi.detail(row.id)
    detail.value = resp.data
    detailOpen.value = true
    if (detail.value.days && detail.value.days.length) {
      activeDays.value = [detail.value.days[0].id]
    }
  } catch { /* Error already displayed by interceptor. */ }
}

loadCities()
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
  width: 160px;
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

.day-count {
  margin-left: 6px;
  vertical-align: middle;
}

.detail-header {
  margin-bottom: 16px;
}

.detail-header-main h3 {
  margin: 0 0 10px;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.detail-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.meta-divider {
  margin: 0 6px;
  color: var(--el-border-color);
}

.detail-descriptions {
  margin-bottom: 24px;
}

.content-block {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  max-height: 160px;
  overflow-y: auto;
}

.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.day-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.day-number {
  font-weight: 600;
  color: var(--el-color-primary);
  font-size: 14px;
}

.day-date {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.day-name {
  font-size: 14px;
}

.day-desc {
  padding: 8px 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.items-table {
  margin-top: 4px;
}
</style>