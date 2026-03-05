/**
 * 自然语言处理器模块
 * 负责解析用户的自然语言输入，转换为MCP工具调用，并处理返回结果
 */

import { logger } from './utils/logger.js';
import { tools } from './mcp-server/shared/init.js';

/**
 * 工具映射表 - 用于将自然语言意图映射到具体的工具
 */
const TOOL_MAPPINGS = {
  list_apps: ['list_apps_and_forms'],
  get_forms: ['list_apps_and_forms'],
  list_forms: ['list_apps_and_forms'],
  get_form_fields: ['get_form_fields'],
  form_fields: ['get_form_fields'],
  submit_data: ['submit_form_data'],
  add_data: ['submit_form_data'],
  create_data: ['submit_form_data'],
  query_data: ['query_form_data'],
  get_data: ['query_form_data'],
  search_data: ['query_form_data'],
  update_data: ['update_form_data'],
  edit_data: ['update_form_data'],
  delete_data: ['delete_form_data'],
  remove_data: ['delete_form_data'],
  get_department_users: ['get_department_users'],
  department_users: ['get_department_users'],
  get_department_children: ['get_department_children'],
  department_children: ['get_department_children'],
  get_upload_token: ['get_upload_token'],
  upload_token: ['get_upload_token'],
  get_latest_data: ['get_latest_data'],
  latest_data: ['get_latest_data']
};

/**
 * 常见字段映射表
 */
const COMMON_FIELD_MAPPINGS = {
  '姓名': ['name', 'username', '用户名', '姓名'],
  '电话': ['phone', 'tel', 'mobile', '手机', '电话'],
  '邮箱': ['email', 'mail', '邮件', '邮箱'],
  '地址': ['address', '地址', '住址'],
  '备注': ['remark', 'note', 'comment', '备注', '说明'],
  '年龄': ['age', '年龄'],
  '性别': ['gender', 'sex', '性别'],
  '日期': ['date', '时间', '日期'],
  '金额': ['amount', 'money', '金额'],
  '数量': ['quantity', 'count', '数量']
};

/**
 * 意图识别结果
 */
interface IntentResult {
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
}

/**
 * 自然语言处理器类
 */
export class NLPProcessor {
  /**
   * 解析用户自然语言输入
   * @param input - 用户输入的自然语言文本
   * @returns 意图识别结果
   */
  static parseInput(input: string): IntentResult {
    logger.info('Parsing natural language input:', { input });
    
    const normalizedInput = input.toLowerCase().trim();
    let bestIntent = 'unknown';
    let bestConfidence = 0;
    const parameters: Record<string, any> = {};

    // 意图识别
    if (normalizedInput.includes('应用') && (normalizedInput.includes('列表') || normalizedInput.includes('所有'))) {
      bestIntent = 'list_apps';
      bestConfidence = 0.9;
    } else if (normalizedInput.includes('表单') && (normalizedInput.includes('列表') || normalizedInput.includes('所有'))) {
      bestIntent = 'get_forms';
      bestConfidence = 0.9;
      // 提取应用ID
      const appIdMatch = input.match(/应用ID[:：]\s*([\w-]+)/);
      if (appIdMatch) {
        parameters.appId = appIdMatch[1];
      }
    } else if (normalizedInput.includes('表单') && normalizedInput.includes('字段')) {
      bestIntent = 'get_form_fields';
      bestConfidence = 0.9;
      // 提取表单ID
      const formIdMatch = input.match(/表单ID[:：]\s*([\w-]+)/);
      if (formIdMatch) {
        parameters.formId = formIdMatch[1];
      }
      // 提取应用ID
      const appIdMatch = input.match(/应用ID[:：]\s*([\w-]+)/);
      if (appIdMatch) {
        parameters.appId = appIdMatch[1];
      }
    } else if ((normalizedInput.includes('提交') || normalizedInput.includes('添加') || normalizedInput.includes('创建')) && normalizedInput.includes('数据')) {
      bestIntent = 'submit_data';
      bestConfidence = 0.9;
      // 提取表单ID
      const formIdMatch = input.match(/表单ID[:：]\s*([\w-]+)/);
      if (formIdMatch) {
        parameters.formId = formIdMatch[1];
      }
      // 提取应用ID
      const appIdMatch = input.match(/应用ID[:：]\s*([\w-]+)/);
      if (appIdMatch) {
        parameters.appId = appIdMatch[1];
      }
      // 提取数据
      parameters.data = this.extractDataFromInput(input);
    } else if ((normalizedInput.includes('查询') || normalizedInput.includes('获取') || normalizedInput.includes('搜索')) && normalizedInput.includes('数据')) {
      bestIntent = 'query_data';
      bestConfidence = 0.9;
      // 提取表单ID
      const formIdMatch = input.match(/表单ID[:：]\s*([\w-]+)/);
      if (formIdMatch) {
        parameters.formId = formIdMatch[1];
      }
      // 提取数据ID
      const dataIdMatch = input.match(/数据ID[:：]\s*([\w-]+)/);
      if (dataIdMatch) {
        parameters.dataId = dataIdMatch[1];
      }
      // 提取应用ID
      const appIdMatch = input.match(/应用ID[:：]\s*([\w-]+)/);
      if (appIdMatch) {
        parameters.appId = appIdMatch[1];
      }
    } else if ((normalizedInput.includes('更新') || normalizedInput.includes('编辑')) && normalizedInput.includes('数据')) {
      bestIntent = 'update_data';
      bestConfidence = 0.9;
      // 提取表单ID
      const formIdMatch = input.match(/表单ID[:：]\s*([\w-]+)/);
      if (formIdMatch) {
        parameters.formId = formIdMatch[1];
      }
      // 提取数据ID
      const dataIdMatch = input.match(/数据ID[:：]\s*([\w-]+)/);
      if (dataIdMatch) {
        parameters.dataId = dataIdMatch[1];
      }
      // 提取应用ID
      const appIdMatch = input.match(/应用ID[:：]\s*([\w-]+)/);
      if (appIdMatch) {
        parameters.appId = appIdMatch[1];
      }
      // 提取数据
      parameters.data = this.extractDataFromInput(input);
    } else if ((normalizedInput.includes('删除') || normalizedInput.includes('移除')) && normalizedInput.includes('数据')) {
      bestIntent = 'delete_data';
      bestConfidence = 0.9;
      // 提取表单ID
      const formIdMatch = input.match(/表单ID[:：]\s*([\w-]+)/);
      if (formIdMatch) {
        parameters.formId = formIdMatch[1];
      }
      // 提取数据ID
      const dataIdMatch = input.match(/数据ID[:：]\s*([\w-]+)/);
      if (dataIdMatch) {
        parameters.dataIds = dataIdMatch[1];
      }
      // 提取多个数据ID
      const dataIdsMatch = input.match(/数据ID[:：]\s*\[(.*?)\]/);
      if (dataIdsMatch) {
        parameters.dataIds = dataIdsMatch[1].split(',').map((id: string) => id.trim());
      }
      // 提取应用ID
      const appIdMatch = input.match(/应用ID[:：]\s*([\w-]+)/);
      if (appIdMatch) {
        parameters.appId = appIdMatch[1];
      }
    } else if (normalizedInput.includes('部门') && normalizedInput.includes('用户')) {
      bestIntent = 'get_department_users';
      bestConfidence = 0.9;
      // 提取部门编号
      const deptNoMatch = input.match(/部门编号[:：]\s*(\d+)/);
      if (deptNoMatch) {
        parameters.deptNo = parseInt(deptNoMatch[1]);
      }
      // 提取是否包含子部门
      if (normalizedInput.includes('包含子部门')) {
        parameters.hasChild = true;
      }
    } else if (normalizedInput.includes('部门') && (normalizedInput.includes('子部门') || normalizedInput.includes('下属部门'))) {
      bestIntent = 'get_department_children';
      bestConfidence = 0.9;
      // 提取部门编号
      const deptNoMatch = input.match(/部门编号[:：]\s*(\d+)/);
      if (deptNoMatch) {
        parameters.deptNo = parseInt(deptNoMatch[1]);
      }
      // 提取是否包含子部门
      if (normalizedInput.includes('包含所有子部门')) {
        parameters.hasChild = true;
      }
    } else if (normalizedInput.includes('上传') && normalizedInput.includes('令牌')) {
      bestIntent = 'get_upload_token';
      bestConfidence = 0.9;
      // 提取表单ID
      const formIdMatch = input.match(/表单ID[:：]\s*([\w-]+)/);
      if (formIdMatch) {
        parameters.formId = formIdMatch[1];
      }
      // 提取事务ID
      const transactionIdMatch = input.match(/事务ID[:：]\s*([\w-]+)/);
      if (transactionIdMatch) {
        parameters.transactionId = transactionIdMatch[1];
      }
      // 提取应用ID
      const appIdMatch = input.match(/应用ID[:：]\s*([\w-]+)/);
      if (appIdMatch) {
        parameters.appId = appIdMatch[1];
      }
    } else if (normalizedInput.includes('最新') && normalizedInput.includes('数据')) {
      bestIntent = 'get_latest_data';
      bestConfidence = 0.9;
      // 提取表单ID
      const formIdMatch = input.match(/表单ID[:：]\s*([\w-]+)/);
      if (formIdMatch) {
        parameters.formId = formIdMatch[1];
      }
      // 提取应用ID
      const appIdMatch = input.match(/应用ID[:：]\s*([\w-]+)/);
      if (appIdMatch) {
        parameters.appId = appIdMatch[1];
      }
    }

    // 提取API Key（如果有）
    const apiKeyMatch = input.match(/API密钥[:：]\s*([\w-]+)/);
    if (apiKeyMatch) {
      parameters.appKey = apiKeyMatch[1];
    }

    return {
      intent: bestIntent,
      confidence: bestConfidence,
      parameters
    };
  }

  /**
   * 从输入中提取数据
   * @param input - 用户输入
   * @returns 提取的数据对象
   */
  private static extractDataFromInput(input: string): Record<string, any> {
    const data: Record<string, any> = {};
    
    // 尝试匹配键值对格式
    const keyValueMatches = input.match(/([^:：]+)[:：]\s*([^,，]+)/g);
    if (keyValueMatches) {
      keyValueMatches.forEach(match => {
        const [keyPart, valuePart] = match.split(/[:：]\s*/);
        const key = keyPart.trim();
        const value = valuePart.trim().replace(/[,，]$/, '');
        
        // 尝试转换数据类型
        if (!isNaN(Number(value)) && value !== '') {
          data[key] = Number(value);
        } else if (value.toLowerCase() === 'true') {
          data[key] = true;
        } else if (value.toLowerCase() === 'false') {
          data[key] = false;
        } else if (value.startsWith('[') && value.endsWith(']')) {
          // 数组
          data[key] = value.slice(1, -1).split(',').map((item: string) => item.trim());
        } else {
          data[key] = value;
        }
      });
    }

    return data;
  }

  /**
   * 获取映射的工具名称
   * @param intent - 识别的意图
   * @returns 工具名称列表
   */
  static getMappedTools(intent: string): string[] {
    return TOOL_MAPPINGS[intent as keyof typeof TOOL_MAPPINGS] || [];
  }

  /**
   * 格式化工具返回结果
   * @param toolName - 工具名称
   * @param result - 工具返回结果
   * @returns 格式化后的结果
   */
  static formatResult(toolName: string, result: any): string {
    logger.info('Formatting tool result:', { toolName, result });
    
    try {
      // 解析工具返回的内容
      let content = result;
      if (result.content && result.content.length > 0) {
        content = JSON.parse(result.content[0].text);
      }

      if (!content.success) {
        return `操作失败: ${content.message || '未知错误'}`;
      }

      switch (toolName) {
        case 'list_apps_and_forms':
          if (content.apps) {
            return `找到 ${content.total} 个应用:\n${content.apps.map((app: any) => `- ${app.name} (ID: ${app.id})`).join('\n')}`;
          } else if (content.forms) {
            return `找到 ${content.total} 个表单:\n${content.forms.map((form: any) => `- ${form.name} (ID: ${form.id})`).join('\n')}`;
          }
          break;

        case 'get_form_fields':
          if (content.fields) {
            return `表单字段信息:\n${content.fields.map((field: any) => `- ${field.label || field.name} (类型: ${field.type}, ID: ${field.key})`).join('\n')}`;
          }
          break;

        case 'submit_form_data':
          return `数据提交成功!\n表单ID: ${content.formUsed}\n${content.fieldMapping ? `字段映射: ${JSON.stringify(content.fieldMapping, null, 2)}` : ''}`;

        case 'query_form_data':
          if (content.data) {
            if (Array.isArray(content.data)) {
              return `找到 ${content.data.length} 条数据:\n${content.data.map((item: any, index: number) => `数据 ${index + 1}: ${JSON.stringify(item, null, 2)}`).join('\n\n')}`;
            } else {
              return `查询到的数据:\n${JSON.stringify(content.data, null, 2)}`;
            }
          }
          break;

        case 'update_form_data':
          return `数据更新成功!`;

        case 'delete_form_data':
          return `数据删除成功! 删除了 ${content.deletedCount || 1} 条记录`;

        case 'get_department_users':
          if (content.data && content.data.users) {
            return `部门用户信息:\n${content.data.users.map((user: any) => `- ${user.name} (用户名: ${user.username}, 状态: ${user.status === 1 ? '活跃' : '禁用'})`).join('\n')}`;
          }
          break;

        case 'get_department_children':
          if (content.data && content.data.departments) {
            return `子部门信息:\n${content.data.departments.map((dept: any) => `- ${dept.name} (编号: ${dept.dept_no}, 父部门: ${dept.parent_no})`).join('\n')}`;
          }
          break;

        case 'get_upload_token':
          if (content.data) {
            return `文件上传令牌获取成功!\n上传地址: ${content.data.upload_url}\n令牌: ${content.data.upload_token}`;
          }
          break;

        case 'get_latest_data':
          if (content.data) {
            return `最新数据:\n${JSON.stringify(content.data, null, 2)}`;
          } else {
            return `表单暂无数据`;
          }
          break;

        default:
          return `操作成功!\n结果:\n${JSON.stringify(content, null, 2)}`;
      }

      return `操作成功!\n结果:\n${JSON.stringify(content, null, 2)}`;
    } catch (error) {
      logger.error('Error formatting result:', { error });
      return `结果格式化失败: ${error instanceof Error ? error.message : '未知错误'}\n原始结果: ${JSON.stringify(result, null, 2)}`;
    }
  }

  /**
   * 处理自然语言请求
   * @param input - 用户自然语言输入
   * @returns 处理结果
   */
  static async processRequest(input: string): Promise<string> {
    try {
      // 解析输入
      const parsed = this.parseInput(input);
      logger.info('Parsed input:', parsed);

      if (parsed.confidence < 0.5 || parsed.intent === 'unknown') {
        return '抱歉，我无法理解您的请求。请尝试更明确的描述，例如："获取所有应用列表" 或 "提交数据到表单，表单ID: xxx，姓名: 张三，年龄: 25"';
      }

      // 获取映射的工具
      const mappedTools = this.getMappedTools(parsed.intent);
      if (mappedTools.length === 0) {
        return `抱歉，我无法处理您的请求。识别到的意图: ${parsed.intent}`;
      }

      const toolName = mappedTools[0];
      logger.info('Mapping to tool:', { toolName, parameters: parsed.parameters });

      // 检查工具是否存在
      const tool = tools.get(toolName);
      if (!tool) {
        return `抱歉，工具 ${toolName} 不存在。`;
      }

      // 调用工具
      logger.info('Calling tool:', { toolName, parameters: parsed.parameters });
      const result = await tool.handler(parsed.parameters);
      logger.info('Tool result:', result);

      // 格式化结果
      const formattedResult = this.formatResult(toolName, result);
      return formattedResult;
    } catch (error) {
      logger.error('Error processing request:', { error });
      return `处理请求时出错: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }
}
