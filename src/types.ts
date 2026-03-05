/**
 * 简道云 MCP 服务器类型定义
 */

/**
 * 字段类型枚举
 */
export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  USER = 'user',
  DEPT = 'dept',
  FILE = 'file',
  IMAGE = 'image',
  LOCATION = 'location',
  ADDRESS = 'address',
  SUBFORM = 'subform',
  FORMULA = 'formula',
  SERIAL_NO = 'serial_no',
  PHONE = 'phone'
}

/**
 * 简道云字段定义
 */
export interface JianDaoYunField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  items?: JianDaoYunField[];
}

/**
 * 简道云应用信息
 */
export interface JianDaoYunApp {
  app_id: string;
  name: string;
  [key: string]: any;
}

/**
 * 简道云表单信息
 */
export interface JianDaoYunForm {
  entry_id?: string;
  _id?: string;
  name?: string;
  [key: string]: any;
}

/**
 * API 响应格式
 */
export interface JianDaoYunApiResponse<T = any> {
  code: number;
  msg?: string;
  data?: T;
  apps?: T;
  widgets?: T;
  forms?: T;
}

/**
 * 表单数据提交选项
 */
export interface SubmitDataOptions {
  formId: string;
  data: Record<string, any> | Record<string, any>[];
  transactionId?: string;
  dataCreator?: string;
  isStartWorkflow?: boolean;
  isStartTrigger?: boolean;
}

/**
 * 表单数据查询选项
 */
export interface QueryDataOptions {
  formId: string;
  dataId?: string;
  fields?: string[];
  filter?: Record<string, any>;
  limit?: number;
}

/**
 * 更新数据选项
 */
export interface UpdateDataOptions {
  transactionId?: string;
  isStartTrigger?: boolean;
}

/**
 * 删除数据选项
 */
export interface DeleteDataOptions {
  isStartTrigger?: boolean;
}

/**
 * 字段映射结果
 */
export interface FieldMappingResult {
  mappedData: Record<string, any>;
  fieldInfo: Array<{
    name: string;
    label: string;
    type: string;
    required?: boolean;
  }>;
}

/**
 * 表单 ID 解析结果
 */
export interface FormIdResolution {
  formId: string;
  appId?: string;
  suggestions?: string[];
}

/**
 * MCP 服务器配置
 */
export interface McpServerOptions {
  appId?: string;
  appKey?: string;
  baseUrl?: string;
  userAccessToken?: string;
}

/**
 * 验证规则
 */
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'object' | 'array' | 'boolean';
  minLength?: number;
  min?: number;
  max?: number;
  default?: any;
  validator?: (value: any) => boolean;
  message?: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized: Record<string, any>;
}

/**
 * 缓存项
 */
export interface CacheItem<T = any> {
  value: T;
  expireTime: number;
  createdAt: number;
}

/**
 * 缓存统计
 */
export interface CacheStats {
  total: number;
  valid: number;
  expired: number;
}
