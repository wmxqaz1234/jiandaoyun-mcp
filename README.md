# JianDaoYun MCP 

一个用于简道云表单数据管理的 MCP (Model Context Protocol) 服务，支持完整的CRUD操作和高级查询功能。

## 功能特性

- 🔍 **表单字段查询**: 获取表单的字段定义，包括字段类型、必填状态等
- 📝 **智能数据提交**: 自动匹配字段类型并转换数据格式
- 🔄 **批量操作支持**: 支持单条或批量提交/删除（最多100条）
- 🎯 **字段智能匹配**: 支持通过字段key、字段名称等多种方式匹配
- 🔐 **安全认证**: 使用Bearer Token认证机制
- 📊 **高级查询**: 支持数据筛选器、分页查询
- 📁 **文件上传**: 获取文件上传凭证
新增
- 🔍 **自然语言输入**:自然语言输入即可调取MCP获取相应数据结果
- 📊 **获取部门成员**能够（递归）获取指定部门编号下的所有成员。
- 📊 **获取部门列表**：能够（递归）获取指定部门 id 的所有子部门。
改进
- 🔄 **API接口更新**: 部分工具的函数接口错误，当前已更新


## 安装

```bash
cd jiandaoyun-mcp
npm install
npm run build
```

## 配置

在使用前，只需要设置简道云的API Key作为环境变量：

在 `.env` 文件中设置：

```
JIANDAOYUN_APP_KEY=your_app_key
JIANDAOYUN_BASE_URL=https://api.jiandaoyun.com/api
```

**注意：** `APP_ID` 不再作为环境变量配置，而是在每次调用 MCP 工具时作为参数传入。这样可以让一个 MCP 服务器实例支持多个简道云应用，用户可以动态指定要操作的应用。

## MCP 工具说明

### 1. get_form_fields
获取表单的字段定义信息。

**参数:**
- `appId` (string): 简道云应用ID
- `appKey` (string): 简道云API密钥
- `formId` (string): 表单ID（支持应用ID或完整表单ID）

**返回:** 表单字段列表，包含字段key、名称、类型等信息

### 2. submit_form_data
提交数据到表单，支持自动字段类型匹配。

**参数:**
- `appId` (string): 简道云应用ID
- `appKey` (string): 简道云API密钥
- `formId` (string): 表单ID（支持应用ID或完整表单ID）
- `data` (object|array): 要提交的数据（单个对象或数组）
- `autoMatch` (boolean): 是否自动匹配字段类型（默认: true）
- `transactionId` (string): 可选的事务ID，用于幂等提交

**返回:** 提交结果

### 3. get_form_data
获取表单中的特定数据记录。

**参数:**
- `appId` (string): 简道云应用ID
- `appKey` (string): 简道云API密钥
- `formId` (string): 表单ID（支持应用ID或完整表单ID）
- `dataId` (string): 数据记录ID

**返回:** 数据记录详情

### 4. query_form_data
查询多条数据，支持筛选和分页。

**参数:**
- `appId` (string): 简道云应用ID
- `appKey` (string): 简道云API密钥
- `formId` (string): 表单ID（支持应用ID或完整表单ID）
- `dataId` (string): 可选，用于分页的最后一条数据ID
- `fields` (array): 可选，要返回的字段列表（widget IDs）
- `filter` (object): 可选，数据筛选条件
- `limit` (number): 可选，返回记录数（1-100，默认10）

**筛选器示例:**
```json
{
  "rel": "and",
  "cond": [
    {
      "field": "_widget_1508400000001",
      "type": "text",
      "method": "eq",
      "value": "张三"
    },
    {
      "field": "_widget_1508400000002",
      "type": "number",
      "method": "range",
      "value": [20, 30]
    }
  ]
}
```

### 5. update_form_data
更新已有数据记录。

**参数:**
- `appId` (string): 简道云应用ID
- `appKey` (string): 简道云API密钥
- `formId` (string): 表单ID（支持应用ID或完整表单ID）
- `dataId` (string): 要更新的数据ID
- `data` (object): 更新的数据内容
- `transactionId` (string): 可选的事务ID
- `isStartTrigger` (boolean): 是否触发自动化流程

**返回:** 更新结果

### 6. delete_form_data
删除一条或多条数据记录。

**参数:**
- `appId` (string): 简道云应用ID
- `appKey` (string): 简道云API密钥
- `formId` (string): 表单ID（支持应用ID或完整表单ID）
- `dataIds` (string|array): 要删除的数据ID（单个字符串或数组）
- `isStartTrigger` (boolean): 是否触发自动化流程

**返回:** 删除结果

### 7. get_upload_token
获取文件上传凭证。

**参数:**
- `appId` (string): 简道云应用ID
- `appKey` (string): 简道云API密钥
- `formId` (string): 表单ID（支持应用ID或完整表单ID）
- `transactionId` (string): 事务ID，上传的文件将绑定到此事务

**返回:** 文件上传凭证和上传地址（最多100个）

### 8. list_apps_and_forms
列出所有可访问的应用，或获取指定应用下的表单列表

**参数:**
- `appKey` (string): 简道云API密钥
- `appId` (string): 可选，如果提供则返回该应用下的表单列表

**返回:** 应用列表或表单列表

## 字段类型支持

支持的字段类型及自动转换规则：

- **文本** (text): 自动转换为字符串
- **数字** (number): 自动解析为数字
- **日期/日期时间** (date/datetime): 支持多种日期格式，自动转换为ISO格式
- **单选/多选** (select/multi_select): 自动处理数组格式
- **复选框** (checkbox): 自动转换为布尔值
- **用户/部门** (user/dept): 支持单个或多个ID
- **文件/图片** (file/image): 支持URL或文件对象格式
- **地理位置** (location): 支持对象或字符串格式
- **地址** (address): 支持省市区详细地址格式
- **手机号** (phone): 支持对象格式 {phone: "15812345678"}
- **子表单** (subform): 递归处理子表单数据
- **流水号** (sn): 只读字段，自动生成

## 使用示例

### 在 Claude Desktop 中配置

#### 方法一：使用 npx（推荐）

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "jiandaoyun": {
      "command": "npx",
      "args": ["jiandaoyun-mcp-server"],
      "env": {
        "JIANDAOYUN_APP_KEY": "your_app_key"
      }
    }
  }
}
```

#### 方法二：使用本地安装

```bash
# 全局安装
npm install -g jiandaoyun-mcp-server

# 或本地安装
npm install jiandaoyun-mcp-server
```

配置文件：
```json
{
  "mcpServers": {
    "jiandaoyun": {
      "command": "jiandaoyun-mcp",
      "env": {
        "JIANDAOYUN_APP_KEY": "your_app_key"
      }
    }
  }
}
```

#### 方法三：使用 Node.js 直接运行

```json
{
  "mcpServers": {
    "jiandaoyun": {
      "command": "node",
      "args": [
        "d:\\Trae CN\\project\\pro_1\\jiandaoyun-mcp-server-main\\jiandaoyun-mcp-server-main\\build\\index.js"
      ],
      "env": {
        "JIANDAOYUN_APP_KEY": "your_app_key"
      }
    }
  }
}
```

**配置说明：**
- 将 `your_app_key` 替换为你的简道云 API 密钥
- `APP_ID` 不再作为环境变量配置，而是在每次调用 MCP 工具时作为参数传入
- 推荐使用 npx 方式，无需手动安装和维护本地文件

### 获取表单字段
```javascript
// 获取表单字段定义
const fields = await get_form_fields({
  appId: "your_app_id",
  appKey: "your_app_key",
  formId: "your_form_id"
});
```

### 提交数据
```javascript
// 提交单条数据
const result = await submit_form_data({
  appId: "your_app_id",
  appKey: "your_app_key",
  formId: "your_form_id",
  data: {
    "姓名": "张三",
    "年龄": 25,
    "邮箱": "zhangsan@example.com"
  }
});

// 批量提交数据
const batchResult = await submit_form_data({
  appId: "your_app_id",
  appKey: "your_app_key",
  formId: "your_form_id",
  data: [
    { "姓名": "张三", "年龄": 25 },
    { "姓名": "李四", "年龄": 30 }
  ]
});
```

### 查询数据
```javascript
// 查询所有数据
const allData = await query_form_data({
  appId: "your_app_id",
  appKey: "your_app_key",
  formId: "your_form_id"
});

// 带条件查询
const filteredData = await query_form_data({
  appId: "your_app_id",
  appKey: "your_app_key",
  formId: "your_form_id",
  filter: {
    rel: "and",
    cond: [
      {
        field: "age_field_id",
        method: "gte",
        value: 18
      }
    ]
  },
  limit: 10
});
```

### 列出应用和表单
```javascript
// 列出所有应用
const apps = await list_apps_and_forms({
  appKey: "your_app_key"
});

// 获取特定应用下的表单列表
const forms = await list_apps_and_forms({
  appKey: "your_app_key",
  appId: "your_app_id"
});
```

### 数据提交示例

```javascript
// 单条数据提交（使用字段别名）
{
  "formId": "5f3e4d2c1b0a9",
  "data": {
    "姓名": "张三",
    "年龄": 25,
    "入职日期": "2024-01-15",
    "部门": ["dept_001"],
    "技能": ["JavaScript", "Python"],
    "手机号": { "phone": "15812345678" },
    "地址": {
      "province": "江苏省",
      "city": "无锡市",
      "district": "滨湖区",
      "detail": "太湖大道1000号"
    },
    "简历": { "url": "https://example.com/resume.pdf" }
  }
}

// 使用widget ID提交（推荐）
{
  "formId": "5f3e4d2c1b0a9",
  "data": {
    "_widget_1432728651402": "张三",
    "_widget_1432728651403": 25,
    "_widget_1432728651407": "2024-01-15T00:00:00.000Z",
    "_widget_1432728651413": {
      "province": "江苏省",
      "city": "无锡市",
      "district": "滨湖区",
      "detail": "太湖大道1000号",
      "lnglatXY": [120.31237, 31.49099]
    }
  }
}

// 批量数据提交
{
  "formId": "5f3e4d2c1b0a9",
  "data": [
    { "姓名": "张三", "年龄": 25 },
    { "姓名": "李四", "年龄": 30 }
  ]
}

// 数据查询示例
{
  "formId": "5f3e4d2c1b0a9",
  "filter": {
    "rel": "and",
    "cond": [
      {
        "field": "_widget_1508400000001",
        "type": "text",
        "method": "eq",
        "value": "张三"
      },
      {
        "field": "createTime",
        "method": "range",
        "value": ["2024-01-01", null]
      }
    ]
  },
  "limit": 50
}
```

## 开发

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 启动服务
npm start
```

## 错误处理

服务会自动处理以下情况：
- API认证失败
- 网络错误
- 字段不匹配警告
- 数据格式转换错误
## 参考来源/Acknowledgements
本项目开发过程中，参考/复用了以下仓库的核心代码逻辑，在此表示感谢：
1. 【jiandaoyun-mcp-server】：https://github.com/cheungxin/jiandaoyun-mcp-server（参考了工具函数功能）
## 许可证

MIT
