/**
 * MCP 服务器 Stdio 传输层
 * 基于标准输入输出实现 MCP 协议通信
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from '../../utils/logger.js';

/**
 * 创建并启动 Stdio 传输层的 MCP 服务器
 * @param server - MCP 服务器实例
 */
export async function startStdioServer(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  
  logger.info('MCP Server started on stdio');
}

export default { startStdioServer };
