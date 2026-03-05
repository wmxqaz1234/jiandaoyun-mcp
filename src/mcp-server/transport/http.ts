/**
 * MCP 服务器 HTTP + SSE 传输层
 * 
 * 支持两种接入方式：
 * 1. REST API: 工具调用接口 (POST /api/tools/:toolName)
 * 2. SSE: 服务端推送 (GET /api/sse) - 用于异步任务状态推送
 * 
 * 使用原生 Node.js HTTP 模块，无需额外框架依赖
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { logger } from '../../utils/logger.js';

interface StartHTTPServerOptions {
  port: number;
  host?: string;
}

interface HTTPServerContext {
  server: Server;
  toolHandlers: Map<string, (args: any) => Promise<any>>;
}

let httpServer: http.Server | null = null;
let sseClients: Set<(data: any) => void> = new Set();

/**
 * 发送 JSON 响应
 */
function sendJSON(res: ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID'
  });
  res.end(JSON.stringify(data));
}

/**
 * 解析请求体
 */
async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * 创建 HTTP 请求处理器
 */
function createRequestHandler(context: HTTPServerContext): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const { toolHandlers } = context;

  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method || 'GET';

    // CORS 预检请求
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
        'Access-Control-Max-Age': '86400'
      });
      res.end();
      return;
    }

    try {
      // 健康检查
      if (pathname === '/health' && method === 'GET') {
        sendJSON(res, 200, {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          server: 'jiandaoyun-mcp',
          version: '1.0.1'
        });
        return;
      }

      // 服务信息
      if (pathname === '/info' && method === 'GET') {
        sendJSON(res, 200, {
          name: 'jiandaoyun-mcp',
          version: '1.0.1',
          transport: 'http+sse',
          endpoints: {
            health: 'GET /health',
            tools: 'GET /api/tools',
            callTool: 'POST /api/tools/:toolName',
            sseInit: 'GET /api/sse/init',
            sseStats: 'GET /api/sse/stats'
          }
        });
        return;
      }

      // SSE 连接端点
      if (pathname === '/api/sse/init' && method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*'
        });

        const clientId = Date.now().toString();
        logger.info(`SSE client connected: ${clientId}`);

        // 发送初始化消息
        const initData = JSON.stringify({
          type: 'init',
          clientId,
          timestamp: new Date().toISOString()
        });
        res.write(`data: ${initData}\n\n`);

        // 注册客户端
        const sendMessage = (data: any) => {
          try {
            const msg = JSON.stringify(data);
            res.write(`data: ${msg}\n\n`);
          } catch (e) {
            logger.error('SSE send error', { error: e });
          }
        };
        sseClients.add(sendMessage);

        // 发送心跳
        const heartbeat = setInterval(() => {
          try {
            res.write(': heartbeat\n\n');
          } catch (e) {
            clearInterval(heartbeat);
            sseClients.delete(sendMessage);
          }
        }, 30000);

        // 客户端断开连接
        req.on('close', () => {
          clearInterval(heartbeat);
          sseClients.delete(sendMessage);
          logger.info(`SSE client disconnected: ${clientId}`);
        });

        return;
      }

      // SSE 统计
      if (pathname === '/api/sse/stats' && method === 'GET') {
        sendJSON(res, 200, {
          connectedClients: sseClients.size
        });
        return;
      }

      // 获取工具列表
      if (pathname === '/api/tools' && method === 'GET') {
        const tools = Array.from(toolHandlers.entries()).map(([name]) => ({
          name,
          description: `简道云工具: ${name}`
        }));

        sendJSON(res, 200, {
          success: true,
          tools,
          total: tools.length
        });
        return;
      }

      // 调用单个工具
      const toolMatch = pathname.match(/^\/api\/tools\/([^/]+)$/);
      if (toolMatch && method === 'POST') {
        const toolName = toolMatch[1];
        const requestId = req.headers['x-request-id'] || crypto.randomUUID();

        logger.info('Tool call received', { tool: toolName, requestId });

        // 查找工具处理器
        const toolHandler = toolHandlers.get(toolName);
        if (!toolHandler) {
          sendJSON(res, 404, {
            success: false,
            error: {
              code: 'TOOL_NOT_FOUND',
              message: `Tool '${toolName}' not found`,
              availableTools: Array.from(toolHandlers.keys())
            }
          });
          return;
        }

        try {
          const body = await parseBody(req);
          const args = body.args || body.data || body;

          // 执行工具调用
          const result = await toolHandler(args);

          // 广播工具调用事件（如果有 SSE 订阅者）
          if (sseClients.size > 0) {
            const event = {
              type: 'tool_call',
              tool: toolName,
              requestId,
              result: typeof result === 'string' ? JSON.parse(result) : result,
              timestamp: new Date().toISOString()
            };

            sseClients.forEach(send => {
              try {
                send(event);
              } catch (e) {
                logger.error('SSE broadcast error', { error: e });
              }
            });
          }

          sendJSON(res, 200, {
            success: true,
            data: result,
            requestId
          });
        } catch (error) {
          logger.error('Tool execution failed', {
            tool: toolName,
            error: error instanceof Error ? error.message : String(error),
            requestId
          });

          sendJSON(res, 500, {
            success: false,
            error: {
              code: 'TOOL_EXECUTION_FAILED',
              message: error instanceof Error ? error.message : String(error),
              requestId
            }
          });
        }

        return;
      }

      // 404
      sendJSON(res, 404, {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint not found: ${method} ${pathname}`
        }
      });

    } catch (error) {
      logger.error('HTTP Server Error', {
        error: error instanceof Error ? error.message : String(error),
        pathname
      });

      sendJSON(res, 500, {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error'
        }
      });
    }
  };
}

/**
 * 启动 HTTP 服务器
 */
export async function startHTTPServer(
  server: Server,
  toolHandlers: Map<string, { definition: any; handler: (args: any) => Promise<any> }>,
  options: StartHTTPServerOptions
): Promise<void> {
  const { port, host = '0.0.0.0' } = options;

  // 提取工具处理器
  const handlers = new Map<string, (args: any) => Promise<any>>();
  toolHandlers.forEach((value, key) => {
    handlers.set(key, value.handler);
  });

  const context: HTTPServerContext = {
    server,
    toolHandlers: handlers
  };

  // 创建 HTTP 服务器
  httpServer = http.createServer(createRequestHandler(context));

  // 启动服务器
  await new Promise<void>((resolve, reject) => {
    httpServer!.listen(port, host, () => {
      resolve();
    });
    httpServer!.on('error', reject);
  });

  logger.info(`HTTP Server started on http://${host}:${port}`);
  logger.info('Available endpoints:');
  logger.info(`  - GET  /health         - Health check`);
  logger.info(`  - GET  /info          - Server info`);
  logger.info(`  - GET  /api/sse/init   - SSE connection`);
  logger.info(`  - GET  /api/sse/stats  - SSE statistics`);
  logger.info(`  - GET  /api/tools      - List tools`);
  logger.info(`  - POST /api/tools/:name - Call tool`);
}

/**
 * 获取 HTTP 服务器实例
 */
export function getHTTPServer() {
  return httpServer;
}

/**
 * 停止 HTTP 服务器
 */
export function stopHTTPServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (httpServer) {
      httpServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          logger.info('HTTP Server stopped');
          httpServer = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

export default {
  startHTTPServer,
  stopHTTPServer,
  getHTTPServer
};
