/**
 * MCP 服务器初始化模块
 * 负责注册工具、处理请求和错误管理
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger.js';
import { getDefaultParams, validateInput, resolveFormId, smartFieldMapping, httpRequest } from '../../utils/index.js';
import type { ValidationRule } from '../../types.js';

// 导入 fetch 函数，因为 Node.js 环境中默认没有
export const fetch = globalThis.fetch || require('node-fetch').default;

/**
 * 工具定义
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

/**
 * 工具处理器函数类型
 */
type ToolHandler = (args: Record<string, any>) => Promise<any>;

/**
 * 工具注册表
 */
export const tools = new Map<string, { definition: ToolDefinition; handler: ToolHandler }>();

/**
 * 注册工具
 * @param definition - 工具定义
 * @param handler - 工具处理器
 */
function registerTool(definition: ToolDefinition, handler: ToolHandler): void {
  tools.set(definition.name, { definition, handler });
}

/**
 * 定义所有可用的工具
 */
function defineTools(): void {
  // 列出所有应用和表单
  registerTool(
    {
      name: 'list_apps_and_forms',
      description: '获取简道云账户中的所有应用及其表单列表。支持通过 appId 参数指定特定应用。',
      inputSchema: {
        type: 'object',
        properties: {
          appId: {
            type: 'string',
            description: '可选：应用ID，如果提供则只返回该应用的信息'
          }
        }
      }
    },
    async (args) => {
      try {
        // 添加详细的调试日志
        console.error(`[DEBUG] 进入 list_apps_and_forms 工具`);
        console.error(`[DEBUG] 传入的参数:`, args);
        
        // 获取参数默认值
        let appId: string | undefined;
        let appKey: string;
        let baseUrl: string;
        
        try {
          ({ appId, appKey, baseUrl } = getDefaultParams(args));
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: true,
                message: error instanceof Error ? error.message : '缺少必需的 API Key',
                apps: [],
                total: 0
              }, null, 2)
            }]
          };
        }
        
        console.error(`[DEBUG] API Key: ${appKey.substring(0, 10)}...`);
        console.error(`[DEBUG] Base URL: ${baseUrl}`);
        console.error(`[DEBUG] App ID from params: ${args.appId || '未提供'}`);
        console.error(`[DEBUG] App ID from default: ${appId || '未提供'}`);
        
        const { appId: specificAppId } = args as { appId?: string };
        const targetAppId = specificAppId;
        // 检查 targetAppId 是否为有效的应用 ID（不是占位符）
        const isValidAppId = targetAppId && targetAppId !== 'your_app_id' && targetAppId.length > 0;
        
        console.error(`[DEBUG] Target App ID: ${targetAppId || '未提供'}`);
        console.error(`[DEBUG] Is valid App ID: ${isValidAppId}`);
        
        if (isValidAppId) {
          // 获取特定应用的表单列表
          try {
            console.error(`[DEBUG] 开始获取特定应用的表单列表: ${targetAppId}`);
            
            const response = await httpRequest<any>(`${baseUrl}/api/v5/app/entry/list`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ app_id: targetAppId, skip: 0, limit: 0 })
            });
            
            console.error(`[DEBUG] 获取表单列表响应:`, response);
            
            const forms = response || [];
            console.error(`[DEBUG] 获取到表单数量: ${forms.length}`);
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  appId: targetAppId,
                  forms: forms.map((form: any) => ({
                    id: form.entry_id || form._id,
                    name: form.name || '未命名表单',
                    description: form.description || '',
                    created_time: form.created_time,
                    updated_time: form.updated_time
                  })),
                  total: forms.length,
                  message: '获取应用表单列表成功'
                }, null, 2)
              }]
            };
          } catch (error) {
            console.error(`[DEBUG] 获取表单列表失败:`, error);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: true,
                  message: `无法获取应用 "${targetAppId}" 下的表单列表: ${error instanceof Error ? error.message : '未知错误'}`,
                  appId: targetAppId,
                  forms: [],
                  total: 0
                }, null, 2)
              }]
            };
          }
        } else {
          // 获取所有应用列表
          try {
            console.error(`[DEBUG] 开始获取所有应用列表`);
            
            const response = await httpRequest<any>(`${baseUrl}/api/v5/app/list`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ skip: 0, limit: 100 })
            });
            
            console.error(`[DEBUG] 获取应用列表响应:`, response);
            
            const apps = response || [];
            console.error(`[DEBUG] 获取到应用数量: ${apps.length}`);
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  apps: apps.map((app: any) => ({
                    id: app.app_id,
                    name: app.name,
                    description: app.description || '',
                    created_time: app.created_time,
                    updated_time: app.updated_time
                  })),
                  total: apps.length,
                  message: '获取应用列表成功，使用 list_apps_and_forms 工具并提供 appId 参数可以查看特定应用下的表单列表'
                }, null, 2)
              }]
            };
          } catch (error) {
            console.error(`[DEBUG] 获取应用列表失败:`, error);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: true,
                  message: `无法获取应用列表: ${error instanceof Error ? error.message : '未知错误'}`,
                  apps: [],
                  total: 0
                }, null, 2)
              }]
            };
          }
        }
      } catch (error) {
        console.error(`[DEBUG] 工具执行失败:`, error);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: `获取应用和表单列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
              apps: [],
              total: 0
            }, null, 2)
          }]
        };
      }
    }
  );

  // 获取表单字段
  registerTool(
    {
      name: 'get_form_fields',
      description: '获取指定表单的所有字段信息，包括字段名称、类型、是否必填等',
      inputSchema: {
        type: 'object',
        properties: {
          formId: {
            type: 'string',
            description: '表单ID或应用ID（如果是应用ID会自动获取第一个表单）'
          },
          appId: {
            type: 'string',
            description: '应用ID（可选，如果提供会优先使用）'
          }
        },
        required: ['formId']
      }
    },
    async (args) => {
      const { formId } = args;
      let appId: string | undefined;
      let appKey: string;
      let baseUrl: string;
      
      try {
        ({ appId, appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key',
              formUsed: null,
              appId: args.appId || null
            }, null, 2)
          }]
        };
      }

      if (!appId) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: 'appId is required. Please provide it as parameter.',
              formUsed: null,
              appId: null
            }, null, 2)
          }]
        };
      }

      try {
        const resolved = await resolveFormId(formId, appKey, baseUrl);
        
        const response = await httpRequest(`${baseUrl}/api/v5/app/entry/widget/list`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            app_id: appId,
            entry_id: resolved.formId
          })
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              fields: response?.widgets || [],
              formUsed: resolved.formId,
              appId: appId,
              suggestions: resolved.suggestions || undefined
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '获取表单字段失败',
              formUsed: formId,
              appId: appId
            }, null, 2)
          }]
        };
      }
    }
  );

  // 提交表单数据
  registerTool(
    {
      name: 'submit_form_data',
      description: '向指定表单提交数据。支持单条数据提交和批量提交，支持智能字段匹配',
      inputSchema: {
        type: 'object',
        properties: {
          formId: {
            type: 'string',
            description: '表单ID或应用ID'
          },
          data: {
            type: 'object',
            description: '要提交的数据对象，键为字段名，值为字段值'
          },
          transactionId: {
            type: 'string',
            description: '可选：事务ID，用于幂等提交'
          },
          dataCreator: {
            type: 'string',
            description: '可选：数据创建者'
          },
          isStartWorkflow: {
            type: 'boolean',
            description: '可选：是否启动工作流'
          },
          isStartTrigger: {
            type: 'boolean',
            description: '可选：是否触发自动化'
          }
        },
        required: ['formId', 'data']
      }
    },
    async (args) => {
      // 验证必需参数
      const validationRules: Record<string, ValidationRule> = {
        formId: { required: true, type: 'string', minLength: 1 },
        data: { required: true, type: 'object' }
      };

      const validation = validateInput(args, validationRules);
      if (!validation.valid) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: `参数验证失败: ${validation.errors.join('; ')}`
            }, null, 2)
          }]
        };
      }

      const { formId, data, transactionId, dataCreator, isStartWorkflow, isStartTrigger } = validation.sanitized;
      let appId: string | undefined;
      let appKey: string;
      let baseUrl: string;
      
      try {
        ({ appId, appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      if (!appId) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: 'appId is required. Please provide it as parameter.',
            }, null, 2)
          }]
        };
      }

      try {
        const resolved = await resolveFormId(formId, appKey, baseUrl);
        
        // 智能字段匹配
        const mappingResult = await smartFieldMapping(resolved.formId, data, appKey, appId, baseUrl);
        
        const requestBody: Record<string, any> = {
          entry_id: resolved.formId,
          data: mappingResult.mappedData
        };

        if (transactionId) requestBody.transaction_id = transactionId;
        if (dataCreator) requestBody.data_creator = dataCreator;
        if (isStartWorkflow !== undefined) requestBody.is_start_workflow = isStartWorkflow;
        if (isStartTrigger !== undefined) requestBody.is_start_trigger = isStartTrigger;

        const response = await httpRequest(`${baseUrl}/api/v5/app/entry/data/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: response,
              formUsed: resolved.formId,
              fieldMapping: mappingResult.fieldInfo
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '提交数据失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 查询表单数据
  registerTool(
    {
      name: 'query_form_data',
      description: '查询表单中的数据。支持按条件过滤、分页查询、获取单条数据',
      inputSchema: {
        type: 'object',
        properties: {
          formId: {
            type: 'string',
            description: '表单ID或应用ID'
          },
          dataId: {
            type: 'string',
            description: '可选：数据ID，如果提供则返回单条数据'
          },
          fields: {
            type: 'array',
            items: { type: 'string' },
            description: '可选：要返回的字段列表'
          },
          filter: {
            type: 'object',
            description: '可选：过滤条件'
          },
          limit: {
            type: 'number',
            description: '可选：返回的最大记录数（默认10，最大100）'
          },
          sort: {
            type: 'object',
            description: '可选：排序条件，默认按照创建时间倒序（从新到旧）',
            properties: {
              field: {
                type: 'string',
                description: '排序字段，默认：createTime'
              },
              order: {
                type: 'string',
                description: '排序方向，asc（正序）或 desc（倒序），默认：desc'
              }
            }
          }
        },
        required: ['formId']
      }
    },
    async (args) => {
      const { formId, dataId, fields, filter, sort } = args;
      let appId: string | undefined;
      let appKey: string;
      let baseUrl: string;
      
      try {
        ({ appId, appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      if (!appId) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: 'appId is required. Please provide it as parameter.',
            }, null, 2)
          }]
        };
      }

      // 验证 limit 参数
      let limit = args.limit;
      if (typeof limit !== 'number' || limit < 1) {
        limit = 0; // limit=0 表示获取全部数据
      }

      try {
        // 直接使用传入的参数，不调用 resolveFormId
        const actualFormId = formId;

        // 获取单条数据
        if (dataId) {
          const response = await httpRequest(`${baseUrl}/api/v5/app/entry/data/get`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${appKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              app_id: appId,
              entry_id: actualFormId,
              data_id: dataId
            })
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                data: response
              }, null, 2)
            }]
          };
        }

        // 查询多条数据，使用 limit=0 获取全部数据
        const requestBody: Record<string, any> = {
          app_id: appId,
          entry_id: actualFormId,
          limit: limit // 0 表示获取全部数据
        };

        if (fields) requestBody.fields = fields;
        if (filter) requestBody.filter = filter;

        const response = await httpRequest(`${baseUrl}/api/v5/app/entry/data/list`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const dataList = response || [];

        // 按照创建时间倒序排序（从新到旧）
        let sortedResponse = dataList;
        if (Array.isArray(dataList)) {
          sortedResponse = dataList.sort((a: any, b: any) => {
            const timeA = a.createTime ? new Date(a.createTime).getTime() : 0;
            const timeB = b.createTime ? new Date(b.createTime).getTime() : 0;
            return timeB - timeA;
          });
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: sortedResponse,
              total: dataList.length
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '查询数据失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 更新表单数据
  registerTool(
    {
      name: 'update_form_data',
      description: '更新表单中的现有数据',
      inputSchema: {
        type: 'object',
        properties: {
          formId: {
            type: 'string',
            description: '表单ID或应用ID'
          },
          dataId: {
            type: 'string',
            description: '要更新的数据ID'
          },
          data: {
            type: 'object',
            description: '要更新的数据'
          },
          transactionId: {
            type: 'string',
            description: '可选：事务ID'
          },
          isStartTrigger: {
            type: 'boolean',
            description: '可选：是否触发自动化'
          }
        },
        required: ['formId', 'dataId', 'data']
      }
    },
    async (args) => {
      // 验证必需参数
      const validationRules: Record<string, ValidationRule> = {
        formId: { required: true, type: 'string', minLength: 1 },
        dataId: { required: true, type: 'string', minLength: 1 },
        data: { required: true, type: 'object' }
      };

      const validation = validateInput(args, validationRules);
      if (!validation.valid) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: `参数验证失败: ${validation.errors.join('; ')}`
            }, null, 2)
          }]
        };
      }

      const { formId, dataId, data, transactionId, isStartTrigger } = validation.sanitized;
      let appId: string | undefined;
      let appKey: string;
      let baseUrl: string;
      
      try {
        ({ appId, appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      if (!appId) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: 'appId is required. Please provide it as parameter.',
            }, null, 2)
          }]
        };
      }

      try {
        const resolved = await resolveFormId(formId, appKey, baseUrl);
        
        const requestBody: Record<string, any> = {
          entry_id: resolved.formId,
          data_id: dataId,
          data: data
        };

        if (transactionId) requestBody.transaction_id = transactionId;
        if (isStartTrigger !== undefined) requestBody.is_start_trigger = isStartTrigger;

        const response = await httpRequest(`${baseUrl}/api/v5/app/entry/data/update`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: response
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '更新数据失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 删除表单数据
  registerTool(
    {
      name: 'delete_form_data',
      description: '删除表单中的数据，支持批量删除',
      inputSchema: {
        type: 'object',
        properties: {
          formId: {
            type: 'string',
            description: '表单ID或应用ID'
          },
          dataIds: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } }
            ],
            description: '要删除的数据ID或ID数组'
          },
          isStartTrigger: {
            type: 'boolean',
            description: '可选：是否触发自动化'
          }
        },
        required: ['formId', 'dataIds']
      }
    },
    async (args) => {
      // 验证必需参数
      const validationRules: Record<string, ValidationRule> = {
        formId: { required: true, type: 'string', minLength: 1 },
        dataIds: {
          required: true,
          validator: (value: any): boolean => {
            if (typeof value === 'string') return true;
            if (Array.isArray(value) && value.every(id => typeof id === 'string')) return true;
            return false;
          },
          message: 'dataIds 必须是字符串或字符串数组'
        }
      };

      const validation = validateInput(args, validationRules);
      if (!validation.valid) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: `参数验证失败: ${validation.errors.join('; ')}`
            }, null, 2)
          }]
        };
      }

      const { formId, dataIds, isStartTrigger } = validation.sanitized;
      let appId: string | undefined;
      let appKey: string;
      let baseUrl: string;
      
      try {
        ({ appId, appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      if (!appId) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: 'appId is required. Please provide it as parameter.',
            }, null, 2)
          }]
        };
      }

      try {
        const resolved = await resolveFormId(formId, appKey, baseUrl);
        
        const ids = Array.isArray(dataIds) ? dataIds : [dataIds];

        const requestBody: Record<string, any> = {
          entry_id: resolved.formId,
          data_ids: ids
        };

        if (isStartTrigger !== undefined) requestBody.is_start_trigger = isStartTrigger;

        const response = await httpRequest(`${baseUrl}/api/v5/app/entry/data/delete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: response,
              deletedCount: ids.length
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '删除数据失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 获取部门用户
  registerTool(
    {
      name: 'get_department_users',
      description: '获取指定部门下的所有用户',
      inputSchema: {
        type: 'object',
        properties: {
          deptNo: {
            type: 'number',
            description: '部门编号'
          },
          hasChild: {
            type: 'boolean',
            description: '可选：是否包含子部门的用户'
          }
        },
        required: ['deptNo']
      }
    },
    async (args) => {
      // 验证必需参数
      const validationRules: Record<string, ValidationRule> = {
        deptNo: { required: true, type: 'number' }
      };

      const validation = validateInput(args, validationRules);
      if (!validation.valid) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: `参数验证失败: ${validation.errors.join('; ')}`
            }, null, 2)
          }]
        };
      }

      const { deptNo, hasChild = false } = validation.sanitized;
      let appKey: string;
      let baseUrl: string;
      
      try {
        ({ appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      try {
        const response = await httpRequest(`${baseUrl}/api/v5/corp/department/user/list`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dept_no: deptNo,
            has_child: hasChild
          })
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: response
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '获取部门用户失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 获取子部门
  registerTool(
    {
      name: 'get_department_children',
      description: '获取指定部门下的所有子部门',
      inputSchema: {
        type: 'object',
        properties: {
          deptNo: {
            type: 'number',
            description: '部门编号'
          },
          hasChild: {
            type: 'boolean',
            description: '可选：是否包含嵌套的子部门'
          }
        },
        required: ['deptNo']
      }
    },
    async (args) => {
      // 验证必需参数
      const validationRules: Record<string, ValidationRule> = {
        deptNo: { required: true, type: 'number' }
      };

      const validation = validateInput(args, validationRules);
      if (!validation.valid) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: `参数验证失败: ${validation.errors.join('; ')}`
            }, null, 2)
          }]
        };
      }

      const { deptNo, hasChild = false } = validation.sanitized;
      let appKey: string;
      let baseUrl: string;
      
      try {
        ({ appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      try {
        const response = await httpRequest(`${baseUrl}/api/v5/corp/department/list`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dept_no: deptNo,
            has_child: hasChild
          })
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: response
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '获取子部门失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 获取文件上传令牌
  registerTool(
    {
      name: 'get_upload_token',
      description: '获取文件上传令牌，用于上传文件到简道云',
      inputSchema: {
        type: 'object',
        properties: {
          formId: {
            type: 'string',
            description: '表单ID'
          },
          transactionId: {
            type: 'string',
            description: '事务ID'
          },
          fieldId: {
            type: 'string',
            description: '可选：文件字段ID'
          }
        },
        required: ['formId', 'transactionId']
      }
    },
    async (args) => {
      // 验证必需参数
      const validationRules: Record<string, ValidationRule> = {
        formId: { required: true, type: 'string', minLength: 1 },
        transactionId: { required: true, type: 'string', minLength: 1 }
      };

      const validation = validateInput(args, validationRules);
      if (!validation.valid) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: `参数验证失败: ${validation.errors.join('; ')}`
            }, null, 2)
          }]
        };
      }

      const { formId, transactionId, fieldId } = validation.sanitized;
      let appId: string | undefined;
      let appKey: string;
      let baseUrl: string;
      
      try {
        ({ appId, appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      if (!appId) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: 'appId is required. Please provide it as parameter.',
            }, null, 2)
          }]
        };
      }

      try {
        const resolved = await resolveFormId(formId, appKey, baseUrl);
        
        const requestBody: Record<string, any> = {
          entry_id: resolved.formId,
          transaction_id: transactionId
        };

        if (fieldId) requestBody.field_id = fieldId;

        const response = await httpRequest(`${baseUrl}/api/v5/app/entry/data/upload/token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: response
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '获取上传令牌失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 获取最新数据
  registerTool(
    {
      name: 'get_latest_data',
      description: '快捷查询表单中的最新一条数据。自动按创建时间排序，返回最新提交的记录',
      inputSchema: {
        type: 'object',
        properties: {
          formId: {
            type: 'string',
            description: '表单ID或应用ID'
          },
          fields: {
            type: 'array',
            items: { type: 'string' },
            description: '可选：要返回的字段列表'
          }
        },
        required: ['formId']
      }
    },
    async (args) => {
      const { formId, fields } = args;
      let appId: string | undefined;
      let appKey: string;
      let baseUrl: string;

      try {
        ({ appId, appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      if (!appId) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: 'appId is required. Please provide it as parameter.',
            }, null, 2)
          }]
        };
      }

      try {
        // 直接使用传入的参数，不调用 resolveFormId
        // 使用 limit=100 获取数据（与 query_form_data 保持一致）
        const requestBody: Record<string, any> = {
          app_id: appId,
          entry_id: formId,
          limit: 100
        };

        if (fields) requestBody.fields = fields;

        const response = await httpRequest(`${baseUrl}/api/v5/app/entry/data/list`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const dataList = response || [];

        if (dataList.length === 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                data: null,
                message: '该表单暂无数据'
              }, null, 2)
            }]
          };
        }

        // 按照创建时间倒序排序（从新到旧），与 query_form_data 保持一致
        const sortedData = dataList.sort((a: any, b: any) => {
          const timeA = a.createTime ? new Date(a.createTime).getTime() : 0;
          const timeB = b.createTime ? new Date(b.createTime).getTime() : 0;
          return timeB - timeA;
        });

        const latestData = sortedData[0];

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: latestData,
              formUsed: formId,
              appId: appId
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '查询最新数据失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 查询流程实例
  registerTool(
    {
      name: 'query_workflow_instances',
      description: '查询流程实例信息。支持查询流程实例详情、流程日志、流程状态等。可获取流程的创建时间、状态、待办任务列表等信息。',
      inputSchema: {
        type: 'object',
        properties: {
          instanceId: {
            type: 'string',
            description: '流程实例ID（即数据ID）'
          },
          tasksType: {
            type: 'number',
            description: '可选：返回待办种类，0=不返回，1=全部返回，默认0'
          },
          includeLog: {
            type: 'boolean',
            description: '可选：是否包含流程日志，默认false'
          }
        },
        required: ['instanceId']
      }
    },
    async (args) => {
      const { instanceId, tasksType = 0, includeLog = false } = args;
      let appKey: string;
      let baseUrl: string;

      try {
        ({ appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      try {
        const requestBody: Record<string, any> = {
          instance_id: instanceId,
          tasks_type: tasksType
        };

        const response = await httpRequest(`${baseUrl}/api/v6/workflow/instance/get`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        let logData = null;
        if (includeLog && response.app_id && response.form_id) {
          try {
            const logResponse = await httpRequest(`${baseUrl}/api/v1/app/${response.app_id}/entry/${response.form_id}/workflow/log`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ data_id: instanceId })
            });
            logData = logResponse;
          } catch (logError) {
            console.error('[DEBUG] 获取流程日志失败:', logError);
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              instance: response,
              log: logData,
              instanceId: instanceId
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '查询流程实例失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 查询流程待办任务
  registerTool(
    {
      name: 'query_workflow_tasks',
      description: '查询流程待办任务和抄送列表。支持查询当前用户的待办任务、已办任务、抄送给我的任务等。',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: '查询类型：todo=我的待办，done=我的已办，copy=抄送给我，默认todo'
          },
          status: {
            type: 'string',
            description: '可选：抄送状态筛选（仅type=copy时有效）：all=全部，read=已读，unread=未读'
          },
          username: {
            type: 'string',
            description: '成员编号（username），与name二选一'
          },
          name: {
            type: 'string',
            description: '成员姓名，可自动查询username（需要通讯录权限）'
          },
          limit: {
            type: 'number',
            description: '可选：返回数量限制，默认20，最大100'
          },
          skip: {
            type: 'number',
            description: '可选：跳过数量，用于分页'
          }
        }
      }
    },
    async (args) => {
      const { type = 'todo', status = 'all', username, name, limit = 20, skip = 0 } = args;
      let appKey: string;
      let baseUrl: string;

      try {
        ({ appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      let resolvedUsername = username;

      if (!username && name) {
        if (!name) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: true,
                message: '请提供 username 或 name 参数（name为成员姓名，username为成员编号）'
              }, null, 2)
            }]
          };
        }

        try {
          const membersResponse = await httpRequest<any>(`${baseUrl}/api/v5/corp/user/list`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${appKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ limit: 100, skip: 0 })
          });
          
          const users = membersResponse.users || [];
          const matchedUser = users.find((u: any) => u.name === name);
          
          if (matchedUser) {
            resolvedUsername = matchedUser.username;
          } else {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: true,
                  message: `未找到名为 "${name}" 的成员，请确认姓名是否正确`
                }, null, 2)
              }]
            };
          }
        } catch (memberError) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: true,
                message: '查询成员信息失败，请确认API Key是否有通讯录权限。如果知道成员的username，可以直接提供username参数'
              }, null, 2)
            }]
          };
        }
      }

      try {
        let endpoint = '';
        let requestBody: Record<string, any> = {
          limit,
          skip,
          username: resolvedUsername
        };

        if (type === 'copy') {
          endpoint = '/api/v1/workflow/cc/list';
          if (status !== 'all') {
            requestBody.read_status = status;
          }
        } else {
          endpoint = '/api/v5/workflow/task/list';
          requestBody.type = type === 'done' ? 'done' : 'todo';
        }

        const response = await httpRequest(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              type: type,
              tasks: response.tasks || [],
              ccList: response.cc_list || [],
              hasMore: response.has_more || false,
              total: response.total || (response.tasks?.length || response.cc_list?.length || 0)
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '查询流程任务失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 查询审批意见
  registerTool(
    {
      name: 'query_approval_comments',
      description: '查询流程表单数据的审批意见。获取流程各节点的审批意见、审批人、审批时间等信息。',
      inputSchema: {
        type: 'object',
        properties: {
          appId: {
            type: 'string',
            description: '应用ID'
          },
          formId: {
            type: 'string',
            description: '表单ID'
          },
          dataId: {
            type: 'string',
            description: '数据ID（流程实例ID）'
          },
          skip: {
            type: 'number',
            description: '可选：跳过数量，用于分页（每次最多返回100条）'
          }
        },
        required: ['appId', 'formId', 'dataId']
      }
    },
    async (args) => {
      const { appId, formId, dataId, skip = 0 } = args;
      let appKey: string;
      let baseUrl: string;

      try {
        ({ appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      try {
        const requestBody: Record<string, any> = { skip };

        const response = await httpRequest(`${baseUrl}/api/v1/app/${appId}/entry/${formId}/data/${dataId}/approval_comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              comments: response.approveCommentList || [],
              appId: appId,
              formId: formId,
              dataId: dataId
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '查询审批意见失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 查询成员信息
  registerTool(
    {
      name: 'query_members',
      description: '查询成员信息。支持获取成员详细信息、部门成员列表等。',
      inputSchema: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            description: '可选：成员编号（username），不提供则返回所有成员'
          },
          deptNo: {
            type: 'number',
            description: '可选：部门编号，获取该部门下的成员'
          },
          hasChild: {
            type: 'boolean',
            description: '可选：是否包含子部门成员（需配合deptNo使用）'
          },
          limit: {
            type: 'number',
            description: '可选：返回数量限制'
          }
        }
      }
    },
    async (args) => {
      const { username, deptNo, hasChild = false, limit } = args;
      let appKey: string;
      let baseUrl: string;

      try {
        ({ appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      try {
        let endpoint = '';
        let requestBody: Record<string, any> = {};

        if (username) {
          endpoint = '/api/v5/corp/user/get';
          requestBody.username = username;
        } else if (deptNo !== undefined) {
          endpoint = '/api/v5/corp/department/user/list';
          requestBody.dept_no = deptNo;
          requestBody.has_child = hasChild;
          if (limit) requestBody.limit = limit;
        } else {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: true,
                message: '请提供 username 或 deptNo 参数。简道云API不支持查询全部成员列表'
              }, null, 2)
            }]
          };
        }

        const response = await httpRequest(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              members: response.users || response || (response.username ? [response] : []),
              queryType: username ? 'single' : (deptNo !== undefined ? 'department' : 'all')
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '查询成员信息失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 查询部门信息
  registerTool(
    {
      name: 'query_departments',
      description: '查询部门信息。支持获取部门列表、部门详情、子部门列表等。',
      inputSchema: {
        type: 'object',
        properties: {
          deptNo: {
            type: 'number',
            description: '可选：部门编号，不提供则返回所有部门'
          },
          hasChild: {
            type: 'boolean',
            description: '可选：是否包含子部门'
          },
          includeMembers: {
            type: 'boolean',
            description: '可选：是否同时获取部门成员，默认false'
          }
        }
      }
    },
    async (args) => {
      const { deptNo, hasChild = false, includeMembers = false } = args;
      let appKey: string;
      let baseUrl: string;

      try {
        ({ appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      try {
        let endpoint = '/api/v5/corp/department/list';
        let requestBody: Record<string, any> = {
          has_child: hasChild
        };

        if (deptNo !== undefined) {
          requestBody.dept_no = deptNo;
        }

        const response = await httpRequest(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        let members = null;
        if (includeMembers && deptNo !== undefined) {
          try {
            const membersResponse = await httpRequest(`${baseUrl}/api/v5/corp/department/user/list`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                dept_no: deptNo,
                has_child: hasChild
              })
            });
            members = membersResponse.users || membersResponse;
          } catch (memberError) {
            console.error('[DEBUG] 获取部门成员失败:', memberError);
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              departments: response.departments || response || [],
              members: members,
              deptNo: deptNo
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '查询部门信息失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 查询角色信息
  registerTool(
    {
      name: 'query_roles',
      description: '查询角色和角色组信息。支持获取角色列表、角色详情、角色成员等。',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: '查询类型：role=角色列表，roleGroup=角色组列表，默认role'
          },
          roleId: {
            type: 'string',
            description: '可选：角色ID，获取该角色下的成员'
          },
          roleGroupId: {
            type: 'string',
            description: '可选：角色组ID，获取该角色组详情'
          },
          hasManageRange: {
            type: 'boolean',
            description: '可选：是否返回分管部门信息（仅查询角色成员时有效）'
          }
        }
      }
    },
    async (args) => {
      const { type = 'role', roleId, roleGroupId, hasManageRange = false } = args;
      let appKey: string;
      let baseUrl: string;

      try {
        ({ appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      try {
        let endpoint = '';
        let requestBody: Record<string, any> = {};

        if (roleId) {
          endpoint = '/api/v5/corp/role/user/list';
          requestBody.role_id = roleId;
          requestBody.has_manage_range = hasManageRange;
        } else if (type === 'roleGroup' || roleGroupId) {
          endpoint = '/api/v5/corp/role_group/list';
          if (roleGroupId) {
            requestBody.role_group_id = roleGroupId;
          }
        } else {
          endpoint = '/api/v5/corp/role/list';
        }

        const response = await httpRequest(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              type: roleId ? 'roleMembers' : (type === 'roleGroup' ? 'roleGroups' : 'roles'),
              data: response.roles || response.role_groups || response.users || response,
              roleId: roleId,
              roleGroupId: roleGroupId
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '查询角色信息失败'
            }, null, 2)
          }]
        };
      }
    }
  );

  // 查询互联企业
  registerTool(
    {
      name: 'query_enterprises',
      description: '查询企业互联信息。支持获取已连接的企业列表、企业对接人信息等。',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: '查询类型：list=企业列表，guest=对接人详情，默认list'
          },
          username: {
            type: 'string',
            description: '可选：对接人成员编号（type=guest时必需）'
          },
          companyId: {
            type: 'string',
            description: '可选：企业ID，获取该企业的对接人列表'
          }
        }
      }
    },
    async (args) => {
      const { type = 'list', username, companyId } = args;
      let appKey: string;
      let baseUrl: string;

      try {
        ({ appKey, baseUrl } = getDefaultParams(args));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '缺少必需的 API Key'
            }, null, 2)
          }]
        };
      }

      try {
        let endpoint = '';
        let requestBody: Record<string, any> = {};

        if (type === 'guest' && username) {
          endpoint = '/api/v5/corp/guest/user/get';
          requestBody.username = username;
        } else if (companyId) {
          endpoint = '/api/v5/corp/guest/user/list';
          requestBody.company_id = companyId;
        } else {
          endpoint = '/api/v5/corp/company/list';
        }

        const response = await httpRequest(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              type: type === 'guest' ? 'guestDetail' : (companyId ? 'companyGuests' : 'companies'),
              data: response.companies || response.users || response,
              queryType: type
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: true,
              message: error instanceof Error ? error.message : '查询企业互联信息失败'
            }, null, 2)
          }]
        };
      }
    }
  );
}

/**
 * 初始化 MCP 服务器
 * 注册所有工具和请求处理器
 * @param server - MCP 服务器实例
 */
export function initializeServer(server: Server): void {
  // 定义所有工具
  defineTools();

  // 注册工具列表处理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const jiandaoyunTools = Array.from(tools.values()).map(t => t.definition);
    return { tools: jiandaoyunTools };
  });

  // 注册工具调用处理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error(`[DEBUG] 开始处理工具调用请求`);
    console.error(`[DEBUG] 请求对象:`, request);
    
    const { name, arguments: args } = request.params;
    
    // 调试日志：记录接收到的请求
    console.error(`[DEBUG] 收到工具调用请求: name=${name}`);
    console.error(`[DEBUG] 工具参数:`, args);
    console.error(`[DEBUG] 可用工具列表: ${Array.from(tools.keys()).join(', ')}`);

    // 处理工具名称：移除可能的前缀
    let toolName = name;
    if (name.startsWith('mcp_jiandaoyun_')) {
      toolName = name.replace('mcp_jiandaoyun_', '');
      console.error(`[DEBUG] 移除 mcp_jiandaoyun_ 前缀，得到: ${toolName}`);
    } else if (name.startsWith('jiandaoyun_')) {
      toolName = name.replace('jiandaoyun_', '');
      console.error(`[DEBUG] 移除 jiandaoyun_ 前缀，得到: ${toolName}`);
    }

    console.error(`[DEBUG] 处理后的 toolName: ${toolName}`);

    // 在简道云工具中查找
    const tool = tools.get(toolName);
    const jiandaoyunToolNames = Array.from(tools.keys());

    if (!tool) {
      console.error(`[DEBUG] 工具未找到: ${toolName}`);
      console.error(`[DEBUG] 简道云可用工具: ${jiandaoyunToolNames.join(', ')}`);
      throw new McpError(
        ErrorCode.MethodNotFound,
        `未知的工具: ${name}。可用工具: ${jiandaoyunToolNames.join(', ')}`
      );
    }

    try {
      console.error(`[DEBUG] 找到工具: ${toolName}`);
      logger.info(`执行工具: ${toolName}`, { args: Object.keys(args || {}) });
      console.error(`[DEBUG] 开始执行工具处理器`);
      const result = await tool.handler(args || {});
      console.error(`[DEBUG] 工具执行结果:`, result);
      return result;
    } catch (error) {
      console.error(`[DEBUG] 工具执行失败:`, error);
      logger.error(`工具执行失败: ${toolName}`, { error: error instanceof Error ? error.message : String(error) });

      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `工具执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  });

  // 打印所有已注册的工具
  const toolNames = Array.from(tools.keys());
  console.error(`[DEBUG] 服务器初始化完成，已注册 ${toolNames.length} 个工具:`);
  toolNames.forEach(name => console.error(`[DEBUG]   - ${name}`));
  
  logger.info('MCP Server initialized with all tools');
}

/**
 * 获取所有已注册的工 handlers
 * @returns 工具名称到处理器函数的映射
 */
export function getToolHandlers(): Map<string, { definition: ToolDefinition; handler: ToolHandler }> {
  return tools;
}

export { registerTool };
export default { initializeServer };
