# VoyaAi 旅游管理系统从零到一接口契约

版本：V1.3  
编写日期：2026-09-21  
适用项目：VoyaAi 后端、RuoYi-Vue3 管理端、VoyaAI-app 微信小程序

## 1 文档目的

本文档是 VoyaAi 旅游管理系统的接口唯一约定。后端、网页前端和微信小程序都按照本文档中的 URL、请求字段、响应字段、权限、状态码和数据规则开发。接口标记为“已实现”的内容可以直接联调；标记为“规划中”的内容是数据库和产品设计已经确定、但当前后端尚未提供的接口，前端可以按照契约预留调用层，不应在联调前假设它已经可用。

系统由三个部分组成：

1. 后端 `RuoYi-Vue-springboot`：Spring Boot、MyBatis、MySQL、Redis、若依权限体系。
2. 管理端 `RuoYi-Vue3`：管理员维护国家、省份、城市、景点、攻略以及后续运营数据。
3. 微信小程序 `VoyaAI-app`：面向游客浏览目的地、景点、攻略，登录后使用收藏、点赞、评论、行程和 AI 功能。

## 2 环境和基础约定

### 2.1 地址

本地后端默认：`http://localhost:8080`。网页端通过 Vite 代理访问后端，小程序开发阶段在 `app.js` 中使用 `http://localhost:8080`。真机调试和正式发布必须改为备案 HTTPS 域名，并在微信公众平台配置 request 合法域名。

管理端基础路径：`/voyaai`。  
小程序基础路径：`/app/voyaai`。  
通用文件接口基础路径：`/common`。

### 2.2 JSON 响应

普通成功响应统一使用若依 `AjaxResult`：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

无数据的新增、修改、删除、状态操作通常返回：

```json
{
  "code": 200,
  "msg": "操作成功"
}
```

失败响应：

```json
{
  "code": 400,
  "msg": "参数校验失败"
}
```

管理端分页接口使用 `TableDataInfo`，不是 `data.rows`：

```json
{
  "code": 200,
  "msg": "查询成功",
  "total": 2,
  "rows": []
}
```

小程序 `utils/api.js` 会自动解包 `body.data`。因此，小程序接口的 `data` 必须直接是数组，或明确的分页对象。

### 2.3 认证

#### 管理员认证

网页端登录后，axios 自动发送：

```http
Authorization: Bearer <若依管理员Token>
```

所有 `/voyaai/**` 管理接口都需要管理员 Token，并且还需要对应菜单权限。权限缺失返回 `403`，登录失效返回 `401`。

#### 小程序认证

小程序登录接口返回独立 Token：

```http
Authorization: Bearer va_<43位URL安全随机字符>
```

该 Token 与若依管理员 Token 完全分离，默认 Redis 有效期 7 天。公开读取接口不需要 Token；用户资料、收藏、点赞、评论、行程等接口必须携带小程序 Token。

### 2.4 通用状态码

| HTTP/业务码 | 含义 | 前端处理 |
|---|---|---|
| 200 | 成功 | 读取 data 或 rows |
| 400 | 参数格式或业务校验错误 | 显示 msg，不重试 |
| 401 | Token 缺失、失效或用户停用 | 清除 Token，跳转登录 |
| 403 | 没有权限或账号不可用 | 显示无权操作 |
| 404 | 资源不存在、已删除或不可公开 | 显示空状态 |
| 409 | 重复数据、存在关联数据、并发冲突 | 显示冲突原因，刷新后处理 |
| 500 | 未预期服务器错误 | 显示错误并记录日志 |
| 503 | Redis/微信登录服务暂时不可用 | 提示稍后重试 |

### 2.5 分页和排序

管理端所有分页请求默认：`pageNum=1`、`pageSize=10`，`pageSize` 最大 100。  
小程序攻略分页默认：`pageNum=1`、`pageSize=10`，最大 50。

地区和景点公开列表默认按 `sort DESC, id DESC`。攻略推荐按 `sort DESC, viewCount DESC, publishTime DESC, id DESC`；最新按发布时间倒序；最热按浏览量、点赞量倒序。排序值越大越靠前。

### 2.6 时间和数值

- 日期查询使用 `yyyy-MM-dd`。
- 日期时间响应使用 `yyyy-MM-dd HH:mm:ss`。
- 经纬度使用十进制，纬度范围 `-90..90`，经度范围 `-180..180`。
- 金额使用最多 8 位整数、2 位小数，JSON 中建议传数字而不是带单位的字符串。
- `status` 是字符：`0` 表示启用/上架，`1` 表示停用/下架。

## 3 数据模型总览

数据库已经规划的业务表如下：

| 表 | 用途 | 当前后端状态 |
|---|---|---|
| `voya_ai_user` | 微信小程序用户 | 已实现登录、资料和头像 |
| `voya_ai_country` | 国家 | 已实现 |
| `voya_ai_province` | 省份 | 已实现 |
| `voya_ai_city` | 城市 | 已实现 |
| `voya_ai_attraction` | 景点 | 已实现 |
| `voya_ai_attraction_image` | 景点多图 | 已实现 |
| `voya_ai_guide` | 旅游攻略 | 已实现管理和公开读取 |
| `voya_ai_tag` | 标签 | 已有表，当前提供公开标签读取 |
| `voya_ai_guide_tag` | 攻略标签关联 | 已接入攻略新增、修改和详情 |
| `voya_ai_favorite` | 收藏 | 已实现小程序收藏、取消、状态查询和管理端查询、删除 |
| `voya_ai_like` | 点赞 | 已实现小程序景点、攻略点赞、取消、状态查询和管理端查询、删除 |
| `voya_ai_comment` | 评论 | 数据表已有，接口规划中 |
| `voya_ai_view_log` | 浏览记录 | 已实现匿名浏览记录、登录用户历史查询和清空、管理端查询 |
| `voya_ai_search_history` | 搜索历史 | 数据表已有，接口规划中 |
| `voya_ai_trip` | 行程主表 | 数据表已有，接口规划中 |
| `voya_ai_trip_day` | 行程天 | 数据表已有，接口规划中 |
| `voya_ai_trip_item` | 行程项 | 数据表已有，接口规划中 |
| `voya_ai_trip_share` | 行程分享 | 数据表已有，接口规划中 |
| `voya_ai_message` | 消息通知 | 数据表已有，接口规划中 |
| `voya_ai_feedback` | 意见反馈 | 数据表已有，接口规划中 |

## 4 已实现管理端接口

### 4.1 国家管理

权限前缀：`voyaai:country`。网页路径：`/voyaai/country`。

#### GET `/voyaai/country/list`

用途：分页查询国家。

权限：`voyaai:country:list`。

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| pageNum | integer | 否 | 默认 1，最小 1 |
| pageSize | integer | 否 | 默认 10，1 至 100 |
| name | string | 否 | 国家名称模糊搜索，最多 200 字 |
| status | string | 否 | `0` 启用，`1` 停用 |
| beginCreateTime | date | 否 | 创建时间起始 |
| endCreateTime | date | 否 | 创建时间结束，包含当天 |

返回 `TableDataInfo`，`rows` 字段为 `CountryVO`：`id`、`name`、`code`、`sort`、`status`、`remark`、`createBy`、`createTime`、`updateBy`、`updateTime`。

#### GET `/voyaai/country/{id}`

用途：查询国家详情。权限：`voyaai:country:query`。返回 `data: CountryVO`。

#### POST `/voyaai/country`

用途：新增国家。权限：`voyaai:country:add`。

请求 JSON：

```json
{
  "name": "中国",
  "code": "CN",
  "sort": 10,
  "status": "0",
  "remark": ""
}
```

规则：`name` 必填且最多 100 字；`code` 最多 20 字；`sort >= 0`；名称和编码不能重复；新增不传 `id`。

#### PUT `/voyaai/country`

用途：修改国家。权限：`voyaai:country:edit`。请求体与新增相同并增加 `id`。修改时 `id` 必填。

#### PUT `/voyaai/country/changeStatus`

用途：启用或停用国家。权限：`voyaai:country:edit`。

```json
{"id": 1, "status": "0"}
```

停用国家后，所属省份、城市、景点不能被新建或上架；公开接口不会返回其下数据。

#### DELETE `/voyaai/country/{ids}`

用途：逻辑删除，多个 ID 以逗号分隔。权限：`voyaai:country:remove`。存在省份关联时返回 `409`，不会删除。

#### GET `/voyaai/country/options`

用途：级联选择国家。权限：国家、或省份/城市/景点相关查询权限之一。

Query：`countryId` 可选；`enabledOnly` 默认 `true`。返回 `data` 为轻量选项数组：`[{"id":1,"name":"中国","status":"0"}]`。

### 4.2 省份管理

权限前缀：`voyaai:province`。网页路径：`/voyaai/province`。

#### GET `/voyaai/province/list`

Query：`pageNum`、`pageSize`、`name`、`status`、`countryId`、`beginCreateTime`、`endCreateTime`。返回 `ProvinceVO`：`id`、`countryId`、`countryName`、`name`、`code`、`sort`、`status`、`remark`、审计字段。

#### GET `/voyaai/province/{id}`

权限：`voyaai:province:query`。返回 `ProvinceVO`。

#### POST `/voyaai/province`

权限：`voyaai:province:add`。

```json
{
  "countryId": 1,
  "name": "四川省",
  "code": "SC",
  "sort": 10,
  "status": "0",
  "remark": ""
}
```

国家必须存在且启用；同一国家下名称不能重复；新增不传 `id`。

#### PUT `/voyaai/province`

权限：`voyaai:province:edit`。在上述请求体中增加 `id`。

#### PUT `/voyaai/province/changeStatus`

权限：`voyaai:province:edit`。请求：`{"id":1,"status":"1"}`。启用时会再次校验所属国家。

#### DELETE `/voyaai/province/{ids}`

权限：`voyaai:province:remove`。有城市关联时返回 `409`。

#### GET `/voyaai/province/options`

Query：`countryId` 必填；`enabledOnly` 默认 `true`。返回省份轻量选项。

### 4.3 城市管理

权限前缀：`voyaai:city`。网页路径：`/voyaai/city`。

#### GET `/voyaai/city/list`

Query：`pageNum`、`pageSize`、`name`、`status`、`countryId`、`provinceId`、`beginCreateTime`、`endCreateTime`。返回 `CityVO`：

```json
{
  "id": 10,
  "provinceId": 2,
  "countryId": 1,
  "countryName": "中国",
  "provinceName": "四川省",
  "name": "成都",
  "coverImage": "/profile/upload/2026/09/cover.jpg",
  "description": "城市简介",
  "latitude": 30.5728,
  "longitude": 104.0668,
  "sort": 10,
  "status": "0",
  "viewCount": 0,
  "remark": ""
}
```

#### GET `/voyaai/city/{id}`

权限：`voyaai:city:query`。返回 `CityVO`。

#### POST `/voyaai/city`

权限：`voyaai:city:add`。

```json
{
  "provinceId": 2,
  "name": "成都",
  "coverImage": "/profile/upload/2026/09/cover.jpg",
  "description": "城市简介",
  "latitude": 30.5728,
  "longitude": 104.0668,
  "sort": 10,
  "status": "0",
  "remark": ""
}
```

规则：省份和其所属国家必须启用；同一省份下城市名称不能重复；经纬度可不填但填写时必须在合法范围内。

#### PUT `/voyaai/city`

权限：`voyaai:city:edit`。请求体增加 `id`。

#### PUT `/voyaai/city/changeStatus`

权限：`voyaai:city:edit`。请求：`{"id":10,"status":"0"}`。上架前校验省份和国家均启用。

#### DELETE `/voyaai/city/{ids}`

权限：`voyaai:city:remove`。存在景点、攻略或行程关联时返回 `409`。

#### POST `/voyaai/city/export`

权限：`voyaai:city:export`。网页端用 `proxy.download` 以 `application/x-www-form-urlencoded` 提交筛选参数，返回 Excel 二进制流。

### 4.4 景点管理

权限前缀：`voyaai:attraction`。网页路径：`/voyaai/attraction`。

#### GET `/voyaai/attraction/list`

Query：`pageNum`、`pageSize`、`name`、`countryId`、`provinceId`、`cityId`、`status`、`beginCreateTime`、`endCreateTime`。返回 `AttractionVO`，主要字段：

`id`、`cityId`、`cityName`、`provinceId`、`provinceName`、`countryId`、`countryName`、`name`、`coverImage`、`description`、`address`、`latitude`、`longitude`、`ticketPrice`、`openingHours`、`recommendedDuration`、`rating`、`viewCount`、`likeCount`、`favoriteCount`、`commentCount`、`images`、`sort`、`status`、审计字段。

#### GET `/voyaai/attraction/{id}`

权限：`voyaai:attraction:query` 或 `voyaai:attraction:edit`。返回完整 `AttractionVO`，包含 `images` 数组。

#### POST `/voyaai/attraction`

权限：`voyaai:attraction:add`。

```json
{
  "cityId": 10,
  "name": "宽窄巷子",
  "coverImage": "/profile/upload/2026/09/cover.jpg",
  "images": ["/profile/upload/2026/09/a.jpg", "/profile/upload/2026/09/b.jpg"],
  "description": "景点简介",
  "address": "成都市青羊区",
  "latitude": 30.6636,
  "longitude": 104.0668,
  "ticketPrice": 0,
  "openingHours": "全天",
  "recommendedDuration": 120,
  "rating": 4.8,
  "sort": 10,
  "status": "0",
  "remark": ""
}
```

规则：城市必须启用；名称最多 200 字；门票不能小于 0；建议时长不能小于 0；评分 `0..5`；`images` 最多 9 张，每项最多 500 字；同一城市下景点名称不能重复。

#### PUT `/voyaai/attraction`

权限：`voyaai:attraction:edit`。在新增 JSON 中增加 `id`。

#### PUT `/voyaai/attraction/changeStatus`

权限：`voyaai:attraction:edit`。请求：`{"id":100,"status":"0"}`。上架前校验城市、省份、国家均启用。

#### DELETE `/voyaai/attraction/{ids}`

权限：`voyaai:attraction:remove`。存在行程项、收藏、点赞或评论关联时返回 `409`。

#### POST `/voyaai/attraction/export`

权限：`voyaai:attraction:export`。返回 Excel。

#### GET `/voyaai/attraction/cityOptions`

Query：`provinceId` 必填。返回：`[{"id":10,"name":"成都","status":"0"}]`。状态会综合城市、省份、国家状态。

### 4.5 攻略管理

权限前缀：`voyaai:guide`。网页路径：`/voyaai/guide`。

#### GET `/voyaai/guide/list`

Query：`pageNum`、`pageSize`、`name`、`cityId`、`guideType`、`publishStatus`、`beginCreateTime`、`endCreateTime`。返回攻略 `GuideVO` 分页。

#### GET `/voyaai/guide/{id}`

权限：`voyaai:guide:query` 或 `voyaai:guide:edit`。返回完整正文、标签 ID 和标签名称。

#### POST `/voyaai/guide`

权限：`voyaai:guide:add`。请求：

```json
{
  "cityId": 10,
  "title": "成都三日游",
  "coverImage": "/profile/upload/guide/cover.jpg",
  "summary": "适合第一次到成都的自由行路线",
  "content": "第一天\n抵达后游览市区。",
  "guideType": "自由行",
  "days": 3,
  "budgetMin": 1200,
  "budgetMax": 2200,
  "publishStatus": "0",
  "sort": 10,
  "remark": "",
  "tagIds": [1, 3]
}
```

规则：标题最多 200 字且正文必填；正文最多 1,000,000 字；建议天数 1 至 365；最低预算不能高于最高预算；发布状态为 `0` 草稿、`1` 已发布、`2` 已下架；标签最多 20 个，标签必须启用且未删除；标题在同一城市下不能重复。

#### PUT `/voyaai/guide`

权限：`voyaai:guide:edit`。请求体增加 `id`，其他字段同新增。标签关联采用“先删除旧关联，再保存新数组”的整体替换策略。

#### PUT `/voyaai/guide/changeStatus`

权限：`voyaai:guide:edit`。请求：`{"id":1,"publishStatus":"1"}`。发布时自动写入发布时间；草稿和下架时清空发布时间。

#### DELETE `/voyaai/guide/{ids}`

权限：`voyaai:guide:remove`。有关联收藏、点赞、评论时返回 `409`。

#### POST `/voyaai/guide/export`

权限：`voyaai:guide:export`。返回 Excel。

### 4.6 收藏管理

权限前缀：`voyaai:favorite`。网页路径：`/voyaai/favorite`。收藏数据由小程序端写入，管理端只做查询和删除。

#### GET `/voyaai/favorite/list`

权限：`voyaai:favorite:list`。Query：`pageNum`、`pageSize`、`targetType`、`nickname`、`beginCreateTime`、`endCreateTime`。`targetType` 只接受 `city`、`attraction`、`guide`、`trip`，其他值按不筛选处理；时间范围包含首尾两天，`endCreateTime` 当天 23:59:59 的收藏也算在内。返回分页，字段如下。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | Long | 收藏 ID |
| `userId` | Long | 收藏用户 ID |
| `nickname` | String | 用户昵称 |
| `avatarUrl` | String | 用户头像 |
| `targetType` | String | `city`、`attraction`、`guide`、`trip` |
| `targetId` | Long | 目标 ID |
| `targetTitle` | String | 城市名、景点名或攻略标题；行程接口未实现时为 `null` |
| `targetCoverImage` | String | 目标封面 |
| `targetSummary` | String | 攻略摘要，其他类型为 `null` |
| `createTime` | String | 收藏时间，`yyyy-MM-dd HH:mm:ss` |

#### GET `/voyaai/favorite/{id}`

权限：`voyaai:favorite:query`。返回单条收藏，字段同上。

#### DELETE `/voyaai/favorite/{ids}`

权限：`voyaai:favorite:remove`。`ids` 为逗号分隔的收藏 ID，物理删除且不可恢复。删除时同步扣减景点、攻略的收藏量，不做关联校验。

### 4.7 点赞管理

权限前缀：`voyaai:like`。网页路径：`/voyaai/like`。点赞数据由小程序端写入，管理端只做查询和删除。

#### GET `/voyaai/like/list`

权限：`voyaai:like:list`。Query：`pageNum`、`pageSize`、`targetType`、`nickname`、`beginCreateTime`、`endCreateTime`。`targetType` 只接受 `attraction`、`guide`，其他值按不筛选处理；时间范围包含首尾两天。返回分页，字段如下。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | Long | 点赞 ID |
| `userId` | Long | 点赞用户 ID |
| `nickname` | String | 用户昵称 |
| `avatarUrl` | String | 用户头像 |
| `targetType` | String | `attraction`、`guide` |
| `targetId` | Long | 目标 ID |
| `targetTitle` | String | 景点名或攻略标题 |
| `targetCoverImage` | String | 目标封面 |
| `targetSummary` | String | 攻略摘要，景点为 `null` |
| `createTime` | String | 点赞时间，`yyyy-MM-dd HH:mm:ss` |

一行点赞记录代表该用户当前点赞了该目标，取消点赞会删除记录，因此列表不返回点赞状态字段。

#### GET `/voyaai/like/{id}`

权限：`voyaai:like:query`。返回单条点赞，字段同上。

#### DELETE `/voyaai/like/{ids}`

权限：`voyaai:like:remove`。`ids` 为逗号分隔的点赞 ID，物理删除且不可恢复，同时扣减景点、攻略的点赞量。

### 4.8 浏览记录

权限前缀：`voyaai:viewLog`。网页路径：`/voyaai/viewLog`。浏览记录由小程序端写入，管理端只做查询。

#### GET `/voyaai/viewLog/list`

权限：`voyaai:viewLog:list`。Query：`pageNum`、`pageSize`、`targetType`、`nickname`、`beginCreateTime`、`endCreateTime`。`targetType` 只接受 `city`、`attraction`、`guide`，其他值按不筛选处理；时间范围包含首尾两天。返回分页字段：`id`、`userId`、`nickname`、`avatarUrl`、`targetType`、`targetId`、`targetTitle`、`targetCoverImage`、`createTime`。匿名浏览时 `userId`、`nickname`、`avatarUrl` 为 `null`。

#### GET `/voyaai/viewLog/{id}`

权限：`voyaai:viewLog:query`。返回单条浏览记录，字段同上。IP 和 User-Agent 保存在数据库，但不在接口中返回。

## 5 已实现小程序接口

### 5.1 微信登录

#### POST `/app/voyaai/auth/login`

无需 Token。小程序先调用 `wx.login()`，将返回的临时 `code` 传给后端。

请求：

```json
{"code":"微信临时登录凭证"}
```

返回：

```json
{
  "code": 200,
  "data": {
    "token": "va_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "tokenType": "Bearer",
    "expiresIn": 604800,
    "user": {"id": 1, "nickname": "微信用户", "avatarUrl": null}
  }
}
```

后端使用环境变量 `VOYAAI_WECHAT_APP_ID`、`VOYAAI_WECHAT_APP_SECRET` 换取 OpenID，AppSecret 不能写入 GitHub。

#### POST `/app/voyaai/auth/logout`

需要小程序 Token。服务端删除 Redis 会话并返回空成功响应。客户端退出时应同时清理本地 Token。

### 5.2 小程序用户资料

#### GET `/app/voyaai/me`

需要 Token。返回：`{"id":1,"nickname":"游客","avatarUrl":"/profile/app-avatar/..."}`。

#### PUT `/app/voyaai/me`

需要 Token。请求：

```json
{"nickname":"新的昵称","avatarUrl":"/profile/app-avatar/1/2026/09/uuid.jpg"}
```

昵称必填，最多 100 字；头像地址只能使用当前用户通过头像上传接口得到的路径。

#### POST `/app/voyaai/me/avatar`

需要 Token，`multipart/form-data`，字段名必须是 `file`。限制：JPG/PNG，最大 5 MB，宽高不超过 4096。返回 `data` 为更新后的用户资料。服务器文件目录为配置项 `RuoYiConfig.getProfile()/app-avatar/{userId}`，数据库只保存访问路径。

### 5.3 城市公开查询

#### GET `/app/voyaai/cities`

无需 Token。Query：`keyword` 可选，最多 100 字。返回数组，每项为启用城市的公开字段：`id`、`name`、`provinceId`、`provinceName`、`countryId`、`countryName`、`coverImage`、`description`、`latitude`、`longitude`、`sort`、`viewCount`。

后端只返回城市、省份、国家都启用且未逻辑删除的数据。

### 5.4 景点公开查询

#### GET `/app/voyaai/cities/{cityId}/attractions`

无需 Token。Query：`keyword` 可选，最多 100 字。返回数组，字段包括 `id`、`cityId`、`cityName`、`name`、`coverImage`、`description`、`address`、`latitude`、`longitude`、`ticketPrice`、`openingHours`、`recommendedDuration`、`rating`、`sort`、`viewCount` 等。

#### GET `/app/voyaai/attractions/{id}`

无需 Token。返回景点完整对象并包含 `images` 数组。只有景点、城市、省份和国家全部启用时可见。

### 5.5 攻略公开查询

#### GET `/app/voyaai/guides`

无需 Token。Query：`pageNum`、`pageSize`、`cityId`、`keyword`、`guideType`、`sort`。`sort` 只能是 `recommend`、`latest`、`hot`。

返回必须是：

```json
{
  "code": 200,
  "data": {
    "rows": [{
      "id": 1,
      "cityId": 10,
      "cityName": "成都",
      "title": "成都三日游",
      "coverImage": "/profile/upload/guide/cover.jpg",
      "summary": "适合第一次到成都",
      "guideType": "自由行",
      "days": 3,
      "budgetMin": 1200,
      "budgetMax": 2200,
      "publishTime": "2026-09-21 12:00:00",
      "viewCount": 100,
      "likeCount": 12,
      "favoriteCount": 8,
      "tagNames": "美食,亲子"
    }],
    "total": 1
  }
}
```

只有 `publishStatus=1` 且地区链路有效的攻略返回给小程序。

#### GET `/app/voyaai/guides/{id}`

无需 Token。返回列表字段、`content` 和 `tagIds`。未发布、已删除或所属地区停用返回 `404`。

### 5.6 标签公开查询

#### GET `/app/voyaai/tags`

无需 Token。Query：`type` 可选，攻略页面建议传 `type=guide`。返回数组：`id`、`name`、`type`、`sort`。

### 5.7 收藏

认证：小程序 Token。目标类型统一为 `city`、`attraction`、`guide`、`trip`，其他值返回 `400`。

| 方法 | URL | 用途 |
|---|---|---|
| POST | `/app/voyaai/favorites` | 收藏目标 |
| DELETE | `/app/voyaai/favorites/{targetType}/{targetId}` | 取消收藏 |
| GET | `/app/voyaai/favorites` | 我的收藏分页 |
| GET | `/app/voyaai/favorites/{targetType}/{targetId}` | 查询当前用户是否收藏 |

#### POST `/app/voyaai/favorites`

请求：`{"targetType":"guide","targetId":1}`。返回 `id`、`targetType`、`targetId`、`createTime`。重复收藏是幂等成功，返回已有记录，不返回 `409`。城市、景点、攻略被删除或不存在时返回 `404`；行程收藏暂不校验目标是否存在。

#### DELETE `/app/voyaai/favorites/{targetType}/{targetId}`

返回 `code=200`。未收藏该目标时返回 `404`。

#### GET `/app/voyaai/favorites`

Query：`pageNum`、`pageSize`（最大 50）、`targetType` 可选。返回 `data.{rows,total}`，`rows` 每项为 `id`、`targetType`、`targetId`、`targetTitle`、`targetCoverImage`、`targetSummary`、`createTime`，按收藏时间倒序。

#### GET `/app/voyaai/favorites/{targetType}/{targetId}`

返回 `{"favorited":true}`，用于详情页收藏按钮的初始状态。收藏和取消会同步维护景点、攻略的 `favorite_count`。

### 5.8 点赞

认证：小程序 Token。目标类型只支持 `attraction` 和 `guide`，其他类型返回 `400`。小程序暂时只给景点和攻略提供点赞入口，城市、行程和评论没有点赞计数字段。

| 方法 | URL | 用途 |
|---|---|---|
| POST | `/app/voyaai/likes` | 点赞 |
| DELETE | `/app/voyaai/likes/{targetType}/{targetId}` | 取消点赞 |
| GET | `/app/voyaai/likes/{targetType}/{targetId}` | 查询点赞状态和数量 |

#### POST `/app/voyaai/likes`

请求：`{"targetType":"guide","targetId":1}`。重复点赞是幂等成功，不返回 `409`；目标被删除或不存在时返回 `404`。返回 `{"targetType":"guide","targetId":1,"liked":true,"likeCount":13}`，小程序直接用它刷新按钮和计数。

#### DELETE `/app/voyaai/likes/{targetType}/{targetId}`

返回与点赞相同的结构，其中 `liked` 为 `false`。未点赞该目标时返回 `404`。

#### GET `/app/voyaai/likes/{targetType}/{targetId}`

返回 `{"targetType":"guide","targetId":1,"liked":true,"likeCount":13}`。`likeCount` 从点赞表实时统计，同时景点、攻略表的 `like_count` 会随点赞、取消和管理端删除同步维护。数据库唯一键 `uk_like_user_target` 保证同一用户不能重复点赞。

### 5.9 浏览记录

浏览日志的写入允许匿名，读取和清空需要小程序 Token。目标类型只支持 `city`、`attraction`、`guide`，其他类型返回 `400`。

| 方法 | URL | 用途 |
|---|---|---|
| POST | `/app/voyaai/view-logs` | 记录浏览 |
| GET | `/app/voyaai/me/view-history` | 当前用户浏览历史 |
| DELETE | `/app/voyaai/me/view-history` | 清空历史 |

#### POST `/app/voyaai/view-logs`

无需 Token，登录用户会由服务端自动关联用户 ID。请求：`{"targetType":"guide","targetId":1}`，不允许客户端传 `userId`。服务端从请求读取 IP 和 User-Agent；目标不存在或已删除返回 `404`。每次记录会使对应城市、景点或攻略的 `view_count` 加一。返回 `code=200`，无业务数据。

#### GET `/app/voyaai/me/view-history`

需要小程序 Token。返回最近 100 条，数组元素：`id`、`targetType`、`targetId`、`targetTitle`、`targetCoverImage`、`createTime`，按浏览时间倒序。目标已删除时标题和封面为 `null`。

#### DELETE `/app/voyaai/me/view-history`

需要小程序 Token。物理删除当前用户的全部浏览记录，返回 `code=200`。删除历史不会回退城市、景点、攻略的浏览量。

## 6 文件上传接口

### POST `/common/upload`

管理员 Token，`multipart/form-data`，字段 `file`。网页端 `image-upload` 默认调用此接口，支持 JPG、PNG 等配置类型，默认 5 MB。

成功响应：

```json
{
  "code": 200,
  "url": "http://localhost:8080/profile/upload/2026/09/uuid.jpg",
  "fileName": "/profile/upload/2026/09/uuid.jpg",
  "newFileName": "uuid.jpg",
  "originalFilename": "cover.jpg"
}
```

表单保存 `fileName` 或去掉服务器前缀后的路径即可。后端数据库字段保存路径，不保存二进制文件。实际磁盘根目录由 `RuoYiConfig.profile` 决定，通常是项目运行目录下的 `uploadPath/profile`。公开读取图片时用 `imageUrl` 拼接完整地址。

### POST `/common/uploads`

管理员 Token，多文件字段 `files`。返回 `urls`、`fileNames` 等逗号分隔字符串。景点多图也可以逐张调用 `/common/upload`，然后将路径数组传给景点 DTO 的 `images`。

## 7 规划中接口

以下接口是后续开发的正式契约。它们对应数据库已有表，但当前代码尚未实现；在后端完成前，前端必须显示“即将上线”或空状态，不能把本地演示数组当作真实业务数据。

### 7.1 评论

认证：发布、删除需要小程序 Token；公开查询可匿名。

| 方法 | URL | 用途 |
|---|---|---|
| GET | `/app/voyaai/comments` | 查询目标评论 |
| POST | `/app/voyaai/comments` | 发表评论或回复 |
| DELETE | `/app/voyaai/comments/{id}` | 删除自己的评论 |
| POST | `/app/voyaai/comments/{id}/like` | 评论点赞 |

查询 Query：`targetType`、`targetId`、`pageNum`、`pageSize`。新增 JSON：`targetType`、`targetId`、`parentId`（一级评论传 0）、`content`（最多 1000 字）。返回评论作者、头像、正文、点赞数、创建时间和子回复。

### 7.2 搜索历史

认证：小程序 Token。

| 方法 | URL | 用途 |
|---|---|---|
| GET | `/app/voyaai/me/search-history` | 查询历史 |
| POST | `/app/voyaai/me/search-history` | 保存关键词 |
| DELETE | `/app/voyaai/me/search-history` | 清空历史 |
| DELETE | `/app/voyaai/me/search-history/{id}` | 删除一条 |

请求：`{"keyword":"成都攻略"}`，最多 100 字。服务端按用户隔离，建议最多保留最近 20 条。

### 7.3 行程管理

认证：小程序 Token。行程只能由所属用户读取和修改。

#### 行程主表

| 方法 | URL | 用途 |
|---|---|---|
| GET | `/app/voyaai/trips` | 我的行程分页 |
| POST | `/app/voyaai/trips` | 创建行程 |
| GET | `/app/voyaai/trips/{id}` | 行程详情及天、行程项 |
| PUT | `/app/voyaai/trips/{id}` | 修改行程主信息 |
| DELETE | `/app/voyaai/trips/{id}` | 删除行程 |

创建 JSON：

```json
{
  "cityId": 10,
  "title": "成都三日游行程",
  "coverImage": "/profile/upload/guide/cover.jpg",
  "startDate": "2026-10-01",
  "endDate": "2026-10-03",
  "peopleCount": 2,
  "budget": 3000,
  "travelType": "自由行",
  "description": "第一次去成都",
  "source": "USER"
}
```

规则：`cityId` 必须是启用城市；结束日期不能早于开始日期；人数至少 1；预算不能小于 0；`source` 只允许 `USER`、`AI`、`ADMIN`，客户端创建默认 `USER`。

#### 行程日

| 方法 | URL | 用途 |
|---|---|---|
| POST | `/app/voyaai/trips/{tripId}/days` | 新增某一天 |
| PUT | `/app/voyaai/trips/{tripId}/days/{dayId}` | 修改某一天 |
| DELETE | `/app/voyaai/trips/{tripId}/days/{dayId}` | 删除某一天 |

JSON：`dayNumber`、`date`、`title`、`description`。同一行程的 `dayNumber` 唯一。

#### 行程项

| 方法 | URL | 用途 |
|---|---|---|
| POST | `/app/voyaai/trips/{tripId}/days/{dayId}/items` | 新增行程项 |
| PUT | `/app/voyaai/trips/{tripId}/days/{dayId}/items/{itemId}` | 修改行程项 |
| DELETE | `/app/voyaai/trips/{tripId}/days/{dayId}/items/{itemId}` | 删除行程项 |

JSON：`attractionId` 可空、`itemType`（1 景点、2 餐饮、3 酒店、4 交通、5 购物、6 其他）、`title`、`startTime`、`endTime`、`address`、`description`、`estimatedCost`、`sort`。

### 7.4 行程分享

认证：小程序 Token。

| 方法 | URL | 用途 |
|---|---|---|
| POST | `/app/voyaai/trips/{tripId}/share` | 创建或刷新分享 |
| DELETE | `/app/voyaai/trips/{tripId}/share` | 失效分享 |
| GET | `/app/voyaai/trip-shares/{shareCode}` | 匿名查看分享行程 |

创建返回 `shareCode`、`shareToken`、`expireTime`、`url`。分享查看只返回公开行程数据，不返回用户隐私。

### 7.5 AI 助手

当前模型服务和密钥尚未确定，所以此模块暂未实现。推荐先固定以下契约，模型调用全部放在后端，密钥只放环境变量。

| 方法 | URL | 用途 |
|---|---|---|
| GET | `/app/voyaai/ai/sessions` | 会话列表 |
| POST | `/app/voyaai/ai/sessions` | 创建会话 |
| GET | `/app/voyaai/ai/sessions/{id}/messages` | 消息列表 |
| POST | `/app/voyaai/ai/sessions/{id}/messages` | 发送消息 |
| POST | `/app/voyaai/ai/sessions/{id}/plan` | 根据参数生成行程草案 |
| POST | `/app/voyaai/ai/sessions/{id}/plan/confirm` | 确认并写入行程 |

生成行程请求建议：`cityId`、`days`、`budget`、`peopleCount`、`travelType`、`preferences[]`。返回草案时使用与行程模块相同的 `days/items` 结构，确认时后端重新校验景点和城市，不能直接信任模型返回的 ID。

### 7.6 酒店和美食

当前没有酒店和美食表，也没有第三方数据源，页面是视觉壳。正式开发前要先确定数据来源。推荐接口：

```text
GET /app/voyaai/hotels?cityId&pageNum&pageSize&keyword&minPrice&maxPrice
GET /app/voyaai/hotels/{id}
GET /app/voyaai/foods?cityId&pageNum&pageSize&keyword&category
GET /app/voyaai/foods/{id}
```

列表统一返回 `data.rows/data.total`，详情返回 `data`。价格、地址、图片、评分、经纬度和营业时间必须在后端统一字段后再接入小程序。

### 7.7 消息通知

数据库表已经存在，接口尚未实现：

```text
GET  /app/voyaai/messages?pageNum&pageSize&type&isRead
PUT  /app/voyaai/messages/{id}/read
PUT  /app/voyaai/messages/read-all
DELETE /app/voyaai/messages/{id}
```

消息返回 `id`、`type`、`title`、`content`、`bizType`、`bizId`、`isRead`、`readTime`、`createTime`。用户只能访问自己的消息。

### 7.8 标签管理

小程序的 `GET /app/voyaai/tags` 已实现，但标签的管理端 CRUD 尚未实现。攻略管理页面当前只能选择数据库中已经存在的启用标签。后续管理员接口固定为：

```text
GET    /voyaai/tag/list
GET    /voyaai/tag/{id}
POST   /voyaai/tag
PUT    /voyaai/tag
PUT    /voyaai/tag/changeStatus
DELETE /voyaai/tag/{ids}
```

权限前缀为 `voyaai:tag`。新增 JSON：`{"name":"美食","type":"guide","sort":10,"status":"0","remark":""}`。同一 `type` 下标签名称不能重复；删除标签前需要检查 `voya_ai_guide_tag` 关联，存在关联时返回 `409`。管理端列表返回 `id`、`name`、`type`、`sort`、`status`、`remark`、审计字段。

### 7.9 意见反馈

小程序：

```text
POST /app/voyaai/feedback
```

请求：`content`（最多 1000 字）、`contact`（最多 100 字）、`images`（最多 2000 字，逗号分隔）。用户 ID 从 Token 获取，可匿名提交。管理端后续增加 `/voyaai/feedback/list`、`/{id}`、`/{id}/handle` 和导出接口。

## 8 前后端并行开发规则

1. 前端先建立 API 文件，不在页面中散落 URL。
2. 所有管理端接口沿用 `TableDataInfo`；不要把管理端分页改成 `data.rows`。
3. 所有小程序接口通过 `utils/api.js` 读取 `body.data`；公开列表返回数组，攻略等分页返回 `{rows,total}`。
4. 新增和修改 DTO 使用同一个 DTO，通过 `CreateGroup` 和 `UpdateGroup` 区分是否允许传 `id`。
5. 前端不要提交数据库审计字段、浏览量、点赞量、收藏量、评论量；这些字段由服务端维护。
6. 图片先调用 `/common/upload`，保存响应中的路径，再把路径放入业务 DTO；不要把图片 Base64 放入业务 JSON。
7. 级联选择必须按国家 → 省份 → 城市顺序加载；停用的上级地区不可用于新建和上架。
8. 删除是逻辑删除，遇到 `409` 时前端提示关联数据原因并引导用户下架，不要自动强删。
9. 所有错误都读取 `code` 和 `msg`；不要依据中文错误文本判断业务分支。
10. 每增加一个接口，必须同步修改本文档的“已实现接口”和对应前端 API 文件，并注明版本和数据库变更脚本。

## 9 开发顺序和联调验收

### 已完成阶段

国家、省份、城市、景点的管理端 CRUD 和小程序公开浏览已经完成；微信登录、用户资料和头像已经完成；攻略管理和攻略公开读接口已经完成；收藏和点赞模块的管理端查询删除、小程序收藏、点赞、取消、状态查询和计数维护已经完成；浏览记录的匿名写入、登录用户历史查询和清空、管理端查询已经完成。

### 下一阶段

1. 搜索历史：接入搜索页。
2. 评论：先做公开列表和用户发布，再做管理端审核，并接入评论点赞。
3. 行程：完成主表、天、项的事务性 CRUD。
4. AI：确定模型服务后接入会话和行程草案。
5. 酒店、美食、消息、反馈：先确定数据源和管理端页面，再接入小程序。
6. HTTPS、合法域名、真机调试和正式发布。

### 每个模块的验收条件

- 数据库增量脚本可重复执行或明确执行顺序。
- 管理端接口可通过管理员 Token 调用，权限不足返回 403。
- 小程序接口在未登录时符合公开/登录约定。
- 参数为空、越界、重复、上级停用时返回明确 400/409。
- 列表、详情、创建、修改、删除、状态切换至少各有一条联调记录。
- 图片上传后能在数据库保存路径并在网页、小程序正常显示。
- 公开接口不会返回草稿、下架或上级地区停用的数据。

## 10 三端页面和接口对应关系

### 10.1 管理端网页路由

| 路由 | 页面 | 状态 | 主要接口 |
|---|---|---|---|
| `/voyaai/country` | 国家管理 | 已实现 | `/voyaai/country/**` |
| `/voyaai/province` | 省份管理 | 已实现 | `/voyaai/province/**` |
| `/voyaai/city` | 城市管理 | 已实现 | `/voyaai/city/**` |
| `/voyaai/attraction` | 景点管理 | 已实现 | `/voyaai/attraction/**` |
| `/voyaai/guide` | 攻略管理 | 已实现 | `/voyaai/guide/**` |
| `/voyaai/favorite` | 收藏管理 | 已实现 | `/voyaai/favorite/**` |
| `/voyaai/like` | 点赞管理 | 已实现 | `/voyaai/like/**` |
| `/voyaai/viewLog` | 浏览记录 | 已实现 | `/voyaai/viewLog/**` |
| `/voyaai/tag` | 标签管理 | 规划中 | `/voyaai/tag/**` |
| `/voyaai/feedback` | 意见反馈 | 规划中 | `/voyaai/feedback/**` |

### 10.2 微信小程序页面

| 页面 | 状态 | 当前真实接口 |
|---|---|---|
| `pages/index` | 已接入 | 城市、攻略首页摘要 |
| `pages/search` | 已接入城市搜索 | `/app/voyaai/cities` |
| `pages/cities` | 已接入 | `/app/voyaai/cities` |
| `pages/attractions` | 已接入 | `/app/voyaai/cities/{cityId}/attractions` |
| `pages/attraction-detail` | 已接入 | `/app/voyaai/attractions/{id}` |
| `pages/guides` | 已接入攻略真实数据 | `/app/voyaai/guides`、`/app/voyaai/tags` |
| `pages/guide-detail` | 已接入攻略真实数据 | `/app/voyaai/guides/{id}` |
| `pages/me` | 登录和资料已接入 | `/app/voyaai/auth/**`、`/app/voyaai/me/**` |
| `pages/trips` | 视觉壳 | 行程接口规划中 |
| `pages/trip-detail` | 视觉壳 | 行程接口规划中 |
| `pages/ai` | 视觉壳 | AI 接口规划中 |
| `pages/hotels` | 视觉壳 | 酒店接口规划中 |
| `pages/food` | 视觉壳 | 美食接口规划中 |
| `pages/messages` | 视觉壳 | 消息接口规划中 |
| `pages/more` | 收藏接口已实现，小程序页面待接入 | `/app/voyaai/favorites`、`/app/voyaai/favorites/{targetType}/{targetId}` |
| 景点、攻略详情页的点赞按钮 | 接口已实现，页面待接入 | `/app/voyaai/likes`、`/app/voyaai/likes/{targetType}/{targetId}` |
| 我的浏览历史 | 接口已实现，小程序页面待接入 | `/app/voyaai/me/view-history`、`/app/voyaai/view-logs` |

## 11 当前代码和文档位置

后端：`D:/VoyaAI/RuoYi-Vue-springboot`  
网页前端：`D:/VoyaAI/RuoYi-Vue3`  
微信小程序：`D:/VoyaAI/VoyaAI-app`  
攻略后端详细文档：后端仓库 `docs/voyaai-guide-api.md`  
攻略数据库脚本：后端仓库 `sql/voyaai_guide_schema.sql`、`sql/voyaai_guide_menu.sql`  
收藏菜单脚本：后端仓库 `sql/voyaai_favorite_menu.sql`
点赞菜单脚本：后端仓库 `sql/voyaai_like_menu.sql`
浏览记录菜单脚本：后端仓库 `sql/voyaai_view_log_menu.sql`

本文档是项目级接口总规范；模块细节可以在对应仓库文档中补充，但不得与本文档的 URL、字段名称、响应包装和状态码冲突。
