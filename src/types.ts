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
 * 过滤条件字段类型
 * - text: 文本字段
 * - number: 数字字段
 * - datetime: 日期时间字段
 * - flowstate: 流程状态字段
 * - user: 成员字段
 * - dept: 部门字段
 * - phone: 电话字段
 * - combocheck: 复选框字段
 * - usergroup: 成员组字段
 * - deptgroup: 部门组字段
 * - lookup: 关联字段
 * - dataid: 数据ID字段
 */
export type FilterFieldType = 'text' | 'number' | 'datetime' | 'flowstate' | 'user' | 'dept' | 'phone' | 'combocheck' | 'usergroup' | 'deptgroup' | 'lookup' | 'dataid';

/**
 * 过滤条件方法
 * - eq: 等于
 * - ne: 不等于
 * - in: 包含于（多选一）
 * - nin: 不包含于
 * - like: 模糊匹配（包含）
 * - range: 范围查询（数字、日期）
 * - empty: 为空
 * - not_empty: 不为空
 * - gt: 大于
 * - lt: 小于
 * - all: 全部包含（复选框）
 * - verified: 已验证（电话字段）
 * - unverified: 未验证（电话字段）
 */
export type FilterMethod = 'eq' | 'ne' | 'in' | 'nin' | 'like' | 'range' | 'empty' | 'not_empty' | 'gt' | 'lt' | 'all' | 'verified' | 'unverified';

/**
 * 单个过滤条件
 */
export interface FilterCondition {
  field: string;
  type: FilterFieldType;
  method: FilterMethod;
  value?: string | number | boolean | (string | number)[];
}

/**
 * 过滤条件组合
 * - rel: 关系类型，and（且）或 or（或）
 * - cond: 条件数组，可嵌套 FilterConditionGroup
 */
export interface FilterConditionGroup {
  rel: 'and' | 'or';
  cond: (FilterCondition | FilterConditionGroup)[];
}

/**
 * 排序条件
 */
export interface SortCondition {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * 表单数据查询选项
 */
export interface QueryDataOptions {
  formId: string;
  dataId?: string;
  fields?: string[];
  filter?: FilterConditionGroup;
  limit?: number;
  skip?: number;
  sort?: SortCondition;
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
export interface DeleteDataOptions{
  isStartTrigger?: boolean;
  transactionId?: string;
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
