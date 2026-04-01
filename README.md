# 简道云 MCP 服务器

[![npm version](https://img.shields.io/npm/v/jiandaoyun-mcp.svg)](https://www.npmjs.com/package/jiandaoyun-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/jiandaoyun-mcp.svg)](https://nodejs.org)

简道云 MCP 服务器是一个基于 Model Context Protocol（MCP）的服务，允许 AI 助手（如 Claude、Trae）直接访问和操作简道云平台的数据。通过本项目，您可以快速实现 AI 与简道云的深度集成。

## 核心特性

- **全面覆盖**：17 个工具函数，覆盖应用表单、数据操作、流程管理、通讯录、企业互联等核心功能
- **双传输模式**：支持 STDIO 本地开发和 HTTP/SSE 远程访问
- **智能字段匹配**：支持精确匹配、别名匹配、模糊匹配三种模式
- **零配置启动**：只需配置 API Key，5 分钟即可完成部署
- **类型安全**：完整的 TypeScript 类型定义，提升开发体验

## 功能列表

### 应用与表单管理

- 获取应用列表及表单信息
- 获取指定表单的字段详情

### 数据操作

- 查询表单数据（支持过滤、分页、排序）
- 提交单条或批量数据
- 更新已有数据
- 删除数据（支持批量删除）
- 获取最新一条数据

### 流程管理

- 查询流程实例信息
- 查询待办/已办任务列表
- 查询审批意见

### 通讯录管理

- 查询部门列表及详情
- 获取部门成员
- 查询成员信息

### 企业互联

- 查询已连接企业列表
- 获取企业对接人信息

### 文件操作

- 获取文件上传令牌

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm 或 yarn

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/your-org/jiandaoyun-mcp.git
cd jiandaoyun-mcp

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env
```

### 配置 API Key

编辑 `.env` 文件，填入您的简道云 API Key：

```
JIANDAOYUN_API_KEY=your_api_key_here
```

### 编译项目

```bash
npm run build
```

### 配置 AI 助手

根据您使用的 AI 助手，编辑对应的配置文件：

#### Trae 配置

编辑 `%APPDATA%\Trae CN\User\mcp.json`（Windows）或 `~/Library/Application Support/Trae CN/User/mcp.json`（macOS）：

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

#### Claude Code CLI 配置

在项目根目录创建 `.mcp.json` 文件：

```bash
# 方式1：使用 mcp add 命令（会自动创建配置）
mcp add jiandaoyun-mcp "node" "D:\\Trae CN\\project\\pro_1\\jiandaoyun-mcp\\jiandaoyun-mcp\\build\\index.js"
```

或者手动创建 `.mcp.json`（不支持 env 字段，环境变量需通过 .env 文件配置）：

```json
{
  "mcpServers": {
    "jiandaoyun-mcp": {
      "command": "node",
      "args": ["D:\\Trae CN\\project\\pro_1\\jiandaoyun-mcp\\jiandaoyun-mcp\\build\\index.js"]
    }
  }
}
```

> ⚠️ 环境变量（JIANDAOYUN_API_KEY 等）需在项目根目录的 `.env` 文件中配置

### 验证配置

1. 重启 AI 助手
2. 使用 `/mcp` 命令查看已连接的 MCP 服务器
3. 或直接询问 AI："列出可用的简道云工具"

## 使用示例

### 查询应用列表

```
列出我账户中的所有简道云应用
```

### 查询表单数据

```
查询客户表单中最近10条数据
```

### 提交数据

```
向订单表单提交一条新数据：客户名称为张三，金额为500元
```

### 流程审批

```
查询我的待办任务列表
```

## 文档

- [开发指南](./doc/dev_guide_jiandaoyun_mcp.md) - 详细的开发配置文档
- [最佳实践](./doc/best_practice_jiandaoyun_mcp.md) - 使用场景和案例分析
- [工程结构规范](./doc/structure_spec_jiandaoyun_mcp.md) - 代码规范和架构说明

## 项目结构

```
jiandaoyun-mcp/
├── src/
│   ├── mcp-server/
│   │   ├── shared/
│   │   │   └── init.ts          # MCP 服务器初始化和工具注册
│   │   └── transport/
│   │       ├── stdio.ts          # STDIO 传输层实现
│   │       └── http.ts           # HTTP + SSE 传输层实现
│   ├── utils/
│   │   ├── index.ts              # 工具函数
│   │   └── logger.ts             # 日志系统
│   ├── client.ts                 # 简道云 API 客户端
│   ├── types.ts                  # TypeScript 类型定义
│   └── index.ts                  # 入口文件
├── build/                        # 编译输出目录
├── doc/                          # 文档目录
├── .env                          # 环境变量配置
├── .env.example                  # 环境变量示例
├── package.json                  # 项目依赖配置
└── tsconfig.json                 # TypeScript 配置
```

## 技术栈

- **语言**：TypeScript
- **核心依赖**：
  - @modelcontextprotocol/sdk - MCP 协议实现
  - axios - HTTP 请求
  - dotenv - 环境变量管理

## 常见问题

### 如何获取简道云 API Key？

登录简道云管理后台，进入「开放平台」，创建应用并获取 API Key。

### 支持哪些简道云版本？

支持简道云企业版和旗舰版。

### 如何处理字段匹配问题？

系统支持三种字段匹配模式：精确匹配（优先）、别名匹配、模糊匹配。如遇匹配问题，可在提交数据时使用完整的字段名称。

### 如何开启 HTTP 远程访问？

在 `.env` 文件中设置传输模式：

```
TRANSPORT_MODE=http
HTTP_PORT=3000
```

然后启动服务：

```bash
npm run start
```

默认端口为 3000，可通过环境变量 `HTTP_PORT` 修改。

## 许可证

MIT License

## 贡献指南

欢迎提交 Issue 和 Pull Request！
