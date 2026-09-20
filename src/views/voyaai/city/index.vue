<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="城市名称" prop="name"><el-input v-model="queryParams.name" placeholder="请输入城市名称" clearable @keyup.enter="handleQuery" /></el-form-item>
      <el-form-item label="省份ID" prop="provinceId"><el-input-number v-model="queryParams.provinceId" :min="1" controls-position="right" /></el-form-item>
      <el-form-item label="状态" prop="status"><el-select v-model="queryParams.status" clearable placeholder="请选择"><el-option v-for="d in sys_normal_disable" :key="d.value" :label="d.label" :value="d.value" /></el-select></el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button><el-button icon="Refresh" @click="resetQuery">重置</el-button></el-form-item>
    </el-form>
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['voyaai:city:add']">新增</el-button></el-col>
      <el-col :span="1.5"><el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['voyaai:city:edit']">修改</el-button></el-col>
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['voyaai:city:remove']">删除</el-button></el-col>
      <el-col :span="1.5"><el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['voyaai:city:export']">导出</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
    </el-row>
    <el-table v-loading="loading" :data="cityList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" /><el-table-column label="ID" prop="id" align="center" width="80" />
      <el-table-column label="封面" prop="coverImage" align="center" width="90"><template #default="s"><image-preview v-if="s.row.coverImage" :src="s.row.coverImage" :width="50" :height="50" /></template></el-table-column>
      <el-table-column label="城市名称" prop="name" align="center" /><el-table-column label="省份ID" prop="provinceId" align="center" />
      <el-table-column label="浏览量" prop="viewCount" align="center" /><el-table-column label="排序" prop="sort" align="center" />
      <el-table-column label="状态" prop="status" align="center"><template #default="s"><dict-tag :options="sys_normal_disable" :value="s.row.status" /></template></el-table-column>
      <el-table-column label="创建时间" prop="createTime" align="center" width="180"><template #default="s">{{ parseTime(s.row.createTime) }}</template></el-table-column>
      <el-table-column label="操作" align="center" width="180"><template #default="s"><el-button link type="primary" icon="Edit" @click="handleUpdate(s.row)" v-hasPermi="['voyaai:city:edit']">修改</el-button><el-button link type="danger" icon="Delete" @click="handleDelete(s.row)" v-hasPermi="['voyaai:city:remove']">删除</el-button></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="cityRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="省份ID" prop="provinceId"><el-input-number v-model="form.provinceId" :min="1" /></el-form-item>
        <el-form-item label="城市名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="封面图片" prop="coverImage"><image-upload v-model="form.coverImage" :limit="1" /></el-form-item>
        <el-form-item label="城市简介"><el-input v-model="form.description" type="textarea" /></el-form-item>
        <el-form-item label="纬度"><el-input v-model="form.latitude" /></el-form-item><el-form-item label="经度"><el-input v-model="form.longitude" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="状态"><el-radio-group v-model="form.status"><el-radio v-for="d in sys_normal_disable" :key="d.value" :value="d.value">{{ d.label }}</el-radio></el-radio-group></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="submitForm">确定</el-button><el-button @click="cancel">取消</el-button></template>
    </el-dialog>
  </div>
</template>
<script setup name="VoyaAiCity">
import { listCity, getCity, addCity, updateCity, delCity } from '@/api/voyaai/city'
const { proxy } = getCurrentInstance(); const { sys_normal_disable } = useDict('sys_normal_disable')
const cityList=ref([]), open=ref(false), loading=ref(true), showSearch=ref(true), ids=ref([]), single=ref(true), multiple=ref(true), total=ref(0), title=ref('')
const data=reactive({ form:{}, queryParams:{pageNum:1,pageSize:10,name:undefined,provinceId:undefined,status:undefined}, rules:{provinceId:[{required:true,message:'省份ID不能为空',trigger:'blur'}],name:[{required:true,message:'城市名称不能为空',trigger:'blur'}]} }); const {form,queryParams,rules}=toRefs(data)
function getList(){loading.value=true;listCity(queryParams.value).then(r=>{cityList.value=r.rows;total.value=r.total;loading.value=false})}
function reset(){form.value={id:undefined,provinceId:undefined,name:undefined,coverImage:undefined,description:undefined,latitude:undefined,longitude:undefined,sort:0,status:'0',remark:undefined};proxy.resetForm('cityRef')}
function resetQuery(){proxy.resetForm('queryRef');queryParams.value.pageNum=1;getList()} function handleQuery(){queryParams.value.pageNum=1;getList()} function cancel(){open.value=false;reset()}
function handleSelectionChange(s){ids.value=s.map(i=>i.id);single.value=s.length!==1;multiple.value=!s.length} function handleAdd(){reset();title.value='新增城市';open.value=true}
function handleUpdate(row){reset();getCity(row.id||ids.value[0]).then(r=>{form.value=r.data;open.value=true;title.value='编辑城市'})}
function submitForm(){proxy.$refs.cityRef.validate(v=>{if(!v)return;const p=form.value.id?updateCity(form.value):addCity(form.value);p.then(()=>{proxy.$modal.msgSuccess('保存成功');open.value=false;getList()})})}
function handleDelete(row){const values=row?.id?[row.id]:ids.value;proxy.$modal.confirm('确认删除选中的城市吗？').then(()=>delCity(values.join(','))).then(()=>{proxy.$modal.msgSuccess('删除成功');getList()})}
function handleExport(){proxy.download('voyaai/city/export',{...queryParams.value},`city_${Date.now()}.xlsx`)}
getList()
</script>
