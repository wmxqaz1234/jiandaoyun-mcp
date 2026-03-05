# 简道云MCP服务器 - 标准工程结构规范

本文档描述了简道云MCP服务器的标准工程目录结构与开发规范，涵盖目录结构、文件规范、开发指南、测试部署及经验沉淀等内容。

## 目录

1. [项目结构](#项目结构)
2. [配置文件规范](#配置文件规范)
3. [核心模块开发](#核心模块开发)
4. [参数定义规范](#参数定义规范)
5. [测试规范](#测试规范)
6. [打包部署](#打包部署)
7. [常见问题](#常见问题)
8. [开发经验](#开发经验)
9. [工程检查清单](#工程检查清单)
10. [附录](#附录)

---

## 1. 项目结构

### 1.1 目录结构树

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
│   ├── product_plan_jiandaoyun_mcp.md
│   ├── dev_guide_jiandaoyun_mcp.md
│   ├── best_practice_jiandaoyun_mcp.md
│   └── structure_spec_jiandaoyun_mcp.md
├── .env                          # 环境变量配置
├── .env.example                  # 环境变量示例
├── .gitignore                    # Git忽略文件
├── package.json                  # 项目依赖配置
├── tsconfig.json                 # TypeScript配置
└── README.md                     # 项目说明文档
```

### 1.2 目录功能说明

| 目录/文件 | 作用 | 必填 | 详细说明 |
|-----------|------|------|----------|
| src/ | 源代码目录 | 是 | 所有TypeScript源代码存放位置 |
| src/mcp-server/ | MCP服务器核心代码 | 是 | MCP协议相关实现 |
| src/mcp-server/shared/ | 共享模块（工具注册） | 是 | 所有工具函数的注册和实现 |
| src/mcp-server/transport/ | 传输层实现 | 是 | STDIO和HTTP传输层 |
| src/utils/ | 工具函数 | 是 | HTTP请求、日志等通用工具 |
| src/client.ts | 简道云API客户端 | 是 | 封装简道云API调用 |
| src/types.ts | TypeScript类型定义 | 是 | 所有类型定义 |
| src/index.ts | 入口文件 | 是 | 程序启动入口 |
| build/ | 编译输出目录 | 是 | TypeScript编译后的JS文件 |
| doc/ | 文档目录 | 否 | 项目文档 |
| .env | 环境变量配置 | 是 | 敏感配置信息 |
| .env.example | 环境变量示例 | 是 | 配置模板 |
| .gitignore | Git忽略文件 | 是 | 防止敏感文件提交 |
| package.json | 项目依赖配置 | 是 | npm配置文件 |
| tsconfig.json | TypeScript配置 | 是 | 编译选项配置 |
| README.md | 项目说明文档 | 是 | 项目介绍和使用说明 |

### 1.3 文件命名规范

| 文件类型 | 命名规范 | 示例 |
|---------|---------|------|
| TypeScript源文件 | 小驼峰命名 | `init.ts`, `httpClient.ts` |
| 配置文件 | 小写+点分隔 | `tsconfig.json`, `.env.example` |
| 文档文件 | 小写+下划线 | `dev_guide_jiandaoyun_mcp.md` |
| 编译输出 | 与源文件同名 | `init.js`, `init.d.ts` |

---

## 2. 配置文件规范

### 2.1 package.json (项目清单)

**作用**：定义项目依赖、脚本命令和元信息

**结构要求**：
```json
{
  "name": "jiandaoyun-mcp",
  "version": "1.0.4",
  "description": "简道云 MCP 服务器 - 让 AI 助手无缝访问简道云数据",
  "main": "build/index.js",
  "types": "build/index.d.ts",
  "bin": {
    "jiandaoyun-mcp": "build/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node build/index.js",
    "start:http": "node build/mcp-server/transport/http.js",
    "dev": "tsc --watch",
    "clean": "rm -rf build",
    "lint": "eslint src/**/*.ts",
    "test": "jest"
  },
  "keywords": [
    "mcp",
    "jiandaoyun",
    "ai",
    "assistant",
    "model-context-protocol"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "dotenv": "^16.3.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/jiandaoyun-mcp.git"
  }
}
```

**字段说明**：

| 字段 | 必填 | 说明 |
|------|------|------|
| name | 是 | 项目名称，小写，可用连字符 |
| version | 是 | 语义化版本号 |
| description | 是 | 项目描述，一句话说明 |
| main | 是 | 入口文件路径 |
| types | 是 | TypeScript类型定义文件 |
| scripts | 是 | npm脚本命令 |
| dependencies | 是 | 生产依赖 |
| devDependencies | 否 | 开发依赖 |
| engines | 是 | Node.js版本要求 |

### 2.2 tsconfig.json (TypeScript配置)

**作用**：定义 TypeScript 编译选项

**完整结构**：
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "tests"]
}
```

**编译选项说明**：

| 选项 | 值 | 说明 |
|------|-----|------|
| target | ES2020 | 编译目标版本 |
| module | commonjs | 模块系统 |
| outDir | ./build | 输出目录 |
| rootDir | ./src | 源码目录 |
| strict | true | 严格模式 |
| declaration | true | 生成类型声明文件 |
| sourceMap | true | 生成源码映射 |

### 2.3 .env (环境变量)

**作用**：存储敏感配置信息

**结构要求**：
```env
# 简道云 API 配置
JIANDAOYUN_API_KEY=your_api_key_here
JIANDAOYUN_BASE_URL=https://api.jiandaoyun.com

# 服务器配置
PORT=3000

# 日志配置
LOG_LEVEL=info

# 调试配置
DEBUG=false
```

**环境变量说明**：

| 变量名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| JIANDAOYUN_API_KEY | string | 是 | - | 简道云API密钥 |
| JIANDAOYUN_BASE_URL | string | 否 | https://api.jiandaoyun.com | API基础URL |
| PORT | number | 否 | 3000 | HTTP模式端口 |
| LOG_LEVEL | string | 否 | info | 日志级别 |
| DEBUG | boolean | 否 | false | 调试模式 |

### 2.4 .gitignore (Git忽略文件)

**作用**：防止敏感文件和编译产物被提交

**标准内容**：
```gitignore
# 依赖
node_modules/

# 编译输出
build/
dist/

# 环境变量
.env
.env.local
.env.*.local

# 日志
logs/
*.log
npm-debug.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# 系统文件
.DS_Store
Thumbs.db

# 测试覆盖率
coverage/

# 临时文件
tmp/
temp/
```

---

## 3. 核心模块开发

### 3.1 MCP工具开发

**位置**：`src/mcp-server/shared/init.ts`

**文件要求**：
- 使用 `registerTool` 函数注册工具
- 定义完整的 `inputSchema`
- 实现完善的错误处理
- 返回标准化的响应格式

**函数签名**：
```typescript
registerTool(
  {
    name: 'tool_name',
    description: '工具的详细描述，说明功能、参数和使用场景',
    inputSchema: {
      type: 'object',
      properties: {
        param1: { 
          type: 'string', 
          description: '参数描述，说明参数的含义和格式' 
        },
        param2: { 
          type: 'number', 
          minimum: 1, 
          maximum: 100,
          description: '参数描述' 
        }
      },
      required: ['param1']
    }
  },
  async (args) => {
    // 1. 参数解构和默认值
    const { param1, param2 = 10 } = args;
    
    // 2. 参数验证
    if (!param1 || typeof param1 !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: true,
            message: '请提供有效的参数'
          }, null, 2)
        }]
      };
    }
    
    // 3. 业务逻辑
    try {
      const result = await httpRequest(url, options);
      
      // 4. 返回成功响应
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result
          }, null, 2)
        }]
      };
    } catch (error) {
      // 5. 错误处理
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: true,
            message: error instanceof Error ? error.message : '操作失败'
          }, null, 2)
        }]
      };
    }
  }
);
```

### 3.2 传输层开发

**位置**：`src/mcp-server/transport/`

#### STDIO传输

```typescript
// stdio.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from '../shared/init.js';

const server = new McpServer({
  name: 'jiandaoyun-mcp',
  version: '1.0.4'
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

#### HTTP传输

```typescript
// http.ts
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { registerTools } from '../shared/init.js';

const app = express();
app.use(express.json());

const server = new McpServer({
  name: 'jiandaoyun-mcp',
  version: '1.0.4'
});

registerTools(server);

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  // 处理消息
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
});
```

### 3.3 工具函数开发

**位置**：`src/utils/index.ts`

**HTTP请求函数**：
```typescript
export async function httpRequest<T>(
  url: string, 
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  } = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body,
      signal: controller.signal
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 3.4 开发阶段质量控制 ⚠️ 重要

**核心原则**：问题应该在**开发阶段**被发现和解决

#### 开发阶段检查清单

##### ✅ 步骤 1：代码规范检查

- [ ] 使用 TypeScript 严格模式
- [ ] 所有函数有返回类型
- [ ] 错误处理完整
- [ ] 无 any 类型（特殊情况除外）
- [ ] 无 console.log（使用 logger）
- [ ] 代码格式化一致

##### ✅ 步骤 2：功能测试

- [ ] 每个工具函数单独测试
- [ ] 边界条件测试
- [ ] 错误场景测试
- [ ] 参数验证测试
- [ ] 返回格式测试

##### ✅ 步骤 3：编译验证

```bash
# 编译检查
npm run build

# 检查编译输出
ls -la build/

# 验证类型定义
ls -la build/**/*.d.ts
```

##### ✅ 步骤 4：MCP服务重载 ⭐ 重要

- [ ] 修改代码后重新编译
- [ ] 在 Trae IDE 中关闭 MCP 服务
- [ ] 重新开启 MCP 服务
- [ ] 测试新功能是否生效

---

## 4. 参数定义规范

### 4.1 工具输入参数

```typescript
{
  type: 'object',
  properties: {
    // 字符串参数
    formId: { 
      type: 'string', 
      description: '表单ID或应用ID，可在简道云后台获取' 
    },
    // 数字参数
    limit: { 
      type: 'number', 
      minimum: 1, 
      maximum: 100, 
      default: 20,
      description: '返回数量限制，默认20，最大100' 
    },
    // 枚举参数
    type: { 
      type: 'string', 
      enum: ['todo', 'done', 'copy'],
      default: 'todo',
      description: '查询类型：todo=待办，done=已办，copy=抄送' 
    },
    // 布尔参数
    hasChild: { 
      type: 'boolean', 
      default: false,
      description: '是否包含子部门' 
    },
    // 对象参数
    filter: {
      type: 'object',
      properties: {
        field: { type: 'string' },
        value: { type: 'string' }
      },
      description: '筛选条件'
    }
  },
  required: ['formId']
}
```

### 4.2 工具返回参数

**成功响应**：
```typescript
{
  content: [{
    type: 'text',
    text: JSON.stringify({
      success: true,
      data: {
        // 业务数据
      },
      message: '操作成功'
    }, null, 2)
  }]
}
```

**错误响应**：
```typescript
{
  content: [{
    type: 'text',
    text: JSON.stringify({
      success: false,
      error: true,
      message: '错误描述',
      code: 'ERROR_CODE'
    }, null, 2)
  }]
}
```

### 4.3 环境变量参数

| 变量名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| JIANDAOYUN_API_KEY | string | 是 | - | 简道云API密钥 |
| JIANDAOYUN_BASE_URL | string | 否 | https://api.jiandaoyun.com | API基础URL |
| PORT | number | 否 | 3000 | HTTP模式端口 |
| LOG_LEVEL | string | 否 | info | 日志级别：debug/info/warn/error |
| DEBUG | boolean | 否 | false | 调试模式开关 |

---

## 5. 测试规范

### 5.1 测试文件结构

```
tests/
├── unit/                    # 单元测试
│   ├── tools/              # 工具函数测试
│   │   ├── queryFormData.test.ts
│   │   └── submitFormData.test.ts
│   └── utils/              # 工具函数测试
│       └── httpRequest.test.ts
├── integration/            # 集成测试
│   └── mcp-server.test.ts
└── e2e/                    # 端到端测试
    └── workflow.test.ts
```

### 5.2 测试脚本规范

**运行命令**：
```bash
# 运行所有测试
npm run test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行覆盖率测试
npm run test:coverage
```

### 5.3 测试用例矩阵

| 工具名称 | 测试场景 | 预期结果 | 优先级 | 自动化 |
|---------|---------|---------|--------|--------|
| list_apps_and_forms | 正常调用 | 返回应用列表 | 高 | 是 |
| list_apps_and_forms | 无 API 密钥 | 返回错误信息 | 高 | 是 |
| list_apps_and_forms | API 密钥无效 | 返回认证错误 | 高 | 是 |
| get_form_fields | 正确表单 ID | 返回字段列表 | 高 | 是 |
| get_form_fields | 错误表单 ID | 返回错误信息 | 中 | 是 |
| get_form_fields | 无权限访问 | 返回权限错误 | 中 | 是 |
| submit_form_data | 正常提交 | 返回成功结果 | 高 | 是 |
| submit_form_data | 字段缺失 | 返回验证错误 | 中 | 是 |
| submit_form_data | 数据格式错误 | 返回格式错误 | 中 | 是 |
| query_form_data | 有数据 | 返回数据列表 | 高 | 是 |
| query_form_data | 无数据 | 返回空数组 | 中 | 是 |
| query_form_data | 分页查询 | 返回分页数据 | 中 | 是 |
| query_workflow_instances | 正常查询 | 返回实例列表 | 高 | 是 |
| query_workflow_instances | 实例不存在 | 返回空结果 | 中 | 是 |
| query_workflow_tasks | 待办查询 | 返回待办列表 | 高 | 是 |
| query_workflow_tasks | 已办查询 | 返回已办列表 | 中 | 是 |
| query_workflow_tasks | 抄送查询 | 返回抄送列表 | 中 | 是 |
| query_workflow_tasks | 用户不存在 | 返回错误信息 | 高 | 是 |
| query_approval_comments | 正常查询 | 返回审批意见 | 高 | 是 |
| query_approval_comments | 无审批意见 | 返回空数组 | 中 | 是 |
| query_members | username查询 | 返回成员信息 | 高 | 是 |
| query_members | deptNo查询 | 返回部门成员 | 中 | 是 |
| query_members | 无参数 | 返回错误信息 | 高 | 是 |
| query_departments | 正常查询 | 返回部门列表 | 中 | 是 |
| query_departments | 指定部门 | 返回子部门 | 中 | 是 |
| query_roles | 角色查询 | 返回角色列表 | 中 | 是 |
| query_roles | 角色组查询 | 返回角色组列表 | 中 | 是 |
| query_enterprises | 正常查询 | 返回企业列表 | 中 | 是 |
| query_enterprises | 无权限 | 返回权限错误 | 中 | 是 |

### 5.4 测试代码示例

```typescript
// tests/unit/tools/queryFormData.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registerTool } from '../../../src/mcp-server/shared/init';

describe('query_form_data', () => {
  it('should return data list when formId is valid', async () => {
    const result = await queryFormData({
      formId: 'valid_form_id',
      limit: 10
    });
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
  
  it('should return error when formId is missing', async () => {
    const result = await queryFormData({});
    
    expect(result.success).toBe(false);
    expect(result.error).toBe(true);
  });
});
```

---

## 6. 打包部署

### 6.1 打包流程

```
1. 代码检查
   ├── TypeScript 编译检查
   ├── ESLint 代码检查
   └── 单元测试通过

2. 编译构建
   ├── 清理旧编译文件
   ├── TypeScript 编译
   └── 验证编译输出

3. 打包
   ├── 复制必要文件
   ├── 生成 package-lock.json
   └── 验证包内容

4. 发布
   ├── npm 发布
   ├── GitHub Release
   └── 文档更新
```

### 6.2 打包命令

```bash
# 清理
npm run clean

# 编译
npm run build

# 测试
npm run test

# 发布
npm publish
```

### 6.3 打包前检查清单

#### 代码质量检查

- [ ] TypeScript 编译无错误
- [ ] ESLint 检查通过
- [ ] 所有测试通过
- [ ] 无 console.log/debugger
- [ ] 无 TODO/FIXME 注释

#### 文件检查

- [ ] 所有依赖已安装
- [ ] 环境变量配置正确
- [ ] 文件编码统一为 UTF-8
- [ ] 换行符统一（LF）
- [ ] .gitignore 配置正确

#### 文档检查

- [ ] README.md 已更新
- [ ] CHANGELOG.md 已更新
- [ ] 版本号已更新
- [ ] API 文档已同步

#### 安全检查

- [ ] 无敏感信息泄露
- [ ] .env 未包含在包中
- [ ] API Key 使用环境变量
- [ ] 无硬编码密钥

### 6.4 部署方式

#### 本地开发部署

```bash
# 安装依赖
npm install

# 编译
npm run build

# 启动 STDIO 模式
npm run start

# 启动 HTTP 模式
npm run start:http
```

#### 生产环境部署

```bash
# 1. 拉取代码
git pull origin main

# 2. 安装生产依赖
npm install --production

# 3. 编译
npm run build

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 5. 启动服务
npm run start:http
```

#### Docker 部署

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY build ./build
COPY .env.example .env

EXPOSE 3000

CMD ["npm", "run", "start:http"]
```

---

## 7. 常见问题

### 7.1 基础问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 启动报错 "API Key 未配置" | 环境变量未设置 | 检查 .env 文件，确保 JIANDAOYUN_API_KEY 已配置 |
| 调用返回 403 | API Key 权限不足 | 在简道云后台开通对应接口权限 |
| 编译报错 | TypeScript 配置问题 | 检查 tsconfig.json，确保严格模式配置正确 |
| HTTP 模式无法连接 | 端口被占用 | 修改 PORT 配置或关闭占用端口的进程 |
| 工具函数未生效 | MCP 服务未重载 | 在 Trae IDE 中重新开关 MCP 服务 |

### 7.2 API 调用错误排查清单

#### 核心代码检查

- [ ] API 路径版本是否正确（/api/v5 或 /api/v6）
- [ ] 请求方法是否正确（POST/GET）
- [ ] 请求头是否包含 Authorization
- [ ] 请求体格式是否正确（JSON）
- [ ] 必填参数是否完整

#### 配置文件检查

- [ ] API Key 是否有效
- [ ] Base URL 是否正确
- [ ] 环境变量是否加载
- [ ] .env 文件格式是否正确

#### 权限检查

- [ ] API Key 是否开通对应接口权限
- [ ] 用户是否有数据访问权限
- [ ] 是否需要企业互联权限

#### 网络检查

- [ ] 网络连接是否正常
- [ ] 是否需要代理
- [ ] 防火墙是否阻止

### 7.3 MCP 服务问题排查

#### 工具函数修改后未生效

**现象**：修改了工具函数代码，但 AI 调用时仍使用旧版本

**排查步骤**：
1. 确认代码已保存
2. 确认已运行 `npm run build`
3. 确认 build 目录有最新文件
4. 在 Trae IDE 中重新开关 MCP 服务

**解决步骤**：
```
1. 打开 Trae IDE
2. 进入设置 -> MCP 服务
3. 找到简道云 MCP 服务
4. 点击关闭开关
5. 等待服务停止（约2-3秒）
6. 点击开启开关
7. 等待服务启动完成
8. 测试新功能是否生效
```

---

## 8. 开发经验

### 8.1 开发经验总结

1. **API 版本很重要**：简道云 API 有多个版本（v1/v5/v6），使用前确认正确版本
2. **权限要提前开通**：根据工具函数说明，提前在简道云后台开通所需权限
3. **错误处理要完善**：所有 API 调用都需要 try-catch 处理
4. **日志要详细**：记录关键操作和错误信息，便于排查问题
5. **文档要同步**：代码变更时同步更新文档
6. **MCP 重载要记得**：每次修改工具函数后，必须重新加载 MCP 服务

### 8.2 工具函数开发最佳实践

#### 参数校验

```typescript
// ✅ 推荐：完整的参数校验
if (!formId || typeof formId !== 'string') {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: false,
        error: true,
        message: '请提供有效的表单ID'
      }, null, 2)
    }]
  };
}

// ✅ 推荐：参数格式校验
if (limit && (limit < 1 || limit > 100)) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: false,
        error: true,
        message: 'limit 参数必须在 1-100 之间'
      }, null, 2)
    }]
  };
}
```

#### 错误处理

```typescript
// ✅ 推荐：统一的错误处理
try {
  const result = await httpRequest(url, options);
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ success: true, data: result }, null, 2)
    }]
  };
} catch (error) {
  // 记录错误日志
  logger.error('API调用失败', { 
    url, 
    error: error instanceof Error ? error.message : '未知错误' 
  });
  
  // 返回标准化错误
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: false,
        error: true,
        message: error instanceof Error ? error.message : '操作失败'
      }, null, 2)
    }]
  };
}
```

#### 日志记录

```typescript
// ✅ 推荐：关键操作记录日志
logger.info('开始查询表单数据', { formId, limit });
const result = await queryFormData({ formId, limit });
logger.info('查询完成', { formId, count: result.data.length });

// ✅ 推荐：错误记录详细日志
logger.error('API调用失败', {
  url,
  method,
  params,
  error: error.message,
  stack: error.stack
});
```

### 8.3 调试经验总结

1. **先测试 API**：使用 Postman 等工具先测试简道云 API 是否正常
2. **检查权限**：403 错误通常是权限问题
3. **查看日志**：通过日志定位问题
4. **逐步验证**：每新增一个工具就测试一次
5. **使用调试模式**：设置 DEBUG=true 获取更多信息

### 8.4 MCP 服务重载经验 ⭐ 重要

**经验来源**：实际开发中发现修改工具函数后，AI 调用仍使用旧版本

**根本原因**：Trae IDE 的 MCP 服务会缓存工具定义，需要手动重载

**标准操作流程**：
```bash
# 1. 修改代码
vim src/mcp-server/shared/init.ts

# 2. 保存并编译
npm run build

# 3. 在 Trae IDE 中重新加载 MCP
#    设置 -> MCP -> 找到简道云MCP -> 关闭 -> 开启

# 4. 测试新功能
#    在对话中测试工具函数是否生效
```

**注意事项**：
- 编译完成后必须重载 MCP 服务
- 重载时等待服务完全停止再开启
- 重载后测试新功能确认生效

---

## 9. 工程检查清单

### 9.1 项目初始化检查清单

#### 环境准备

- [ ] Node.js v18+ 已安装
- [ ] npm v9+ 已安装
- [ ] Git 已安装
- [ ] VS Code（或其他IDE）已安装

#### 项目配置

- [ ] 项目已克隆到本地
- [ ] 依赖已安装（npm install）
- [ ] .env 文件已创建
- [ ] API Key 已配置
- [ ] 项目已编译（npm run build）

#### 权限配置

- [ ] API Key 已开通应用管理权限
- [ ] API Key 已开通数据读写权限
- [ ] API Key 已开通流程管理权限
- [ ] API Key 已开通通讯录权限（如需）
- [ ] API Key 已开通企业互联权限（如需）

### 9.2 开发阶段检查清单

#### 代码编写

- [ ] 使用 TypeScript 严格模式
- [ ] 所有函数有返回类型
- [ ] 参数有完整描述
- [ ] 错误处理完善
- [ ] 日志记录完整

#### 代码质量

- [ ] 无 any 类型（特殊情况除外）
- [ ] 无 console.log（使用 logger）
- [ ] 无 debugger 语句
- [ ] 无 TODO/FIXME 注释
- [ ] 代码格式化一致

#### 功能测试

- [ ] 正常场景测试通过
- [ ] 异常场景测试通过
- [ ] 边界条件测试通过
- [ ] 参数验证测试通过

#### 编译验证

- [ ] TypeScript 编译无错误
- [ ] 编译输出文件完整
- [ ] 类型定义文件生成
- [ ] SourceMap 文件生成

### 9.3 MCP 服务检查清单

#### 服务启动

- [ ] MCP 服务已启动
- [ ] 服务状态正常
- [ ] 工具列表已加载
- [ ] 工具函数可调用

#### 工具函数验证

- [ ] list_apps_and_forms 可调用
- [ ] get_form_fields 可调用
- [ ] submit_form_data 可调用
- [ ] query_form_data 可调用
- [ ] 其他工具函数可调用

#### 修改后重载

- [ ] 代码已保存
- [ ] 项目已重新编译
- [ ] MCP 服务已关闭
- [ ] MCP 服务已重新开启
- [ ] 新功能已验证生效

### 9.4 发布前检查清单

#### 代码检查

- [ ] 所有测试通过
- [ ] 无编译错误
- [ ] 无 Lint 错误
- [ ] 无安全漏洞

#### 文档检查

- [ ] README.md 已更新
- [ ] CHANGELOG.md 已更新
- [ ] API 文档已同步
- [ ] 版本号已更新

#### 安全检查

- [ ] 无敏感信息泄露
- [ ] .env 未包含在发布包
- [ ] API Key 使用环境变量
- [ ] 无硬编码密钥

#### 功能检查

- [ ] 所有工具函数正常
- [ ] 错误处理正确
- [ ] 日志输出正常
- [ ] 性能满足要求

### 9.5 部署后检查清单

#### 服务状态

- [ ] 服务正常运行
- [ ] 端口监听正常
- [ ] 日志输出正常
- [ ] 无错误日志

#### 功能验证

- [ ] 工具函数可调用
- [ ] 返回结果正确
- [ ] 错误处理正常
- [ ] 性能指标正常

#### 监控配置

- [ ] 日志监控已配置
- [ ] 错误告警已配置
- [ ] 性能监控已配置
- [ ] 备份机制已就绪

---

## 10. 附录

### 10.1 工具函数速查表

| 工具函数 | 类型 | 必填参数 | 可选参数 | 说明 |
|---------|------|---------|---------|------|
| list_apps_and_forms | 应用 | 无 | - | 获取应用列表 |
| get_form_fields | 表单 | formId | - | 获取字段信息 |
| submit_form_data | 数据 | formId, data | - | 提交数据 |
| query_form_data | 数据 | formId | limit, skip, filter | 查询数据 |
| update_form_data | 数据 | formId, dataId, data | - | 更新数据 |
| delete_form_data | 数据 | formId, dataId | - | 删除数据 |
| get_upload_token | 文件 | formId | - | 获取上传令牌 |
| get_latest_data | 数据 | formId | limit | 获取最新数据 |
| get_department_users | 部门 | deptNo | - | 获取部门用户 |
| get_department_children | 部门 | deptNo | - | 获取子部门 |
| query_workflow_instances | 流程 | instanceId | - | 查询流程实例 |
| query_workflow_tasks | 流程 | username 或 name | type, status, limit, skip | 查询待办任务 |
| query_approval_comments | 流程 | appId, formId, dataId | - | 查询审批意见 |
| query_members | 通讯录 | username 或 deptNo | hasChild | 查询成员 |
| query_departments | 通讯录 | 无 | deptNo | 查询部门 |
| query_roles | 通讯录 | type | - | 查询角色 |
| query_enterprises | 企业 | 无 | - | 查询互联企业 |

### 10.2 API 版本对照表

| API 版本 | 用途 | 示例接口 |
|---------|------|----------|
| v1 | 基础接口 | /api/v1/workflow/cc/list |
| v5 | 主流接口 | /api/v5/app/list, /api/v5/workflow/task/list |
| v6 | 新版接口 | /api/v6/workflow/instance/get |

### 10.3 错误码对照表

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 1001 | 参数错误 | 检查参数格式和必填项 |
| 1010 | 用户不存在 | 确认用户名或姓名正确 |
| 403 | 权限不足 | 开通对应API权限 |
| 404 | 接口不存在 | 检查API路径和版本 |
| 500 | 服务器错误 | 联系简道云技术支持 |

### 10.4 推荐的开发工作流

```
1. 需求分析阶段
   ├── 明确业务需求
   ├── 确定需要的工具函数
   ├── 检查 API 权限要求
   └── 评估开发工作量

2. 开发阶段
   ├── 编写工具函数代码
   ├── 本地测试验证
   ├── 编译项目
   ├── 重新加载 MCP 服务 ⭐
   └── 更新相关文档

3. 测试阶段
   ├── 单元测试
   ├── 集成测试
   ├── 端到端测试
   └── 性能测试

4. 发布阶段
   ├── 代码审查
   ├── 文档更新
   ├── 版本号更新
   └── 发布部署

5. 运维阶段
   ├── 监控服务状态
   ├── 收集用户反馈
   ├── 问题排查修复
   └── 持续优化改进
```

### 10.5 常用命令速查

```bash
# 开发命令
npm install          # 安装依赖
npm run build        # 编译项目
npm run start        # 启动 STDIO 模式
npm run start:http   # 启动 HTTP 模式
npm run dev          # 开发模式（热重载）

# 测试命令
npm run test         # 运行测试
npm run test:unit    # 单元测试
npm run test:coverage # 覆盖率测试

# 代码质量
npm run lint         # ESLint 检查
npm run lint:fix     # 自动修复

# 清理命令
npm run clean        # 清理编译文件
rm -rf node_modules  # 清理依赖
```

---

> **文档结束**

**最后更新**：2026-02-27
**版本**：v1.0.4
**维护者**：简道云MCP项目组
