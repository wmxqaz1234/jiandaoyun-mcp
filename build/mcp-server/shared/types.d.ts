import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { JianDaoYunClient } from '../../client.js';
/**
 * MCP 服务器初始化选项
 */
export interface McpServerOptions {
    appId?: string;
    appKey?: string;
    baseUrl?: string;
    userAccessToken?: any;
}
/**
 * 认证处理器接口
 */
export interface AuthHandler {
    setupRoutes?: () => void;
}
/**
 * 服务器创建函数类型
 */
export type GetNewServerFunction = (options: McpServerOptions, authHandler?: AuthHandler) => Server;
/**
 * 传输服务器初始化函数类型
 */
export type InitTransportServerFunction = (getNewServer: GetNewServerFunction, options: McpServerOptions, config?: {
    needAuthFlow?: boolean;
}) => Promise<void>;
/**
 * 客户端实例缓存
 */
export interface ClientCache {
    client: JianDaoYunClient;
    timestamp: number;
}
//# sourceMappingURL=types.d.ts.map