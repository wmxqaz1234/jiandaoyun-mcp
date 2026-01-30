import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { McpServerOptions } from './types.js';
import { JianDaoYunClient } from '../../client.js';
import { resolveFormId, smartFieldMapping, getAppList, createEnhancedError, getDefaultParams } from '../../utils/index.js';

/**
 * 创建新的 MCP 服务器实例
 */
export function createMcpServer(options: McpServerOptions): Server {
  const server = new Server(
    {
      name: 'jiandaoyun-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 注册工具列表请求处理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'get_form_fields',
          description: 'Get field definitions for a JianDaoYun form',
          inputSchema: {
            type: 'object',
            properties: {
              appId: {
                type: 'string',
                description: 'The JianDaoYun application ID',
              },
              appKey: {
                type: 'string',
                description: 'The JianDaoYun application key (API key) (can be provided via JIANDAOYUN_APP_KEY environment variable)',
              },
              formId: {
                type: 'string',
                description: 'The form ID to query fields for (can be form ID or app ID)',
              },
            },
            required: ['appId', 'formId'],
          },
        },
        {
          name: 'submit_form_data',
          description: 'Submit data to a JianDaoYun form with automatic field type matching',
          inputSchema: {
            type: 'object',
            properties: {
              appId: {
                type: 'string',
                description: 'The JianDaoYun application ID',
              },
              appKey: {
                type: 'string',
                description: 'The JianDaoYun application key (API key) (optional, will use JIANDAOYUN_APP_KEY from environment if not provided)',
              },
              formId: {
                type: 'string',
                description: 'The form ID to submit data to (can be form ID or app ID)',
              },
              data: {
                type: ['object', 'array'],
                description: 'The data to submit (single object or array for batch)',
              },
              autoMatch: {
                type: 'boolean',
                description: 'Whether to automatically match field types (default: true)',
                default: true,
              },
              transactionId: {
                type: 'string',
                description: 'Optional transaction ID for idempotent submissions',
              },
            },
            required: ['appId', 'formId', 'data'],
          },
        },
        {
          name: 'get_form_data',
          description: 'Get a specific data entry from a JianDaoYun form',
          inputSchema: {
            type: 'object',
            properties: {
              appId: {
                type: 'string',
                description: 'The JianDaoYun application ID',
              },
              appKey: {
                type: 'string',
                description: 'The JianDaoYun application key (API key) (optional, will use JIANDAOYUN_APP_KEY from environment if not provided)',
              },
              formId: {
                type: 'string',
                description: 'The form ID (can be form ID or app ID)',
              },
              dataId: {
                type: 'string',
                description: 'The data entry ID',
              },
            },
            required: ['appId', 'formId', 'dataId'],
          },
        },
        {
          name: 'query_form_data',
          description: 'Query multiple form data entries with filtering support',
          inputSchema: {
            type: 'object',
            properties: {
              appId: {
                type: 'string',
                description: 'The JianDaoYun application ID',
              },
              appKey: {
                type: 'string',
                description: 'The JianDaoYun application key (API key) (optional, will use JIANDAOYUN_APP_KEY from environment if not provided)',
              },
              formId: {
                type: 'string',
                description: 'The form ID (can be form ID or app ID)',
              },
              dataId: {
                type: 'string',
                description: 'Last data ID for pagination',
              },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Fields to return (widget IDs)',
              },
              filter: {
                type: 'object',
                description: 'Data filter conditions',
                properties: {
                  rel: {
                    type: 'string',
                    enum: ['and', 'or'],
                    description: 'Relation between conditions',
                  },
                  cond: {
                    type: 'array',
                    description: 'Filter conditions',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        type: { type: 'string' },
                        method: { type: 'string' },
                        value: {},
                      },
                      required: ['field', 'method'],
                    },
                  },
                },
                required: ['rel', 'cond'],
              },
              limit: {
                type: 'number',
                description: 'Number of records to return (1-100, default: 10)',
                minimum: 1,
                maximum: 100,
              },
            },
            required: ['appId', 'formId'],
          },
        },
        {
          name: 'update_form_data',
          description: 'Update an existing form data entry',
          inputSchema: {
            type: 'object',
            properties: {
              appId: {
                type: 'string',
                description: 'The JianDaoYun application ID',
              },
              appKey: {
                type: 'string',
                description: 'The JianDaoYun application key (API key) (optional, will use JIANDAOYUN_APP_KEY from environment if not provided)',
              },
              formId: {
                type: 'string',
                description: 'The form ID (can be form ID or app ID)',
              },
              dataId: {
                type: 'string',
                description: 'The data entry ID to update',
              },
              data: {
                type: 'object',
                description: 'The data to update',
              },
              transactionId: {
                type: 'string',
                description: 'Optional transaction ID',
              },
              isStartTrigger: {
                type: 'boolean',
                description: 'Whether to trigger automation',
              },
            },
            required: ['appId', 'formId', 'dataId', 'data'],
          },
        },
        {
          name: 'delete_form_data',
          description: 'Delete one or more form data entries',
          inputSchema: {
            type: 'object',
            properties: {
              appId: {
                type: 'string',
                description: 'The JianDaoYun application ID',
              },
              appKey: {
                type: 'string',
                description: 'The JianDaoYun application key (API key) (optional, will use JIANDAOYUN_APP_KEY from environment if not provided)',
              },
              formId: {
                type: 'string',
                description: 'The form ID (can be form ID or app ID)',
              },
              dataIds: {
                type: ['string', 'array'],
                description: 'Data ID(s) to delete',
                items: { type: 'string' },
              },
              isStartTrigger: {
                type: 'boolean',
                description: 'Whether to trigger automation',
              },
            },
            required: ['appId', 'formId', 'dataIds'],
          },
        },
        {
          name: 'get_upload_token',
          description: 'Get file upload tokens for file/image fields',
          inputSchema: {
            type: 'object',
            properties: {
              appId: {
                type: 'string',
                description: 'The JianDaoYun application ID',
              },
              appKey: {
                type: 'string',
                description: 'The JianDaoYun application key (API key) (optional, will use JIANDAOYUN_APP_KEY from environment if not provided)',
              },
              formId: {
                type: 'string',
                description: 'The form ID (can be form ID or app ID)',
              },
              transactionId: {
                type: 'string',
                description: 'Transaction ID to bind uploads to',
              },
              fieldId: {
                type: 'string',
                description: 'Optional: The file/image field ID to get upload token for. If not provided, gets token for all file fields.',
              },
            },
            required: ['appId', 'formId', 'transactionId'],
          },
        },
        {
          name: 'list_apps_and_forms',
          description: 'List all available applications and their forms that the current API key can access',
          inputSchema: {
            type: 'object',
            properties: {
              appKey: {
                type: 'string',
                description: 'The JianDaoYun application key (API key) (optional, will use JIANDAOYUN_APP_KEY from environment if not provided)',
              },
              appId: {
                type: 'string',
                description: 'Optional: specific app ID to get forms for. If not provided, lists all apps.',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_department_users',
          description: 'Get all users under a specific department ID',
          inputSchema: {
            type: 'object',
            properties: {
              appKey: {
                type: 'string',
                description: 'The JianDaoYun application key (API key) (optional, will use JIANDAOYUN_APP_KEY from environment if not provided)',
              },
              deptNo: {
                type: 'number',
                description: 'The department number (ID) to get users for',
              },
              hasChild: {
                type: 'boolean',
                description: 'Whether to include users from child departments (default: false)',
                default: false,
              },
            },
            required: ['deptNo'],
          },
        },
        {
          name: 'get_department_children',
          description: 'Get all child departments under a specific department ID',
          inputSchema: {
            type: 'object',
            properties: {
              appKey: {
                type: 'string',
                description: 'The JianDaoYun application key (API key) (optional, will use JIANDAOYUN_APP_KEY from environment if not provided)',
              },
              deptNo: {
                type: 'number',
                description: 'The department number (ID) to get child departments for',
              },
              hasChild: {
                type: 'boolean',
                description: 'Whether to include nested child departments (default: false)',
                default: false,
              },
            },
            required: ['deptNo'],
          },
        },
      ],
    };
  });

  // 注册调用工具请求处理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // 处理工具名前缀，支持 mcp_jiandaoyun_* 格式
    const normalizedToolName = name.replace(/^mcp_jiandaoyun_/, '');

    // 生成表格展示的辅助函数
    function generateTable(data: any[]): string {
      if (!data || data.length === 0) {
        return '暂无数据';
      }

      // 提取所有可能的字段名
      const allFields = new Set<string>();
      data.forEach(item => {
        Object.keys(item).forEach(key => {
          // 排除系统字段
          if (!key.startsWith('_') || key === '_id' || key === 'appId' || key === 'entryId') {
            allFields.add(key);
          }
        });
      });

      const fields = Array.from(allFields).sort();

      // 生成表头
      let table = '| 序号';
      fields.forEach(field => {
        table += ` | ${field}`;
      });
      table += ' |\n';

      // 生成分隔线
      table += '|';
      fields.forEach(() => {
        table += '---|';
      });
      table += '\n';

      // 生成数据行
      data.forEach((item, index) => {
        table += `| ${index + 1}`;
        fields.forEach(field => {
          let value = item[field];
          
          // 处理不同类型的值
          if (value === null || value === undefined) {
            table += ' | -';
          } else if (typeof value === 'object') {
            // 处理对象类型（如 creator, updater）
            if (value.name) {
              table += ` | ${value.name}`;
            } else if (value.username) {
              table += ` | ${value.username}`;
            } else {
              table += ' | [对象]';
            }
          } else if (Array.isArray(value)) {
            // 处理数组类型（如附件）
            if (value.length > 0) {
              table += ` | ${value.length}个附件`;
            } else {
              table += ' | -';
            }
          } else if (typeof value === 'string' && value.length > 50) {
            // 长文本截断
            table += ` | ${value.substring(0, 50)}...`;
          } else {
            table += ` | ${value}`;
          }
        });
        table += ' |\n';
      });

      // 添加统计信息
      table += `\n**数据统计：**\n`;
      table += `- 总记录数：${data.length}\n`;
      
      // 统计附件数量
      let attachmentCount = 0;
      data.forEach(item => {
        Object.values(item).forEach(value => {
          if (Array.isArray(value) && value.length > 0) {
            attachmentCount += value.length;
          }
        });
      });
      if (attachmentCount > 0) {
        table += `- 附件总数：${attachmentCount}\n`;
      }

      // 统计时间范围
      const timeFields = Object.keys(data[0] || {}).filter(key => 
        key.toLowerCase().includes('time') || key.toLowerCase().includes('date')
      );
      if (timeFields.length > 0) {
        const timeValues = data.map(item => item[timeFields[0]]).filter(v => v);
        if (timeValues.length > 0) {
          table += `- 时间范围：${timeValues[0]} 至 ${timeValues[timeValues.length - 1]}\n`;
        }
      }

      return table;
    }

    try {
      switch (normalizedToolName) {
        case 'get_form_fields': {
          const { formId } = args as { formId: string };
          const { appId, appKey, baseUrl } = getDefaultParams(args);
          
          // 验证必需参数
          if (!appKey) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appKey is required. Please set JIANDAOYUN_APP_KEY in MCP server configuration.',
                    formUsed: null,
                    appId: appId
                  }, null, 2),
                },
              ],
            };
          }
          if (!appId) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appId is required. Please provide it as parameter.',
                    formUsed: null,
                    appId: null
                  }, null, 2),
                },
              ],
            };
          }
          
          try {
            const resolved = await resolveFormId(formId, appKey);
            
            // 直接调用简道云 API 获取表单字段
            const response = await fetch(`${baseUrl || 'https://api.jiandaoyun.com'}/api/v5/app/entry/widget/list`, {
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
            
            if (!response.ok) {
              const errorText = await response.text();
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `HTTP错误 ${response.status}: ${errorText}`,
                      formUsed: resolved.formId,
                      appId: appId
                    }, null, 2),
                  },
                ],
              };
            }
            
            const responseData = await response.json() as any;
            
            // 检查 API 错误
            if (responseData.code !== undefined && responseData.code !== 0) {
              const errorDetails: any = {
                success: false,
                error: true,
                message: `API错误 ${responseData.code}: ${responseData.msg}`,
                formUsed: resolved.formId,
                appId: appId,
                apiError: {
                  code: responseData.code,
                  message: responseData.msg
                }
              };
              
              // 根据错误代码提供更详细的说明
              if (responseData.code === 3005) {
                errorDetails.suggestion = '请求参数无效，请检查表单ID、字段名称和数据格式是否正确';
              } else if (responseData.code === 3000) {
                errorDetails.suggestion = '表单不存在，请检查表单ID是否正确';
              } else if (responseData.code === 4000) {
                errorDetails.suggestion = '查询失败，请检查查询条件是否符合表单要求';
              }
              
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(errorDetails, null, 2),
                  },
                ],
              };
            }
            
            // API返回格式: {widgets: [...], sysWidgets: ...}
            const widgets = responseData.widgets || [];
            
            // 转换字段格式
            const transformFields = (widgets: any[]): any[] => {
              return widgets.map(widget => {
                const field: any = {
                  key: widget.name,
                  name: widget.label,
                  type: widget.type,
                  required: widget.required || false
                };
                
                if (widget.type === 'subform' && widget.items) {
                  field.subForm = {
                    fields: transformFields(widget.items)
                  };
                }
                
                return field;
              });
            };
            
            const fields = transformFields(Array.isArray(widgets) ? widgets : []);
            
            const result = {
              success: true,
              formUsed: resolved.formId,
              appId: appId,
              fields: fields,
              total: fields.length,
              message: '获取表单字段成功'
            };
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: `获取表单字段失败: ${error instanceof Error ? error.message : String(error)}`,
                    formUsed: null,
                    appId: appId
                  }, null, 2),
                },
              ],
            };
          }
        }

        case 'submit_form_data': {
          const { formId, data, autoMatch = true, transactionId } = args as {
            formId: string;
            data: any | any[];
            autoMatch?: boolean;
            transactionId?: string;
          };
          const { appId, appKey, baseUrl } = getDefaultParams(args);
          
          // 验证必需参数
          if (!appKey) {
            throw new Error('appKey is required. Please set JIANDAOYUN_APP_KEY in MCP server configuration.');
          }
          if (!appId) {
            throw new Error('appId is required. Please provide it as parameter.');
          }

          let resolved: any;
          let processedData = data;
          let fieldMappingInfo = null;
          let submitResult: any;
          let errorDetails: any = null;

          try {
            resolved = await resolveFormId(formId, appKey);
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: `表单ID解析失败: ${error instanceof Error ? error.message : String(error)}`,
                    formUsed: null,
                    appId: appId,
                    originalData: data,
                    processedData: null
                  }, null, 2),
                },
              ],
            };
          }

          if (autoMatch) {
            try {
              // 使用智能字段映射
              if (Array.isArray(data)) {
                const mappedResults = [];
                for (const item of data) {
                  const mappingResult = await smartFieldMapping(resolved.formId, item, appKey, resolved.appId || appId);
                  mappedResults.push(mappingResult.mappedData);
                  if (!fieldMappingInfo) fieldMappingInfo = mappingResult.fieldInfo;
                }
                processedData = mappedResults;
              } else {
                const mappingResult = await smartFieldMapping(resolved.formId, data, appKey, resolved.appId || appId);
                processedData = mappingResult.mappedData;
                fieldMappingInfo = mappingResult.fieldInfo;
              }
            } catch (error) {
              console.log('字段映射失败，使用原始数据:', error instanceof Error ? error.message : String(error));
            }
          }

          try {
            // 格式化数据
            const formatDataForSubmission = (data: any): any => {
              const formatted: any = {};

              for (const [key, value] of Object.entries(data)) {
                if (value === null || value === undefined) {
                  continue;
                }

                // 如果已经是正确的 {value: ...} 格式，直接使用
                if (typeof value === 'object' && !Array.isArray(value) && value.hasOwnProperty('value')) {
                  formatted[key] = value;
                  continue;
                }

                // 处理子表单数组（数组中的每个元素都是对象）
                if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                  formatted[key] = {
                    value: value.map((item: any) => formatDataForSubmission(item))
                  };
                  continue;
                }

                // 处理复杂对象（如地址、定位等）
                if (typeof value === 'object' && !Array.isArray(value)) {
                  formatted[key] = { value };
                  continue;
                }

                // 处理基本类型（字符串、数字、布尔值、简单数组等）
                formatted[key] = { value };
              }

              return formatted;
            };

            const dataArray = Array.isArray(processedData) ? processedData : [processedData];
            const isBatch = dataArray.length > 1;
            const endpoint = isBatch ? '/api/v5/app/entry/data/batch_create' : '/api/v5/app/entry/data/create';

            const requestData: any = {
              app_id: appId,
              entry_id: resolved.formId
            };

            if (isBatch) {
              requestData.data_list = dataArray.map(record => formatDataForSubmission(record));
            } else {
              requestData.data = formatDataForSubmission(dataArray[0]);
            }

            if (transactionId) {
              requestData.transaction_id = transactionId;
            }

            // 直接调用简道云 API 提交数据
            const response = await fetch(`${baseUrl || 'https://api.jiandaoyun.com'}${endpoint}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestData)
            });

            if (!response.ok) {
              throw new Error(`HTTP错误 ${response.status}: ${await response.text()}`);
            }

            submitResult = await response.json();

            // 检查 API 错误
            if (submitResult.code !== undefined && submitResult.code !== 0) {
              throw new Error(`API错误 ${submitResult.code}: ${submitResult.msg}`);
            }

            let message = `成功提交 ${Array.isArray(data) ? data.length : 1} 条记录`;
            if (resolved.suggestions && resolved.suggestions.length > 1) {
              message += `\n注意: 检测到应用下有多个表单，已使用第一个表单进行提交`;
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    result: submitResult.data || submitResult,
                    message,
                    formUsed: resolved.formId,
                    appId: resolved.appId || appId,
                    originalData: data,
                    processedData,
                    fieldMapping: fieldMappingInfo
                  }, null, 2),
                },
              ],
            };
          } catch (error) {
            // 返回详细的错误信息而不是抛出错误
            errorDetails = {
              success: false,
              error: true,
              message: '提交表单数据失败',
              formUsed: resolved?.formId || null,
              appId: appId,
              originalData: data,
              processedData: processedData
            };

            if (error && typeof error === 'object' && 'response' in error && (error as any).response?.data) {
              // 简道云API错误
              const apiError = (error as any).response.data;
              errorDetails.apiError = {
                code: apiError.code,
                message: apiError.msg,
                details: apiError
              };
              errorDetails.message = `API错误 ${apiError.code}: ${apiError.msg}`;
              
              // 根据错误代码提供更详细的说明
              if (apiError.code === 3005) {
                errorDetails.suggestion = '请求参数无效，请检查表单ID、字段名称和数据格式是否正确';
              } else if (apiError.code === 3000) {
                errorDetails.suggestion = '表单不存在，请检查表单ID是否正确';
              } else if (apiError.code === 4000) {
                errorDetails.suggestion = '数据提交失败，请检查字段值是否符合表单要求';
              }
            } else if (error instanceof Error) {
              errorDetails.message = error.message;
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(errorDetails, null, 2),
                },
              ],
            };
          }
        }

        case 'get_form_data': {
          const { formId, dataId } = args as { formId: string; dataId: string };
          const { appId, appKey, baseUrl } = getDefaultParams(args);
          
          // 验证必需参数
          if (!appKey) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appKey is required. Please set JIANDAOYUN_APP_KEY in MCP server configuration.',
                    formUsed: null,
                    appId: appId,
                    dataId: dataId
                  }, null, 2),
                },
              ],
            };
          }
          if (!appId) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appId is required. Please provide it as parameter.',
                    formUsed: null,
                    appId: null,
                    dataId: dataId
                  }, null, 2),
                },
              ],
            };
          }
          if (!dataId) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'dataId is required. Please provide it as parameter.',
                    formUsed: null,
                    appId: appId,
                    dataId: null
                  }, null, 2),
                },
              ],
            };
          }
          
          try {
            const resolved = await resolveFormId(formId, appKey);
            
            // 直接调用简道云 API 获取表单数据
            const response = await fetch(`${baseUrl || 'https://api.jiandaoyun.com'}/api/v5/app/entry/data/get`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                app_id: appId,
                entry_id: resolved.formId,
                data_id: dataId
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `HTTP错误 ${response.status}: ${errorText}`,
                      formUsed: resolved.formId,
                      appId: appId,
                      dataId: dataId
                    }, null, 2),
                  },
                ],
              };
            }
            
            const responseData = await response.json() as any;
            
            // 检查 API 错误
            if (responseData.code !== undefined && responseData.code !== 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `API错误 ${responseData.code}: ${responseData.msg}`,
                      formUsed: resolved.formId,
                      appId: appId,
                      dataId: dataId,
                      apiError: {
                        code: responseData.code,
                        message: responseData.msg
                      }
                    }, null, 2),
                  },
                ],
              };
            }
            
            const data = responseData.data;
            
            const result = {
              success: true,
              data,
              formUsed: resolved.formId,
              appId: resolved.appId || appId,
              dataId: dataId,
              message: '获取表单数据成功'
            };
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: `获取表单数据失败: ${error instanceof Error ? error.message : String(error)}`,
                    formUsed: null,
                    appId: appId,
                    dataId: dataId
                  }, null, 2),
                },
              ],
            };
          }
        }

        case 'query_form_data': {
          const { formId, dataId, fields, filter, limit } = args as {
            formId: string;
            dataId?: string;
            fields?: string[];
            filter?: any;
            limit?: number;
          };
          const { appId, appKey, baseUrl } = getDefaultParams(args);
          
          // 验证必需参数
          if (!appKey) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appKey is required. Please set JIANDAOYUN_APP_KEY in MCP server configuration.',
                    formUsed: null,
                    appId: appId
                  }, null, 2),
                },
              ],
            };
          }
          if (!appId) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appId is required. Please provide it as parameter.',
                    formUsed: null,
                    appId: null
                  }, null, 2),
                },
              ],
            };
          }
          if (!formId) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'formId is required. Please provide it as parameter.',
                    formUsed: null,
                    appId: appId
                  }, null, 2),
                },
              ],
            };
          }

          try {
            const resolved = await resolveFormId(formId, appKey);
            
            // 构建请求数据
            const requestData: any = {
              app_id: appId,
              entry_id: resolved.formId,
              limit: limit || 10
            };

            if (dataId) {
              requestData.data_id = dataId;
            }

            if (fields && fields.length > 0) {
              requestData.fields = fields;
            }

            if (filter) {
              requestData.filter = filter;
            }
            
            // 直接调用简道云 API 查询表单数据
            const response = await fetch(`${baseUrl || 'https://api.jiandaoyun.com'}/api/v5/app/entry/data/list`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `HTTP错误 ${response.status}: ${errorText}`,
                      formUsed: resolved.formId,
                      appId: appId
                    }, null, 2),
                  },
                ],
              };
            }
            
            const responseData = await response.json() as any;
            
            // 检查 API 错误
            if (responseData.code !== undefined && responseData.code !== 0) {
              const errorDetails: any = {
                success: false,
                error: true,
                message: `API错误 ${responseData.code}: ${responseData.msg}`,
                formUsed: resolved.formId,
                appId: appId,
                apiError: {
                  code: responseData.code,
                  message: responseData.msg
                }
              };
              
              // 根据错误代码提供更详细的说明
              if (responseData.code === 3005) {
                errorDetails.suggestion = '请求参数无效，请检查表单ID、字段名称和数据格式是否正确';
              } else if (responseData.code === 3000) {
                errorDetails.suggestion = '表单不存在，请检查表单ID是否正确';
              } else if (responseData.code === 4000) {
                errorDetails.suggestion = '查询失败，请检查查询条件是否符合表单要求';
              }
              
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(errorDetails, null, 2),
                  },
                ],
              };
            }
            
            // 构建结果对象
            const result: any = {
              success: true,
              formUsed: resolved.formId,
              appId: resolved.appId || appId,
              message: '查询表单数据成功'
            };
            
            // 检查是否有数据
            if (responseData.data) {
              // 如果有数据，确保是数组格式
              result.data = Array.isArray(responseData.data) ? responseData.data : [responseData.data];
              // 添加总数，优先使用 API 返回的 total，否则使用数组长度
              result.total = responseData.total !== undefined ? responseData.total : result.data.length;
              
              // 如果数据超过3条，生成表格展示
              if (result.data.length >= 3) {
                result.table = generateTable(result.data);
              }
            } else {
              // 如果没有数据，添加默认的空数据字段
              result.data = [];
              result.total = 0;
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            const errorDetails: any = {
              success: false,
              error: true,
              message: '查询表单数据失败',
              formUsed: null,
              appId: appId
            };
            
            if (error instanceof Error) {
              errorDetails.message = `查询表单数据失败: ${error.message}`;
              
              // 处理网络错误
              if (error.message.includes('Network')) {
                errorDetails.suggestion = '网络连接失败，请检查网络连接并确保简道云API可以访问';
              } else if (error.message.includes('Timeout')) {
                errorDetails.suggestion = '请求超时，请检查网络连接或稍后重试';
              }
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(errorDetails, null, 2),
                },
              ],
            };
          }
        }

        case 'update_form_data': {
          const { formId, dataId, data, transactionId, isStartTrigger } = args as {
            formId: string;
            dataId: string;
            data: any;
            transactionId?: string;
            isStartTrigger?: boolean;
          };
          const { appId, appKey, baseUrl } = getDefaultParams(args);
          
          // 验证必需参数
          if (!appKey) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appKey is required. Please set JIANDAOYUN_APP_KEY in MCP server configuration.',
                    formUsed: null,
                    appId: appId,
                    dataId: dataId
                  }, null, 2),
                },
              ],
            };
          }
          if (!appId) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appId is required. Please provide it as parameter.',
                    formUsed: null,
                    appId: null,
                    dataId: dataId
                  }, null, 2),
                },
              ],
            };
          }
          if (!dataId) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'dataId is required. Please provide it as parameter.',
                    formUsed: null,
                    appId: appId,
                    dataId: null
                  }, null, 2),
                },
              ],
            };
          }
          if (!data || typeof data !== 'object') {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'data is required and must be an object. Please provide it as parameter.',
                    formUsed: null,
                    appId: appId,
                    dataId: dataId
                  }, null, 2),
                },
              ],
            };
          }

          try {
            const resolved = await resolveFormId(formId, appKey);
            
            // 格式化数据
            const formatDataForSubmission = (data: any): any => {
              const formatted: any = {};

              for (const [key, value] of Object.entries(data)) {
                if (value === null || value === undefined) {
                  continue;
                }

                // 如果已经是正确的 {value: ...} 格式，直接使用
                if (typeof value === 'object' && !Array.isArray(value) && value.hasOwnProperty('value')) {
                  formatted[key] = value;
                  continue;
                }

                // 处理子表单数组（数组中的每个元素都是对象）
                if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                  formatted[key] = {
                    value: value.map((item: any) => formatDataForSubmission(item))
                  };
                  continue;
                }

                // 处理复杂对象（如地址、定位等）
                if (typeof value === 'object' && !Array.isArray(value)) {
                  formatted[key] = { value };
                  continue;
                }

                // 处理基本类型（字符串、数字、布尔值、简单数组等）
                formatted[key] = { value };
              }

              return formatted;
            };
            
            // 构建请求数据
            const requestData: any = {
              app_id: appId,
              entry_id: resolved.formId,
              data_id: dataId,
              data: formatDataForSubmission(data)
            };

            if (transactionId) {
              requestData.transaction_id = transactionId;
            }

            if (isStartTrigger !== undefined) {
              requestData.is_start_trigger = isStartTrigger;
            }
            
            // 直接调用简道云 API 更新表单数据
            const response = await fetch(`${baseUrl || 'https://api.jiandaoyun.com'}/api/v5/app/entry/data/update`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `HTTP错误 ${response.status}: ${errorText}`,
                      formUsed: resolved.formId,
                      appId: appId,
                      dataId: dataId
                    }, null, 2),
                  },
                ],
              };
            }
            
            const responseData = await response.json() as any;
            
            // 检查 API 错误
            if (responseData.code !== undefined && responseData.code !== 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `API错误 ${responseData.code}: ${responseData.msg}`,
                      formUsed: resolved.formId,
                      appId: appId,
                      dataId: dataId,
                      apiError: {
                        code: responseData.code,
                        message: responseData.msg
                      }
                    }, null, 2),
                  },
                ],
              };
            }
            
            const result = {
              success: true,
              result: responseData.data,
              message: '数据更新成功',
              formUsed: resolved.formId,
              appId: resolved.appId || appId,
              dataId: dataId
            };
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: `更新表单数据失败: ${error instanceof Error ? error.message : String(error)}`,
                    formUsed: null,
                    appId: appId,
                    dataId: dataId
                  }, null, 2),
                },
              ],
            };
          }
        }

        case 'delete_form_data': {
          const { formId, dataIds, isStartTrigger } = args as {
            formId: string;
            dataIds: string | string[];
            isStartTrigger?: boolean;
          };
          const { appId, appKey, baseUrl } = getDefaultParams(args);
          
          // 验证必需参数
          if (!appKey) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appKey is required. Please set JIANDAOYUN_APP_KEY in MCP server configuration.',
                    formUsed: null,
                    appId: appId
                  }, null, 2),
                },
              ],
            };
          }
          if (!appId) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appId is required. Please provide it as parameter.',
                    formUsed: null,
                    appId: null
                  }, null, 2),
                },
              ],
            };
          }
          if (!dataIds) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'dataIds is required. Please provide it as parameter.',
                    formUsed: null,
                    appId: appId
                  }, null, 2),
                },
              ],
            };
          }
          if (!Array.isArray(dataIds) && typeof dataIds !== 'string') {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'dataIds must be either a string or an array of strings. Please provide it as parameter.',
                    formUsed: null,
                    appId: appId
                  }, null, 2),
                },
              ],
            };
          }

          try {
            const resolved = await resolveFormId(formId, appKey);
            
            const isMultiple = Array.isArray(dataIds);
            const endpoint = isMultiple ? '/api/v5/app/entry/data/batch_delete' : '/api/v5/app/entry/data/delete';
            
            // 构建请求数据
            const requestData: any = {
              app_id: appId,
              entry_id: resolved.formId
            };

            if (isMultiple) {
              requestData.data_ids = dataIds;
            } else {
              requestData.data_id = dataIds;
            }

            if (isStartTrigger !== undefined) {
              requestData.is_start_trigger = isStartTrigger;
            }
            
            // 直接调用简道云 API 删除表单数据
            const response = await fetch(`${baseUrl || 'https://api.jiandaoyun.com'}${endpoint}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `HTTP错误 ${response.status}: ${errorText}`,
                      formUsed: resolved.formId,
                      appId: appId
                    }, null, 2),
                  },
                ],
              };
            }
            
            const responseData = await response.json() as any;
            
            // 检查 API 错误
            if (responseData.code !== undefined && responseData.code !== 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `API错误 ${responseData.code}: ${responseData.msg}`,
                      formUsed: resolved.formId,
                      appId: appId,
                      apiError: {
                        code: responseData.code,
                        message: responseData.msg
                      }
                    }, null, 2),
                  },
                ],
              };
            }
            
            const result = {
              success: true,
              result: responseData.data,
              message: `成功删除 ${Array.isArray(dataIds) ? dataIds.length : 1} 条记录`,
              formUsed: resolved.formId,
              appId: resolved.appId || appId
            };
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: `删除表单数据失败: ${error instanceof Error ? error.message : String(error)}`,
                    formUsed: null,
                    appId: appId
                  }, null, 2),
                },
              ],
            };
          }
        }

        case 'get_upload_token': {
          const { formId, transactionId, fieldId } = args as {
            formId: string;
            transactionId: string;
            fieldId?: string;
          };
          const { appId, appKey, baseUrl } = getDefaultParams(args);
          
          // 验证必需参数
          if (!appKey) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appKey is required. Please set JIANDAOYUN_APP_KEY in MCP server configuration.',
                    formUsed: null,
                    appId: appId,
                    transactionId: transactionId
                  }, null, 2),
                },
              ],
            };
          }
          if (!appId) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appId is required. Please provide it as parameter.',
                    formUsed: null,
                    appId: null,
                    transactionId: transactionId
                  }, null, 2),
                },
              ],
            };
          }
          if (!transactionId) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'transactionId is required. Please provide it as parameter.',
                    formUsed: null,
                    appId: appId,
                    transactionId: null
                  }, null, 2),
                },
              ],
            };
          }
          
          try {
            const resolved = await resolveFormId(formId, appKey);
            
            // 简道云的文件上传说明
            const result = {
              success: true,
              message: "简道云文件上传说明",
              description: "简道云不支持通过API直接提交外部文件URL作为附件。请使用以下方法：",
              methods: [
                {
                  method: "方法1: 使用简道云Web界面",
                  description: "登录简道云Web界面，手动上传文件到表单中",
                  steps: [
                    "1. 登录简道云Web界面",
                    "2. 打开对应的表单",
                    "3. 点击附件字段",
                    "4. 选择并上传文件",
                    "5. 保存表单数据"
                  ]
                },
                {
                  method: "方法2: 使用简道云文件上传API",
                  description: "使用简道云的文件上传API上传文件",
                  note: "需要先上传文件到简道云的文件服务器，然后使用返回的文件ID",
                  endpoint: "/api/v5/app/entry/file/upload",
                  parameters: {
                    app_id: appId,
                    entry_id: resolved.formId,
                    file: "文件数据（multipart/form-data）"
                  }
                },
                {
                  method: "方法3: 复制现有附件",
                  description: "从已有的表单记录中复制附件",
                  steps: [
                    "1. 查询已有的表单数据",
                    "2. 获取附件字段的值",
                    "3. 在新的表单数据中使用相同的附件信息"
                  ],
                  example: {
                    fieldId: fieldId || "_widget_xxx",
                    value: [
                      {
                        "name": "文件名.pdf",
                        "size": 12345,
                        "mime": "application/pdf",
                        "url": "简道云文件URL"
                      }
                    ]
                  }
                }
              ],
              formUsed: resolved.formId,
              appId: resolved.appId || appId,
              transactionId: transactionId,
              fieldId: fieldId
            };
            
            console.log('返回结果:', JSON.stringify(result, null, 2));
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: `获取上传令牌失败: ${error instanceof Error ? error.message : String(error)}`,
                    formUsed: null,
                    appId: appId,
                    transactionId: transactionId
                  }, null, 2),
                },
              ],
            };
          }
        }

        case 'list_apps_and_forms': {
          const { appId: specificAppId } = args as { appId?: string };
          const { appId, appKey, baseUrl } = getDefaultParams(args);
          
          // 验证必需参数
          if (!appKey) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appKey is required. Please set JIANDAOYUN_APP_KEY in MCP server configuration.',
                    apps: [],
                    total: 0
                  }, null, 2),
                },
              ],
            };
          }
          
          try {
            const targetAppId = specificAppId || appId;
            // 检查 targetAppId 是否为有效的应用 ID（不是占位符）
            const isValidAppId = targetAppId && targetAppId !== 'your_app_id' && targetAppId.length > 0;
            
            if (isValidAppId) {
              // 获取特定应用的表单列表
              try {
                const response = await fetch(`${baseUrl || 'https://api.jiandaoyun.com'}/api/v5/app/entry/list`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${appKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    app_id: targetAppId,
                    skip: 0,
                    limit: 0
                  })
                });
                
                if (!response.ok) {
                  const errorText = await response.text();
                  return {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({
                          success: false,
                          error: true,
                          message: `HTTP错误 ${response.status}: ${errorText}`,
                          appId: targetAppId,
                          forms: [],
                          total: 0
                        }, null, 2),
                      },
                    ],
                  };
                }
                
                const responseData = await response.json() as any;
                
                // 检查 API 错误
                if (responseData.code !== undefined && responseData.code !== 0) {
                  return {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({
                          success: false,
                          error: true,
                          message: `API错误 ${responseData.code}: ${responseData.msg}`,
                          appId: targetAppId,
                          forms: [],
                          total: 0,
                          apiError: {
                            code: responseData.code,
                            message: responseData.msg
                          }
                        }, null, 2),
                      },
                    ],
                  };
                }
                
                const forms = responseData?.forms || [];
                return {
                  content: [
                    {
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
                      }, null, 2),
                    },
                  ],
                };
              } catch (error) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        success: false,
                        error: true,
                        message: `无法获取应用 "${targetAppId}" 下的表单列表: ${error instanceof Error ? error.message : '未知错误'}`,
                        appId: targetAppId,
                        forms: [],
                        total: 0
                      }, null, 2),
                    },
                  ],
                };
              }
            } else {
              // 获取所有应用列表
              try {
                const response = await fetch(`${baseUrl || 'https://api.jiandaoyun.com'}/api/v5/app/list`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${appKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    skip: 0,
                    limit: 100
                  })
                });
                
                if (!response.ok) {
                  const errorText = await response.text();
                  return {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({
                          success: false,
                          error: true,
                          message: `HTTP错误 ${response.status}: ${errorText}`,
                          apps: [],
                          total: 0
                        }, null, 2),
                      },
                    ],
                  };
                }
                
                const responseData = await response.json() as any;
                
                // 检查 API 错误
                if (responseData.code !== undefined && responseData.code !== 0) {
                  return {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({
                          success: false,
                          error: true,
                          message: `API错误 ${responseData.code}: ${responseData.msg}`,
                          apps: [],
                          total: 0,
                          apiError: {
                            code: responseData.code,
                            message: responseData.msg
                          }
                        }, null, 2),
                      },
                    ],
                  };
                }
                
                const apps = responseData?.apps || [];
                return {
                  content: [
                    {
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
                      }, null, 2),
                    },
                  ],
                };
              } catch (error) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        success: false,
                        error: true,
                        message: `无法获取应用列表: ${error instanceof Error ? error.message : '未知错误'}`,
                        apps: [],
                        total: 0
                      }, null, 2),
                    },
                  ],
                };
              }
            }
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: `获取应用和表单列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
                    apps: [],
                    total: 0
                  }, null, 2),
                },
              ],
            };
          }
        }

        case 'get_department_users': {
          const { deptNo, hasChild } = args as {
            deptNo: number;
            hasChild?: boolean;
          };
          const { appKey, baseUrl } = getDefaultParams(args);
          
          if (!appKey) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appKey is required. Please set JIANDAOYUN_APP_KEY in MCP server configuration.',
                    users: [],
                    total: 0
                  }, null, 2),
                },
              ],
            };
          }
          
          try {
            const response = await fetch(`${baseUrl || 'https://api.jiandaoyun.com'}/api/v5/corp/department/user/list`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                dept_no: deptNo,
                has_child: hasChild || false
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `HTTP错误 ${response.status}: ${errorText}`,
                      deptNo: deptNo,
                      users: [],
                      total: 0,
                      note: '该API端点可能不可用或参数格式不正确。请检查简道云API文档确认正确的端点和参数格式。'
                    }, null, 2),
                  },
                ],
              };
            }
            
            const responseData = await response.json() as any;
            
            if (responseData.code !== undefined && responseData.code !== 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `API错误 ${responseData.code}: ${responseData.msg}`,
                      deptNo: deptNo,
                      users: [],
                      total: 0,
                      apiError: {
                        code: responseData.code,
                        message: responseData.msg
                      },
                      note: '该API端点可能不可用或参数格式不正确。请检查简道云API文档确认正确的端点和参数格式。'
                    }, null, 2),
                  },
                ],
              };
            }
            
            const users = responseData?.users || [];
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    deptNo: deptNo,
                    hasChild: hasChild || false,
                    users: users.map((user: any) => ({
                      userId: user.user_id,
                      username: user.username,
                      name: user.name,
                      email: user.email,
                      phone: user.phone,
                      departments: user.departments,
                      status: user.status
                    })),
                    total: users.length,
                    message: '获取部门成员成功'
                  }, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: `获取部门成员失败: ${error instanceof Error ? error.message : '未知错误'}`,
                    deptNo: deptNo,
                    users: [],
                    total: 0,
                    note: '该API端点可能不可用或参数格式不正确。请检查简道云API文档确认正确的端点和参数格式。'
                  }, null, 2),
                },
              ],
            };
          }
        }

        case 'get_department_children': {
          const { deptNo, hasChild } = args as {
            deptNo: number;
            hasChild?: boolean;
          };
          const { appKey, baseUrl } = getDefaultParams(args);
          
          if (!appKey) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: 'appKey is required. Please set JIANDAOYUN_APP_KEY in MCP server configuration.',
                    departments: [],
                    total: 0
                  }, null, 2),
                },
              ],
            };
          }
          
          try {
            const response = await fetch(`${baseUrl || 'https://api.jiandaoyun.com'}/api/v6/corp/department/list`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                dept_no: deptNo,
                has_child: hasChild || false
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `HTTP错误 ${response.status}: ${errorText}`,
                      deptNo: deptNo,
                      departments: [],
                      total: 0,
                      note: '该API端点可能不可用或参数格式不正确。请检查简道云API文档确认正确的端点和参数格式。'
                    }, null, 2),
                  },
                ],
              };
            }
            
            const responseData = await response.json() as any;
            
            if (responseData.code !== undefined && responseData.code !== 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: true,
                      message: `API错误 ${responseData.code}: ${responseData.msg}`,
                      deptNo: deptNo,
                      departments: [],
                      total: 0,
                      apiError: {
                        code: responseData.code,
                        message: responseData.msg
                      },
                      note: '该API端点可能不可用或参数格式不正确。请检查简道云API文档确认正确的端点和参数格式。'
                    }, null, 2),
                  },
                ],
              };
            }
            
            const departments = responseData?.departments || [];
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    deptNo: deptNo,
                    hasChild: hasChild || false,
                    departments: departments.map((dept: any) => ({
                      deptNo: dept.dept_no,
                      name: dept.name,
                      parentNo: dept.parent_no,
                      type: dept.type,
                      status: dept.status,
                      createdTime: dept.created_time,
                      updatedTime: dept.updated_time
                    })),
                    total: departments.length,
                    message: '获取子部门成功'
                  }, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: true,
                    message: `获取子部门失败: ${error instanceof Error ? error.message : '未知错误'}`,
                    deptNo: deptNo,
                    departments: [],
                    total: 0,
                    note: '该API端点可能不可用或参数格式不正确。请检查简道云API文档确认正确的端点和参数格式。'
                  }, null, 2),
                },
              ],
            };
          }
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  });

  return server;
}
