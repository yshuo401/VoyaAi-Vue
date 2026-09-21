<template>
  <div class="app-container">
    <div class="page-heading">
      <div>
        <h2>搜索历史</h2>
        <p>查看用户在平台上的历史搜索行为数据。</p>
      </div>
      <el-tag effect="plain">数据分析</el-tag>
    </div>

    <el-form v-show="showSearch" :model="query" :inline="true" class="search-form">
      <el-form-item label="搜索关键词">
        <el-input v-model="query.keyword" clearable maxlength="100" placeholder="输入关键词搜索" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="用户昵称">
        <el-input v-model="query.nickname" clearable maxlength="100" placeholder="输入用户昵称搜索" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="搜索时间">
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button v-hasPermi="['voyaai:searchHistory:remove']" plain type="danger" icon="Delete" :disabled="!selection.length || busy" @click="remove(selection)">批量删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>

    <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon class="mb8" />

    <el-table v-loading="loading" :data="rows" row-key="id" @selection-change="selection = $event">
      <el-table-column type="selection" width="48" />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="用户" min-width="140">
        <template #default="{ row }">
          <div class="user-cell">
            <img v-if="row.avatarUrl" :src="row.avatarUrl" class="user-avatar" />
            <span>{{ row.nickname || '—' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="搜索关键词" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tag effect="plain" size="default">{{ row.keyword || '—' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="搜索时间" width="170">
        <template #default="{ row }">{{ parseTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button v-hasPermi="['voyaai:searchHistory:query']" link type="primary" @click="showDetail(row)">详情</el-button>
          <el-button v-hasPermi="['voyaai:searchHistory:remove']" link type="danger" :disabled="busy" @click="remove([row])">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" :page-sizes="[10, 20, 50, 100]" @pagination="loadList" />

    <el-drawer v-model="detailOpen" title="搜索详情" size="480px">
      <template v-if="detail">
        <el-descriptions :column="1" border class="detail-info">
          <el-descriptions-item label="记录 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="用户昵称">{{ detail.nickname || '—' }}</el-descriptions-item>
          <el-descriptions-item label="用户头像">
            <img v-if="detail.avatarUrl" :src="detail.avatarUrl" class="detail-avatar" />
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="搜索关键词">{{ detail.keyword || '—' }}</el-descriptions-item>
          <el-descriptions-item label="搜索时间">{{ parseTime(detail.createTime) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="VoyaAiSearchHistory">
import { searchHistoryApi as api } from '@/api/voyaai/searchHistory'

const { proxy } = getCurrentInstance()
const query = reactive({ pageNum: 1, pageSize: 10, keyword: undefined, nickname: undefined })
const dateRange = ref([])
const rows = ref([]), selection = ref([]), total = ref(0), loading = ref(false), showSearch = ref(true)
const listError = ref(''), busy = ref(false)
const detail = ref(null), detailOpen = ref(false)
let listVersion = 0

function filters() {
  return {
    ...query,
    keyword: query.keyword?.trim() || undefined,
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
    selection.value = []
    if (!r.rows.length && query.pageNum > 1) {
      query.pageNum = Math.max(1, Math.ceil(r.total / query.pageSize))
      await loadList()
    }
  } catch {
    if (version === listVersion) listError.value = '搜索历史加载失败，请检查接口或权限后刷新重试。'
  } finally {
    if (version === listVersion) loading.value = false
  }
}

function search() { query.pageNum = 1; loadList() }
function resetSearch() {
  Object.assign(query, { pageNum: 1, keyword: undefined, nickname: undefined })
  dateRange.value = []
  loadList()
}

async function showDetail(row) {
  try {
    detail.value = (await api.detail(row.id)).data
    detailOpen.value = true
  } catch {}
}

async function remove(items) {
  if (busy.value) return
  if (!items.length) return
  if (items.length > 100) return proxy.$modal.msgWarning('每次最多删除100条')
  busy.value = true
  try {
    await proxy.$modal.confirm(`确认删除 ${items.length === 1 ? `关键词「${items[0].keyword || '搜索记录'}」` : `选中的 ${items.length} 条搜索记录`}？删除后不可恢复。`)
    await api.remove(items.map(x => x.id))
    proxy.$modal.msgSuccess('删除成功')
    await loadList()
  } catch {}
  finally { busy.value = false }
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

.detail-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.detail-info {
  margin-top: 20px;
}
</style>