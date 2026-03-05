# 简道云MCP服务器开发指南

> **更新时间**: 2026-02-27
> **版本**: v1.0.4

---

## 📌 快速开始

> **⏱️ 预计时间**: 10分钟

### 🚀 最简单的例子

1️⃣ 克隆项目并安装依赖
```bash
git clone https://github.com/your-org/jiandaoyun-mcp.git
cd jiandaoyun-mcp
npm install
```

2️⃣ 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key
```

3️⃣ 启动服务器
```bash
npm run start
```

🎉 恭喜！你已经成功启动简道云 MCP 服务器

📚 继续深入学习 →

---

## 🤖 在 Claude Code 中使用

> **⏱️ 预计时间**: 5分钟

### STDIO 模式配置

1️⃣ 编译项目
```bash
npm run build
```

2️⃣ 找到配置文件路径

根据你的 AI 助手，配置文件位于：

**Trae**:
- **Windows**: `%APPDATA%\Trae CN\User\mcp.json`
- **macOS**: `~/Library/Application Support/Trae CN/User/mcp.json`

**Claude Code**:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

3️⃣ 编辑配置文件

**Trae 配置格式**（不需要 `type` 字段）：
```json
{
  "mcpServers": {
    "jiandaoyun-mcp": {
      "command": "node",
      "args": ["D:\\path\\to\\jiandaoyun-mcp\\build\\index.js"]
    }
  }
}
```

**Claude Code 配置格式**（需要 `type` 字段）：
```json
{
  "mcpServers": {
    "jiandaoyun-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["D:\\path\\to\\jiandaoyun-mcp\\build\\index.js"]
    }
  }
}
```

> ⚠️ **注意**: 
> - Windows 路径需要使用双反斜杠 `\\`
> - API Key 只需要在项目的 `.env` 文件中配置一次即可

### 验证配置

1. 重启 Claude Code
2. 使用 `/mcp` 命令查看已连接的 MCP 服务器
3. 或者直接询问 Claude："列出可用的工具"

---

### 📋 可用工具清单

在 Claude Code 中，你可以直接使用以下工具：

| 工具名称 | 功能 |
|---------|------|
| list_apps_and_forms | 获取应用和表单列表 |
| get_form_fields | 获取表单字段信息 |
| submit_form_data | 提交表单数据 |
| query_form_data | 查询表单数据 |
| update_form_data | 更新表单数据 |
| delete_form_data | 删除表单数据 |
| get_department_users | 获取部门用户列表 |
| get_department_children | 获取子部门列表 |
| query_workflow_instances | 查询流程实例 |
| query_workflow_tasks | 查询待办/已办任务 |
| query_members | 查询成员信息 |
| query_departments | 查询部门信息 |
| query_roles | 查询角色信息 |

### 💬 使用示例

在 Claude Code 中，你可以这样对话：

> **你**: 查询所有应用和表单  
> **Claude**: (自动调用 list_apps_and_forms 工具)

> **你**: 获取表单 ABC123 的字段信息  
> **Claude**: (自动调用 get_form_fields 工具，formId 为 ABC123)

> **用户**: 提交一条数据到表单 test-form，内容是姓名=张三，年龄=25  
> **Claude**: (自动调用 submit_form_data 工具)

---

## 💡 核心概念

### 概念1：MCP协议

- **通俗解释**：MCP (Model Context Protocol) 是一种让 AI 助手与外部系统交互的协议
- **打个比方**：就像 USB 接口让不同设备可以连接一样，MCP 让 AI 可以连接不同的数据源
- **代码示例**：`server.setRequestHandler(ListToolsRequestSchema, ...)`
- **使用场景**：需要让 Claude 等 AI 助手访问简道云数据时

### 概念2：工具函数 (Tool)

- **通俗解释**：工具函数是 MCP 服务器暴露给 AI 调用的功能单元
- **打个比方**：就像工具箱里的锤子、螺丝刀，每个工具完成特定任务
- **代码示例**：`registerTool({ name: 'query_form_data', ... })`
- **使用场景**：需要新增 AI 可调用的功能时

### 概念3：传输层 (Transport)

- **通俗解释**：传输层决定了 AI 如何与 MCP 服务器通信
- **打个比方**：就像电话线和无线电是不同的通信方式
- **代码示例**：`StdioServerTransport` 或 `SSEServerTransport`
- **使用场景**：本地开发用 STDIO，远程访问用 HTTP/SSE

---

## 🔧 环境准备

### 1.1 必要工具

- **Node.js v18+** - JavaScript运行环境
- **npm v9+** - 包管理器
- **TypeScript v4.5+** - 类型安全的开发语言
- **简道云账号** - 需要API Key

### 1.2 安装依赖

```bash
npm install
```

### 1.3 配置环境变量

创建 `.env` 文件：
```env
JIANDAOYUN_API_KEY=your_api_key_here
JIANDAOYUN_BASE_URL=https://api.jiandaoyun.com
PORT=3000
LOG_LEVEL=info
```

---

## 📁 项目结构

```
jiandaoyun-mcp/
├── src/
│   ├── mcp-server/
│   │   ├── shared/
│   │   │   └── init.ts          # MCP服务器初始化和工具注册
│   │   └── transport/
│   │       ├── stdio.ts          # STDIO传输层实现
│   │       └── http.ts           # HTTP + SSE传输层实现
│   ├── utils/
│   │   ├── index.ts              # 工具函数（HTTP请求等）
│   │   └── logger.ts             # 日志系统
│   ├── client.ts                 # 简道云API客户端
│   ├── types.ts                  # TypeScript类型定义
│   └── index.ts                  # 入口文件
├── build/                        # 编译输出目录
├── doc/                          # 文档目录
├── .env                          # 环境变量配置
├── package.json
└── tsconfig.json
```

---

## 🔄 版本兼容性说明

### 平台版本要求

| 平台组件 | 最低版本 | 推荐版本 | 备注 |
|---------|---------|---------|------|
| Node.js | v18.0 | v20.0+ | v20以上性能更优 |
| 简道云API | v5 | v5+ | 使用最新API版本 |
| MCP SDK | 0.5.0 | 最新版 | 保持同步更新 |

### API版本差异

#### v5 API 特性
- 统一的请求格式
- 更好的错误处理
- 支持批量操作

---

## 🔍 开发流程

### 📌 步骤1：创建新工具

- **业务需求**：实现一个新的 MCP 工具函数
- **完整代码**：
```typescript
registerTool(
  {
    name: 'my_new_tool',
    description: '工具的详细描述',
    inputSchema: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: '参数描述' }
      },
      required: ['param1']
    }
  },
  async (args) => {
    const { param1 } = args;
    
    try {
      const result = await httpRequest(`${baseUrl}/api/v5/endpoint`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ param1 })
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, data: result }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: false, error: error.message }, null, 2)
        }]
      };
    }
  }
);
```
- **注意事项**：所有工具都需要在 `init.ts` 中注册

### 📌 步骤2：测试工具

- **业务需求**：验证工具函数是否正常工作
- **测试方法**：通过 MCP 客户端调用工具
- **注意事项**：确保 API Key 有对应权限

### 📌 步骤3：编译和部署

```bash
# 编译TypeScript
npm run build

# 启动STDIO模式
npm run start

# 启动HTTP模式
npm run start:http
```

---

## 🧪 测试与部署

### 4.1 本地测试

```bash
# 编译项目
npm run build

# 启动服务器
npm run start

# 在另一个终端测试
# 使用MCP客户端连接并调用工具
```

### 4.2 打包发布

```bash
# 编译
npm run build

# 发布到npm
npm publish
```

---

## 🔒 安全注意事项

### ⚠️ 常见安全隐患

#### 1. API密钥泄露

- **风险描述**：API Key 被提交到代码仓库
- **预防措施**：使用环境变量，将 `.env` 加入 `.gitignore`
- **检查代码**：
```typescript
// ❌ 不安全
const apiKey = 'your_api_key_here';

// ✅ 安全
const apiKey = process.env.JIANDAOYUN_API_KEY;
```

#### 2. 输入验证不足

- **风险描述**：未验证用户输入可能导致注入攻击
- **预防措施**：对所有输入进行验证和清理
- **检查代码**：
```typescript
// ✅ 验证输入
if (!formId || typeof formId !== 'string') {
  return { content: [{ type: 'text', text: '无效的表单ID' }] };
}
```

### 🛡️ 安全检查清单

- [ ] API Key 存储在环境变量中
- [ ] `.env` 文件已加入 `.gitignore`
- [ ] 所有用户输入都经过验证
- [ ] 错误信息不暴露敏感信息
- [ ] 使用 HTTPS 进行 API 调用

---

## ⚡ 性能优化检查清单

### 上线前必查项

#### 代码层面
- [ ] 移除 console.log 和 debugger
- [ ] 启用 TypeScript 严格模式
- [ ] 处理好异步错误

#### 资源层面
- [ ] 合理设置 HTTP 超时时间
- [ ] 实现请求重试机制
- [ ] 控制并发请求数量

#### 运行时优化
- [ ] 使用连接池
- [ ] 实现缓存机制
- [ ] 分页处理大数据量

---

## 📖 工具函数清单

### 应用与表单管理 (2个)

| 工具函数名 | 功能 | API 接口 |
|-----------|------|----------|
| list_apps_and_forms | 获取应用和表单列表 | `/api/v5/app/list` |
| get_form_fields | 获取表单字段信息 | `/api/v5/app/entry/widget/list` |

### 数据操作 (6个)

| 工具函数名 | 功能 | API 接口 |
|-----------|------|----------|
| submit_form_data | 提交表单数据 | `/api/v5/app/entry/data/create` |
| query_form_data | 查询表单数据 | `/api/v5/app/entry/data/list` |
| update_form_data | 更新表单数据 | `/api/v5/app/entry/data/update` |
| delete_form_data | 删除表单数据 | `/api/v5/app/entry/data/delete` |
| get_upload_token | 获取文件上传令牌 | `/api/v5/app/entry/data/upload/token` |
| get_latest_data | 获取最新数据 | `/api/v5/app/entry/data/list` |

### 部门与成员 (2个)

| 工具函数名 | 功能 | API 接口 |
|-----------|------|----------|
| get_department_users | 获取部门用户列表 | `/api/v5/corp/department/user/list` |
| get_department_children | 获取子部门列表 | `/api/v5/corp/department/list` |

### 流程管理 (3个)

| 工具函数名 | 功能 | API 接口 |
|-----------|------|----------|
| query_workflow_instances | 查询流程实例 | `/api/v6/workflow/instance/get` |
| query_workflow_tasks | 查询待办/已办/抄送 | `/api/v5/workflow/task/list` |
| query_approval_comments | 查询审批意见 | `/api/v1/app/{appId}/entry/{formId}/data/{dataId}/approval_comments` |

### 通讯录 (3个)

| 工具函数名 | 功能 | API 接口 |
|-----------|------|----------|
| query_members | 查询成员信息 | `/api/v5/corp/user/get` |
| query_departments | 查询部门信息 | `/api/v5/corp/department/list` |
| query_roles | 查询角色/角色组 | `/api/v5/corp/role/list` |

### 企业互联 (1个)

| 工具函数名 | 功能 | API 接口 |
|-----------|------|----------|
| query_enterprises | 查询互联企业 | `/api/v5/corp/company/list` |

---

## 🔧 故障排查

### ▼ Q1: 启动时报错 "API Key 未配置"

**原因分析**：环境变量未正确设置

**解决方案**：
1. 检查 `.env` 文件是否存在
2. 确认 `JIANDAOYUN_API_KEY` 是否配置
3. 重启服务器

### ▶ Q2: 调用工具返回 403 权限不足

**原因分析**：API Key 未开通对应接口权限

**解决方案**：
1. 登录简道云开放平台
2. 找到对应的 API Key
3. 编辑权限，勾选需要的接口

### ▶ Q3: HTTP 模式无法连接

**原因分析**：端口被占用或防火墙阻止

**解决方案**：
1. 检查端口是否被占用
2. 修改 `.env` 中的 `PORT` 配置
3. 检查防火墙设置

---

## 💪 进阶技巧

### 技巧1：批量操作优化

- **使用批量接口**：一次提交多条数据，减少API调用次数
- **控制批量大小**：建议每次不超过100条
- **代码示例**：
```typescript
// 批量提交数据
await submitFormData({
  formId: 'form_id',
  data: [
    { field1: 'value1' },
    { field1: 'value2' },
    // ... 最多100条
  ]
});
```

### 技巧2：错误处理最佳实践

- **统一错误格式**：返回标准化的错误信息
- **重试机制**：对临时性错误自动重试
- **代码示例**：
```typescript
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  logger.error('API调用失败', { error: error.message });
  return { 
    success: false, 
    error: error.message,
    code: error.code 
  };
}
```

---

## 📚 学习路径

**进度追踪器**：已完成 4/6 个里程碑

### 阶段1: 基础入门

**解锁条件**: 无前置要求

- 了解 MCP 协议基本概念 ✓
- 完成环境配置 ✓
- 成功启动服务器 ✓

### 阶段2: 工具开发

**解锁条件**: 完成阶段1

- 理解工具注册机制 ✓
- 开发第一个自定义工具 🔄 进行中
- 完成工具测试 ○ 待学习

### 阶段3: 高级应用

**解锁条件**: 完成阶段2

- 性能优化 🔒 未解锁
- 错误处理增强 🔒 未解锁
- 生产环境部署 🔒 未解锁

---

## 📧 如有问题，请联系开发团队

&copy; 2026 简道云MCP服务器项目组
