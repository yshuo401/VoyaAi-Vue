<template>
  <div class="app-container">
    <div class="page-heading">
      <div>
        <h2>标签管理</h2>
        <p>维护攻略等模块的标签数据，支持按类型分组、排序和启用/停用控制。</p>
      </div>
      <el-tag effect="plain">基础资料</el-tag>
    </div>

    <el-form v-show="showSearch" :model="query" :inline="true" class="search-form">
      <el-form-item label="标签名称">
        <el-input v-model="query.name" clearable maxlength="50" placeholder="输入标签名称搜索" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="标签类型">
        <el-input v-model="query.type" clearable maxlength="30" placeholder="输入类型搜索" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部状态">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
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
      <el-col :span="1.5">
        <el-button v-hasPermi="['voyaai:tag:add']" type="primary" icon="Plus" @click="openAdd">新增标签</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button v-hasPermi="['voyaai:tag:remove']" plain type="danger" icon="Delete" :disabled="!selection.length || busy" @click="remove(selection)">批量删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>

    <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon class="mb8" />

    <el-table v-loading="loading" :data="rows" row-key="id" @selection-change="selection = $event">
      <el-table-column type="selection" width="48" />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="标签名称" min-width="140" />
      <el-table-column label="标签类型" width="120">
        <template #default="{ row }">
          <el-tag type="primary" size="small">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="80" align="center" />
      <el-table-column label="状态" width="95">
        <template #default="{ row }">
          <dict-tag :options="statusOptions" :value="row.status" />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ parseTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button v-hasPermi="['voyaai:tag:query']" link type="primary" @click="showDetail(row)">查看</el-button>
          <el-button v-hasPermi="['voyaai:tag:edit']" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-dropdown v-hasPermi="['voyaai:tag:edit']" @command="value => changeStatus(row, value)">
            <el-button link type="primary">状态</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="item in statusOptions" :key="item.value" :command="item.value" :disabled="row.status === item.value">{{ item.label }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button v-hasPermi="['voyaai:tag:remove']" link type="danger" @click="remove([row])">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" :page-sizes="[10, 20, 50, 100]" @pagination="loadList" />

    <el-dialog v-model="dialogOpen" :title="form.id ? '编辑标签' : '新增标签'" width="600px" :close-on-click-modal="false" append-to-body @opened="focusFirstInput">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
        <el-form-item prop="name" label="标签名称">
          <el-input ref="nameInput" v-model="form.name" maxlength="50" show-word-limit placeholder="例如：美食、亲子、人文" />
        </el-form-item>
        <el-form-item prop="type" label="标签类型">
          <el-input v-model="form.type" maxlength="30" show-word-limit placeholder="例如：guide（攻略）" />
          <div class="field-help">同类型下标签名称不能重复。攻略页面传参 <code>type=guide</code> 查询该类型标签。</div>
        </el-form-item>
        <el-form-item prop="sort" label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="2147483647" :precision="0" />
          <span class="field-help">数值越大越靠前</span>
        </el-form-item>
        <el-form-item prop="status" label="状态">
          <el-radio-group v-model="form.status">
            <el-radio v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item prop="remark" label="备注">
          <el-input v-model="form.remark" type="textarea" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false" :disabled="saving">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailOpen" title="标签详情" size="520px">
      <template v-if="detail">
        <el-descriptions :column="1" border class="detail-info">
          <el-descriptions-item label="标签 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="标签名称">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item label="标签类型">
            <el-tag type="primary" size="small">{{ detail.type }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="排序">{{ detail.sort }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <dict-tag :options="statusOptions" :value="detail.status" />
          </el-descriptions-item>
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

<script setup name="VoyaAiTag">
import { tagApi } from '@/api/voyaai/tag'

const { proxy } = getCurrentInstance()
const statusOptions = [
  { value: '0', label: '启用' },
  { value: '1', label: '停用' }
]

const query = reactive({ pageNum: 1, pageSize: 10, name: undefined, type: undefined, status: undefined })
const dateRange = ref([])
const rows = ref([]), selection = ref([]), total = ref(0), loading = ref(false), showSearch = ref(true)
const listError = ref(''), busy = ref(false)
const detail = ref(null), detailOpen = ref(false)
const dialogOpen = ref(false), saving = ref(false), formRef = ref(null), nameInput = ref(null)
const form = ref({})
let listVersion = 0

const required = message => ({ required: true, message, trigger: 'change' })
const rules = {
  name: [required('请输入标签名称'), { whitespace: true, message: '名称不能只有空格', trigger: 'blur' }],
  type: [required('请输入标签类型'), { whitespace: true, message: '类型不能只有空格', trigger: 'blur' }],
  sort: [required('请输入排序')],
  status: [required('请选择状态')]
}

function filters() {
  return {
    ...query,
    name: query.name?.trim() || undefined,
    type: query.type?.trim() || undefined,
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
    const r = await tagApi.list(filters())
    if (version !== listVersion) return
    rows.value = r.rows
    total.value = r.total
    selection.value = []
    if (!r.rows.length && query.pageNum > 1) {
      query.pageNum = Math.max(1, Math.ceil(r.total / query.pageSize))
      await loadList()
    }
  } catch {
    if (version === listVersion) listError.value = '标签数据加载失败，请检查接口或权限后刷新重试。'
  } finally {
    if (version === listVersion) loading.value = false
  }
}

function search() { query.pageNum = 1; loadList() }
function resetSearch() {
  Object.assign(query, { pageNum: 1, name: undefined, type: undefined, status: undefined })
  dateRange.value = []
  loadList()
}

async function showDetail(row) {
  try {
    detail.value = (await tagApi.detail(row.id)).data
    detailOpen.value = true
  } catch { /* Error already displayed by interceptor. */ }
}

function focusFirstInput() {
  nextTick(() => {
    if (nameInput.value) nameInput.value.focus()
  })
}

function resetForm() {
  form.value = { name: '', type: '', sort: 0, status: '0', remark: '' }
}

function openAdd() {
  resetForm()
  dialogOpen.value = true
}

function openEdit(row) {
  resetForm()
  form.value = {
    id: row.id,
    name: row.name,
    type: row.type,
    sort: row.sort,
    status: row.status,
    remark: row.remark || ''
  }
  dialogOpen.value = true
}

async function save() {
  if (saving.value) return
  try {
    await formRef.value.validate()
  } catch { return }
  saving.value = true
  try {
    const payload = { ...form.value }
    delete payload.createTime
    delete payload.updateTime
    if (payload.id) {
      await tagApi.update(payload)
      proxy.$modal.msgSuccess('修改成功')
    } else {
      await tagApi.add(payload)
      proxy.$modal.msgSuccess('新增成功')
    }
    dialogOpen.value = false
    await loadList()
  } catch { /* API error displayed by interceptor. For 409, the interceptor shows the message. */ }
  finally { saving.value = false }
}

async function changeStatus(row, status) {
  if (row.status === status) return
  try {
    await tagApi.changeStatus({ id: row.id, status })
    proxy.$modal.msgSuccess('状态变更成功')
    await loadList()
  } catch { /* Error displayed by interceptor. */ }
}

async function remove(items) {
  if (busy.value) return
  if (!items.length) return
  if (items.length > 100) return proxy.$modal.msgWarning('每次最多删除100条')
  busy.value = true
  try {
    await proxy.$modal.confirm(`确认删除 ${items.length === 1 ? `标签「${items[0].name}」` : `选中的 ${items.length} 个标签`}？删除后不可恢复。`)
    await tagApi.remove(items.map(x => x.id))
    proxy.$modal.msgSuccess('删除成功')
    await loadList()
  } catch { /* Cancel and API failures leave the existing rows intact. */ }
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
  width: 180px;
}

.search-form .el-select {
  width: 140px;
}

.field-help {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-left: 8px;
}

.field-help code {
  background: var(--el-fill-color);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}

.detail-info {
  margin-top: 20px;
}
</style>