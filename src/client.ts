/**
 * 简道云 API 客户端
 * 封装了与简道云 API 的所有交互操作
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type {
  JianDaoYunApp,
  JianDaoYunForm,
  JianDaoYunField,
  JianDaoYunApiResponse,
  SubmitDataOptions,
  QueryDataOptions,
  UpdateDataOptions,
  DeleteDataOptions
} from './types.js';
import { httpRequest, getAppList, resolveFormId } from './utils/index.js';

/**
 * 简道云 API 客户端类
 */
export class JianDaoYunClient {
  private appKey: string;
  private baseUrl: string;
  private defaultAppId?: string;

  /**
   * 创建客户端实例
   * @param appKey - API 密钥
   * @param baseUrl - API 基础 URL
   * @param defaultAppId - 默认应用ID
   */
  constructor(appKey: string, baseUrl: string = 'https://api.jiandaoyun.com', defaultAppId?: string) {
    if (!appKey) {
      throw new McpError(ErrorCode.InvalidParams, 'API Key 不能为空');
    }
    this.appKey = appKey;
    this.baseUrl = baseUrl;
    this.defaultAppId = defaultAppId;
  }

  /**
   * 获取认证头
   * @returns 认证头对象
   */
  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.appKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 获取应用列表
   * @returns 应用列表
   */
  async getApps(): Promise<JianDaoYunApp[]> {
    return getAppList(this.appKey, this.baseUrl);
  }

  /**
   * 获取表单列表
   * @param appId - 应用ID
   * @returns 表单列表
   */
  async getForms(appId: string): Promise<JianDaoYunForm[]> {
    try {
      const data = await httpRequest<{ forms?: JianDaoYunForm[] }>(`${this.baseUrl}/api/v5/app/entry/list`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ app_id: appId, skip: 0, limit: 0 })
      });
      return data?.forms || [];
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `获取表单列表失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 获取表单字段
   * @param formId - 表单ID
   * @param appId - 应用ID
   * @returns 字段列表
   */
  async getFormFields(formId: string, appId?: string): Promise<JianDaoYunField[]> {
    try {
      const resolved = await resolveFormId(formId, this.appKey, this.baseUrl);
      const targetAppId = appId || this.defaultAppId || resolved.appId;
      
      if (!targetAppId) {
        throw new McpError(ErrorCode.InvalidParams, '缺少应用ID (appId)');
      }

      const data = await httpRequest<{ widgets?: JianDaoYunField[] }>(`${this.baseUrl}/api/v5/app/entry/widget/list`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          app_id: targetAppId,
          entry_id: resolved.formId
        })
      });
      return data?.widgets || [];
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `获取表单字段失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 提交表单数据
   * @param options - 提交选项
   * @returns 提交结果
   */
  async submitData(options: SubmitDataOptions): Promise<any> {
    const { formId, data, transactionId, dataCreator, isStartWorkflow, isStartTrigger } = options;

    try {
      const resolved = await resolveFormId(formId, this.appKey, this.baseUrl);
      
      const requestBody: Record<string, any> = {
        entry_id: resolved.formId,
        data: data
      };

      if (transactionId) requestBody.transaction_id = transactionId;
      if (dataCreator) requestBody.data_creator = dataCreator;
      if (isStartWorkflow !== undefined) requestBody.is_start_workflow = isStartWorkflow;
      if (isStartTrigger !== undefined) requestBody.is_start_trigger = isStartTrigger;

      const result = await httpRequest(`${this.baseUrl}/api/v5/app/entry/data/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      return result;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `提交数据失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 查询表单数据
   * @param options - 查询选项
   * @returns 查询结果
   */
  async queryData(options: QueryDataOptions): Promise<any> {
    const { formId, dataId, fields, filter, limit = 10 } = options;

    try {
      const resolved = await resolveFormId(formId, this.appKey, this.baseUrl);

      // 如果指定了 dataId，获取单条数据
      if (dataId) {
        const result = await httpRequest(`${this.baseUrl}/api/v5/app/entry/data/get`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            entry_id: resolved.formId,
            data_id: dataId
          })
        });
        return result;
      }

      // 否则查询多条数据
      const requestBody: Record<string, any> = {
        entry_id: resolved.formId,
        limit: limit
      };

      if (fields) requestBody.fields = fields;
      if (filter) requestBody.filter = filter;

      const result = await httpRequest(`${this.baseUrl}/api/v5/app/entry/data/list`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      return result;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `查询数据失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 更新表单数据
   * @param formId - 表单ID
   * @param dataId - 数据ID
   * @param data - 更新数据
   * @param options - 更新选项
   * @returns 更新结果
   */
  async updateData(
    formId: string,
    dataId: string,
    data: Record<string, any>,
    options: UpdateDataOptions = {}
  ): Promise<any> {
    try {
      const resolved = await resolveFormId(formId, this.appKey, this.baseUrl);

      const requestBody: Record<string, any> = {
        entry_id: resolved.formId,
        data_id: dataId,
        data: data
      };

      if (options.transactionId) requestBody.transaction_id = options.transactionId;
      if (options.isStartTrigger !== undefined) requestBody.is_start_trigger = options.isStartTrigger;

      const result = await httpRequest(`${this.baseUrl}/api/v5/app/entry/data/update`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      return result;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `更新数据失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 删除表单数据
   * @param formId - 表单ID
   * @param dataIds - 数据ID或ID数组
   * @param options - 删除选项
   * @returns 删除结果
   */
  async deleteData(
    formId: string,
    dataIds: string | string[],
    options: DeleteDataOptions = {}
  ): Promise<any> {
    try {
      const resolved = await resolveFormId(formId, this.appKey, this.baseUrl);

      const ids = Array.isArray(dataIds) ? dataIds : [dataIds];

      const requestBody: Record<string, any> = {
        entry_id: resolved.formId,
        data_ids: ids
      };

      if (options.isStartTrigger !== undefined) requestBody.is_start_trigger = options.isStartTrigger;

      const result = await httpRequest(`${this.baseUrl}/api/v5/app/entry/data/delete`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      return result;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `删除数据失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 获取部门用户列表
   * @param deptNo - 部门编号
   * @param hasChild - 是否包含子部门
   * @returns 用户列表
   */
  async getDepartmentUsers(deptNo: number, hasChild: boolean = false): Promise<any> {
    try {
      const result = await httpRequest(`${this.baseUrl}/api/v5/corp/department/user/list`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          dept_no: deptNo,
          has_child: hasChild
        })
      });
      return result;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `获取部门用户失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 获取子部门列表
   * @param deptNo - 部门编号
   * @param hasChild - 是否包含嵌套子部门
   * @returns 部门列表
   */
  async getDepartmentChildren(deptNo: number, hasChild: boolean = false): Promise<any> {
    try {
      const result = await httpRequest(`${this.baseUrl}/api/v5/corp/department/list`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          dept_no: deptNo,
          has_child: hasChild
        })
      });
      return result;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `获取子部门失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 获取文件上传令牌
   * @param formId - 表单ID
   * @param transactionId - 事务ID
   * @param fieldId - 字段ID（可选）
   * @returns 上传令牌
   */
  async getUploadToken(formId: string, transactionId: string, fieldId?: string): Promise<any> {
    try {
      const resolved = await resolveFormId(formId, this.appKey, this.baseUrl);

      const requestBody: Record<string, any> = {
        entry_id: resolved.formId,
        transaction_id: transactionId
      };

      if (fieldId) requestBody.field_id = fieldId;

      const result = await httpRequest(`${this.baseUrl}/api/v5/app/entry/data/upload/token`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      return result;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `获取上传令牌失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }
}

export default JianDaoYunClient;
