<template>
  <div class="app-container">
    <div class="page-heading">
      <div>
        <h2>用户管理</h2>
        <p>查看小程序用户的基本资料、注册时间和最近登录时间，仅做查询不提供编辑。</p>
      </div>
      <el-tag effect="plain">用户运营</el-tag>
    </div>

    <el-form v-show="showSearch" :model="query" :inline="true" class="search-form">
      <el-form-item label="用户昵称">
        <el-input v-model="query.nickname" clearable maxlength="100" placeholder="输入昵称搜索" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部状态">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="注册时间">
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
      <el-table-column label="用户" min-width="160">
        <template #default="{ row }">
          <div class="user-cell">
            <img v-if="row.avatarUrl" :src="row.avatarUrl" class="user-avatar" />
            <span>{{ row.nickname || '—' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="95">
        <template #default="{ row }">
          <dict-tag :options="statusOptions" :value="row.status" />
        </template>
      </el-table-column>
      <el-table-column label="注册时间" width="170">
        <template #default="{ row }">{{ parseTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="最近登录" width="170">
        <template #default="{ row }">{{ parseTime(row.lastLoginTime) || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button v-hasPermi="['voyaai:user:query']" link type="primary" @click="showDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" :page-sizes="[10, 20, 50, 100]" @pagination="loadList" />

    <el-drawer v-model="detailOpen" title="用户详情" size="520px">
      <template v-if="detail">
        <div class="detail-header">
          <img v-if="detail.avatarUrl" :src="detail.avatarUrl" class="detail-avatar" />
          <div class="detail-header-text">
            <h3>{{ detail.nickname || '未设置昵称' }}</h3>
            <dict-tag :options="statusOptions" :value="detail.status" />
          </div>
        </div>
        <el-descriptions :column="1" border class="detail-info">
          <el-descriptions-item label="用户 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ detail.nickname || '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <dict-tag :options="statusOptions" :value="detail.status" />
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ parseTime(detail.createTime) }}</el-descriptions-item>
          <el-descriptions-item label="最近登录">{{ parseTime(detail.lastLoginTime) || '—' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="VoyaAiUser">
import { userApi } from '@/api/voyaai/user'

const { proxy } = getCurrentInstance()
const statusOptions = [
  { value: '0', label: '启用' },
  { value: '1', label: '停用' }
]

const query = reactive({ pageNum: 1, pageSize: 10, nickname: undefined, status: undefined })
const dateRange = ref([])
const rows = ref([]), total = ref(0), loading = ref(false), showSearch = ref(true)
const listError = ref('')
const detail = ref(null), detailOpen = ref(false)
let listVersion = 0

function filters() {
  return {
    ...query,
    nickname: query.nickname?.trim() || undefined,
    status: query.status || undefined,
    beginCreateTime: dateRange.value?.[0],
    endCreateTime: dateRange.value?.[1]
  }
}

async function loadList() {
  const version = ++listVersion
  loading.value = true
  listError.value = ''
  try {
    const r = await userApi.list(filters())
    if (version !== listVersion) return
    rows.value = r.rows
    total.value = r.total
    if (!r.rows.length && query.pageNum > 1) {
      query.pageNum = Math.max(1, Math.ceil(r.total / query.pageSize))
      await loadList()
    }
  } catch {
    if (version === listVersion) listError.value = '用户数据加载失败，请检查接口或权限后刷新重试。'
  } finally {
    if (version === listVersion) loading.value = false
  }
}

function search() { query.pageNum = 1; loadList() }
function resetSearch() {
  Object.assign(query, { pageNum: 1, nickname: undefined, status: undefined })
  dateRange.value = []
  loadList()
}

async function showDetail(row) {
  try {
    detail.value = (await userApi.detail(row.id)).data
    detailOpen.value = true
  } catch { /* Error already displayed by interceptor. */ }
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

.search-form .el-input {
  width: 180px;
}

.search-form .el-select {
  width: 140px;
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

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.detail-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
}

.detail-header-text h3 {
  margin: 0 0 8px;
  font-size: 18px;
}

.detail-info {
  margin-top: 0;
}
</style>