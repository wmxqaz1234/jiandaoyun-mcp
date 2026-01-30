import { McpError } from '@modelcontextprotocol/sdk/types.js';
/**
 * 获取参数默认值，优先使用传入的参数，否则从环境变量获取
 */
export declare function getDefaultParams(args: any): {
    appId: any;
    appKey: any;
    baseUrl: string | undefined;
};
/**
 * 增强的错误处理函数
 */
export declare function createEnhancedError(error: any, context: string): McpError;
/**
 * 获取应用列表（带缓存）
 */
export declare function getAppList(appKey: string): Promise<any[]>;
/**
 * 智能解析表单ID - 自动判断输入的是应用ID还是表单ID
 */
export declare function resolveFormId(inputId: string, appKey: string): Promise<{
    formId: string;
    appId?: string;
    suggestions?: string[];
}>;
/**
 * 智能字段匹配 - 将用户输入的字段名转换为后台字段名
 */
export declare function smartFieldMapping(formId: string, userData: any, appKey: string, appId?: string): Promise<any>;
//# sourceMappingURL=index.d.ts.map