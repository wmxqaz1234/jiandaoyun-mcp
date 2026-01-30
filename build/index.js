#!/usr/bin/env node
import 'dotenv/config';
import { initStdioServer } from './mcp-server/transport/stdio.js';
import { createMcpServer } from './mcp-server/shared/init.js';
import { logger } from './utils/logger.js';
async function main() {
    try {
        // 从环境变量获取配置
        const options = {
            appId: process.env.JIANDAOYUN_APP_ID,
            appKey: process.env.JIANDAOYUN_APP_KEY,
            baseUrl: process.env.JIANDAOYUN_BASE_URL
        };
        logger.info('Starting JianDaoYun MCP Server...');
        logger.info(`Configuration: appId=${Boolean(options.appId)}, appKey=${Boolean(options.appKey)}, baseUrl=${options.baseUrl || 'default'}`);
        // 初始化标准输入输出服务器
        await initStdioServer((serverOptions) => createMcpServer(serverOptions), options, { needAuthFlow: false });
        logger.info('JianDaoYun MCP server started successfully');
    }
    catch (error) {
        logger.error(`Server startup error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map