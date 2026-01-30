import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from '../../utils/logger.js';
export const initStdioServer = async (getNewServer, options, { needAuthFlow } = { needAuthFlow: false }) => {
    const { userAccessToken, appId, appKey } = options;
    // 不需要认证流程，因为简道云使用 API Key 认证
    const transport = new StdioServerTransport();
    const userAccessTokenValue = userAccessToken
        ? userAccessToken
        : undefined;
    const mcpServer = getNewServer({ ...options, userAccessToken: userAccessTokenValue });
    logger.info(`[StdioServerTransport] Connecting to MCP Server, userAccessToken: ${Boolean(userAccessToken)}, appId: ${appId}, appKey: ${Boolean(appKey)}`);
    try {
        await mcpServer.connect(transport);
        logger.info('[StdioServerTransport] MCP Server connected successfully');
    }
    catch (error) {
        logger.error(`[StdioServerTransport] MCP Connect Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
};
//# sourceMappingURL=stdio.js.map