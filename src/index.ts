#!/usr/bin/env node

/**
 * 简道云 MCP 服务器入口文件
 * 
 * 提供与简道云（JianDaoYun）表单数据交互的 MCP 服务
 * 支持多种传输模式：STDIO（本地）、HTTP（远程）、SSE（实时推送）
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { logger } from './utils/logger.js';
import { initializeServer, getToolHandlers } from './mcp-server/shared/init.js';
import { startStdioServer } from './mcp-server/transport/stdio.js';
import { startHTTPServer, stopHTTPServer } from './mcp-server/transport/http.js';

/**
 * 传输模式类型
 */
type TransportMode = 'stdio' | 'http' | 'both';

/**
 * 获取传输模式配置
 */
function getTransportMode(): TransportMode {
  const mode = process.env.TRANSPORT_MODE?.toLowerCase();
  
  if (mode === 'http' || mode === 'sse' || mode === 'http+sse') {
    return 'http';
  }
  
  if (mode === 'both' || mode === 'all') {
    return 'both';
  }
  
  // 默认使用 STDIO（向后兼容）
  return 'stdio';
}

/**
 * 获取 HTTP 服务器配置
 */
function getHTTPServerConfig() {
  const port = parseInt(process.env.HTTP_PORT || '3000', 10);
  const host = process.env.HTTP_HOST || '0.0.0.0';
  
  return { port, host };
}

/**
 * 显示启动信息
 */
function displayStartupInfo(mode: TransportMode, httpConfig: { port: number; host: string }) {
  logger.info('='.repeat(50));
  logger.info('JianDaoYun MCP Server');
  logger.info('='.repeat(50));
  logger.info(`Version: 1.0.1`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'production'}`);
  logger.info(`Log Level: ${process.env.LOG_LEVEL || 'INFO'}`);
  logger.info(`Transport Mode: ${mode}`);
  logger.info('');
  
  if (mode === 'stdio' || mode === 'both') {
    logger.info('[STDIO Mode]');
    logger.info('  Status: ✅ Enabled');
    logger.info('  Usage: Connect via MCP client (Claude Desktop, Cursor, etc.)');
    logger.info('');
  }
  
  if (mode === 'http' || mode === 'both') {
    logger.info('[HTTP Mode]');
    logger.info(`  Status: ✅ Enabled`);
    logger.info(`  Base URL: http://${httpConfig.host}:${httpConfig.port}`);
    logger.info('  Endpoints:');
    logger.info(`    - GET  /health          - Health check`);
    logger.info(`    - GET  /info           - Server info`);
    logger.info(`    - GET  /api/sse/init    - SSE connection`);
    logger.info(`    - POST /api/tools/:name - Call tool`);
    logger.info(`    - GET  /api/tools       - List tools`);
    logger.info('');
    
    logger.info('[Usage Examples]');
    logger.info('  # List tools');
    logger.info(`  curl http://${httpConfig.host}:${httpConfig.port}/api/tools`);
    logger.info('');
    logger.info('  # Submit form data');
    logger.info(`  curl -X POST http://${httpConfig.host}:${httpConfig.port}/api/tools/submit_form_data \\`);
    logger.info(`    -H "Content-Type: application/json" \\`);
    logger.info(`    -d '{"formId": "xxx", "data": {"姓名": "张三"}}'`);
    logger.info('');
    
    logger.info('  # Connect SSE');
    logger.info(`  curl -N http://${httpConfig.host}:${httpConfig.port}/api/sse/init`);
    logger.info('');
  }
  
  logger.info('[Environment Variables]');
  logger.info('  TRANSPORT_MODE  - Transport mode (stdio|http|both), default: stdio');
  logger.info('  HTTP_PORT       - HTTP server port, default: 3000');
  logger.info('  HTTP_HOST       - HTTP server host, default: 0.0.0.0');
  logger.info('  JIANDAOYUN_API_KEY  - API Key (required)');
  logger.info('  JIANDAOYUN_APP_ID  - Default App ID');
  logger.info('');
  logger.info('='.repeat(50));
}

/**
 * 检查环境配置
 */
function checkEnvironment() {
  const appKey = process.env.JIANDAOYUN_API_KEY;
  
  if (!appKey) {
    logger.warn('JIANDAOYUN_API_KEY not set in environment.');
    logger.warn('  Tools will require API Key to be passed in each call.');
  } else {
    logger.info('JIANDAOYUN_API_KEY: ✅ Configured');
  }
  
  const appId = process.env.JIANDAOYUN_APP_ID;
  if (appId) {
    logger.info('JIANDAOYUN_APP_ID: ✅ Configured');
  }
  
  return { appKey, appId };
}

/**
 * 主函数 - 启动 MCP 服务器
 */
async function main(): Promise<void> {
  // 获取配置
  const mode = getTransportMode();
  const httpConfig = getHTTPServerConfig();
  const { appKey, appId } = checkEnvironment();
  
  // 显示启动信息
  displayStartupInfo(mode, httpConfig);
  
  // 创建 MCP 服务器实例
  const server = new Server(
    {
      name: 'jiandaoyun-mcp',
      version: '1.0.1'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  
  // 初始化服务器（注册所有工具）
  initializeServer(server);
  
  // 获取工具处理器（用于 HTTP 模式）
  const toolHandlers = getToolHandlers();
  
  // 根据传输模式启动
  const promises: Promise<any>[] = [];
  
  if (mode === 'stdio' || mode === 'both') {
    logger.info('Starting STDIO transport...');
    promises.push(startStdioServer(server));
  }
  
  if (mode === 'http' || mode === 'both') {
    logger.info('Starting HTTP transport...');
    promises.push(startHTTPServer(server, toolHandlers, httpConfig));
  }
  
  // 等待所有传输层启动
  await Promise.all(promises);
  
  // 优雅关闭处理
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
      if (mode === 'http' || mode === 'both') {
        await stopHTTPServer();
      }
      
      await server.close();
      logger.info('Server shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  logger.info('');
  logger.info('✅ JianDaoYun MCP Server is ready!');
  logger.info('');
  
  if (mode === 'http' || mode === 'both') {
    logger.info(`Server running at: http://${httpConfig.host}:${httpConfig.port}`);
  }
}

// 启动服务器
main().catch((error) => {
  logger.error('Failed to start server:', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
