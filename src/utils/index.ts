import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type {
  ValidationRule,
  ValidationResult,
  CacheStats,
  CacheItem,
  JianDaoYunApiResponse,
  JianDaoYunApp,
  JianDaoYunField,
  FormIdResolution,
  FieldMappingResult
} from '../types.js';

/**
 * 统一的 HTTP 请求函数，包含错误处理和重试机制
 * @param url - 请求 URL
 * @param options - 请求选项
 * @param maxRetries - 最大重试次数（默认 3 次）
 * @param retryDelay - 重试延迟（默认 1000ms）
 * @returns 响应数据
 * @throws {McpError} 当请求失败时抛出错误
 */
async function httpRequest<T = any>(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      // 处理 HTTP 错误状态
      if (!response.ok) {
        const errorText = await response.text();

        // 根据状态码分类错误
        if (response.status === 401) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `认证失败 (401): API Key 无效或已过期。请检查 JIANDAOYUN_API_KEY 配置。`
          );
        } else if (response.status === 403) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `权限不足 (403): 当前 API Key 没有访问该资源的权限。`
          );
        } else if (response.status === 404) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `资源不存在 (404): 请求的接口或资源不存在。URL: ${url}`
          );
        } else if (response.status === 429) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `请求过于频繁 (429): 已超出 API 速率限制，请稍后重试。`
          );
        } else if (response.status >= 500) {
          // 服务器错误，可以重试
          const error = new Error(`服务器错误 (${response.status}): ${errorText}`) as Error & { status: number; isRetryable: boolean };
          error.status = response.status;
          error.isRetryable = true;
          throw error;
        } else {
          throw new McpError(
            ErrorCode.InternalError,
            `HTTP 错误 ${response.status}: ${errorText}`
          );
        }
      }

      const data = await response.json() as any;

      // 调试：查看完整的响应数据
      console.error(`[DEBUG] HTTP 响应完整数据:`, data);

      // 检查简道云 API 返回的错误码
      if (data.code !== undefined && data.code !== 0) {
        throw new McpError(
          ErrorCode.InternalError,
          `简道云 API 错误 (code: ${data.code}): ${data.msg || '未知错误'}`
        );
      }

      // 处理简道云 API 的响应格式
      // 有些接口返回 {"code": 0, "data": [...]}，有些返回 {"apps": [...]} 等
      if (data.data !== undefined) {
        return data.data as T;
      } else if (data.apps !== undefined) {
        // 应用列表接口返回 {"apps": [...]}
        return data.apps as T;
      } else if (data.forms !== undefined) {
        // 表单列表接口返回 {"forms": [...]}
        return data.forms as T;
      } else if (data.widgets !== undefined) {
        // 字段列表接口返回 {"widgets": [...]}
        return data as T;
      } else {
        // 其他接口直接返回数据
        return data as T;
      }
    } catch (error) {
      lastError = error as Error;

      // 如果是 McpError，直接抛出（不需要重试的错误）
      if (error instanceof McpError) {
        throw error;
      }

      // 判断是否需要重试
      const shouldRetry = attempt < maxRetries && (
        (error as Error & { isRetryable?: boolean }).isRetryable ||
        (error as Error & { code?: string }).code === 'ECONNRESET' ||
        (error as Error & { code?: string }).code === 'ETIMEDOUT' ||
        (error as Error & { code?: string }).code === 'ECONNREFUSED' ||
        (error instanceof Error && error.message?.includes('fetch failed'))
      );

      if (shouldRetry) {
        console.warn(`请求失败 (尝试 ${attempt + 1}/${maxRetries + 1}): ${error instanceof Error ? error.message : String(error)}，${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        // 指数退避
        retryDelay *= 2;
        continue;
      }

      // 不需要重试或重试次数已用完
      break;
    }
  }

  // 所有重试都失败了
  throw new McpError(
    ErrorCode.InternalError,
    `请求失败（已重试 ${maxRetries} 次）: ${lastError?.message}`
  );
}

// 为了向后兼容，保留旧的缓存变量
let appListCache: JianDaoYunApp[] | null = null;
let appListCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 缓存管理器类
 */
export class CacheManager {
  private caches: Map<string, CacheItem> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 默认5分钟

  /**
   * 设置缓存
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttl - 过期时间（毫秒）
   */
  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    this.caches.set(key, {
      value,
      expireTime: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  /**
   * 获取缓存
   * @param key - 缓存键
   * @returns 缓存值或 null
   */
  get<T>(key: string): T | null {
    const cache = this.caches.get(key);
    if (!cache) return null;

    if (Date.now() > cache.expireTime) {
      this.caches.delete(key);
      return null;
    }

    return cache.value as T;
  }

  /**
   * 检查缓存是否存在且有效
   * @param key - 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean {
    const cache = this.caches.get(key);
    if (!cache) return false;

    if (Date.now() > cache.expireTime) {
      this.caches.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存
   * @param key - 缓存键
   */
  delete(key: string): void {
    this.caches.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.caches.clear();
  }

  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  getStats(): CacheStats {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const [, cache] of this.caches) {
      if (now > cache.expireTime) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.caches.size,
      valid,
      expired
    };
  }

  /**
   * 清理过期缓存
   * @returns 清理的缓存数量
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cache] of this.caches) {
      if (now > cache.expireTime) {
        this.caches.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * 创建全局缓存管理器实例
 */
export const cacheManager = new CacheManager();

/**
 * 获取参数默认值，优先使用传入的参数，否则从环境变量获取
 * @param args - 传入的参数
 * @returns 合并后的参数对象
 * @throws {McpError} 当缺少必需的 appKey 时抛出错误
 */
export function getDefaultParams(args: Record<string, any>): { appId: any; appKey: string; baseUrl: string } {
  const appKey = args.appKey || process.env.JIANDAOYUN_API_KEY;

  if (!appKey) {
    throw new McpError(
      ErrorCode.InvalidParams,
      '缺少必需的参数: appKey。请提供 appKey 参数或在环境变量中设置 JIANDAOYUN_API_KEY。'
    );
  }

  return {
    appId: args.appId || process.env.JIANDAOYUN_APP_ID,
    appKey: appKey,
    baseUrl: process.env.JIANDAOYUN_BASE_URL || 'https://api.jiandaoyun.com'
  };
}

/**
 * 参数验证规则
 */
const validationRules: Record<string, ValidationRule> = {
  formId: {
    required: true,
    type: 'string',
    minLength: 1,
    message: 'formId 是必需的，且必须是有效的表单ID字符串'
  },
  dataId: {
    required: true,
    type: 'string',
    minLength: 1,
    message: 'dataId 是必需的，且必须是有效的数据ID字符串'
  },
  dataIds: {
    required: true,
    validator: (value: any): boolean => {
      if (typeof value === 'string') return true;
      if (Array.isArray(value) && value.every(id => typeof id === 'string')) return true;
      return false;
    },
    message: 'dataIds 必须是字符串或字符串数组'
  },
  data: {
    required: true,
    type: 'object',
    validator: (value: any): boolean => value !== null && typeof value === 'object',
    message: 'data 是必需的，且必须是一个对象'
  },
  limit: {
    type: 'number',
    min: 1,
    max: 100,
    default: 10,
    message: 'limit 必须是 1-100 之间的数字'
  },
  transactionId: {
    type: 'string',
    minLength: 1,
    message: 'transactionId 必须是有效的字符串'
  },
  fieldId: {
    type: 'string',
    minLength: 1,
    message: 'fieldId 必须是有效的字符串'
  },
  deptNo: {
    required: true,
    type: 'number',
    message: 'deptNo 是必需的，且必须是数字'
  }
};

/**
 * 验证单个参数
 * @param key - 参数名
 * @param value - 参数值
 * @param rule - 验证规则
 * @returns 验证结果
 */
function validateParam(key: string, value: any, rule: ValidationRule): { valid: boolean; error?: string } {
  // 检查必需参数
  if (rule.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: rule.message || `${key} 是必需的参数` };
  }

  // 如果值不存在且不是必需的，跳过验证
  if (!value && !rule.required) {
    return { valid: true };
  }

  // 类型检查
  if (rule.type && value !== undefined && value !== null) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      return { valid: false, error: rule.message || `${key} 必须是 ${rule.type} 类型` };
    }
  }

  // 最小长度检查
  if (rule.minLength !== undefined && value.length < rule.minLength) {
    return { valid: false, error: rule.message || `${key} 长度不能少于 ${rule.minLength}` };
  }

  // 数值范围检查
  if (rule.type === 'number' && typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return { valid: false, error: rule.message || `${key} 不能小于 ${rule.min}` };
    }
    if (rule.max !== undefined && value > rule.max) {
      return { valid: false, error: rule.message || `${key} 不能大于 ${rule.max}` };
    }
  }

  // 自定义验证器
  if (rule.validator && !rule.validator(value)) {
    return { valid: false, error: rule.message || `${key} 验证失败` };
  }

  return { valid: true };
}

/**
 * 验证输入参数
 * @param args - 输入参数对象
 * @param rules - 验证规则对象
 * @returns 验证结果
 */
export function validateInput(args: Record<string, any>, rules: Record<string, ValidationRule>): ValidationResult {
  const errors: string[] = [];
  const sanitized = { ...args };

  for (const [key, rule] of Object.entries(rules)) {
    const value = args[key];
    const result = validateParam(key, value, rule);

    if (!result.valid) {
      errors.push(result.error!);
    } else if (value === undefined && rule.default !== undefined) {
      // 应用默认值
      sanitized[key] = rule.default;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * 创建参数验证中间件
 * @param rules - 验证规则
 * @returns 验证函数
 */
export function createValidator(rules: Record<string, ValidationRule>): (args: Record<string, any>) => Record<string, any> {
  return (args: Record<string, any>): Record<string, any> => {
    const result = validateInput(args, rules);
    if (!result.valid) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `参数验证失败: ${result.errors.join('; ')}`
      );
    }
    return result.sanitized;
  };
}

/**
 * 增强的错误处理函数
 * 根据 HTTP 状态码和错误信息生成友好的错误消息
 * @param error - 原始错误对象
 * @param context - 错误上下文描述
 * @returns 格式化的 MCP 错误对象
 * @example
 * try {
 *   await apiCall();
 * } catch (error) {
 *   throw createEnhancedError(error, '获取表单数据');
 * }
 */
export function createEnhancedError(error: any, context: string): McpError {
  let message = `${context}失败`;
  if (error.response?.status === 403) {
    message += ': 权限不足，请检查API密钥权限或表单ID是否正确';
  } else if (error.response?.status === 400) {
    const errorData = error.response.data;
    if (errorData?.msg === 'The form does not exist.') {
      message += ': 表单不存在，请检查表单ID是否正确';
    } else {
      message += `: ${errorData?.msg || '请求参数错误'}`;
    }
  } else if (error.response?.status === 404) {
    message += ': 资源不存在';
  } else {
    message += `: ${error.message || '未知错误'}`;
  }
  return new McpError(ErrorCode.InternalError, message);
}

/**
 * 获取应用列表（带缓存）
 * 使用内存缓存减少 API 调用次数，缓存有效期为 5 分钟
 * @param appKey - API 密钥
 * @param baseUrl - API 基础 URL
 * @returns 应用列表，失败时返回空数组
 * @example
 * const apps = await getAppList('your-api-key');
 * console.log(apps.length); // 应用数量
 */
export async function getAppList(appKey: string, baseUrl: string = 'https://api.jiandaoyun.com'): Promise<JianDaoYunApp[]> {
  const now = Date.now();
  if (appListCache && (now - appListCacheTime) < CACHE_DURATION) {
    return appListCache;
  }
  try {
    const data = await httpRequest<JianDaoYunApp[]>(`${baseUrl}/api/v5/app/list`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${appKey}`
      },
      body: JSON.stringify({ skip: 0, limit: 200 })
    });
    // 简道云API返回格式是 { apps: [...] }
    const apps = data || [];
    appListCache = Array.isArray(apps) ? apps : [];
    appListCacheTime = now;
    return appListCache;
  } catch (error) {
    console.error('Failed to fetch app list:', error);
    return [];
  }
}

/**
 * 智能解析表单ID - 自动判断输入的是应用ID还是表单ID
 * 支持多种输入格式：
 * - 标准表单ID（24位十六进制字符串）：直接返回
 * - 应用ID：自动获取该应用下的第一个表单
 * - 其他格式：直接尝试使用
 * @param inputId - 输入的ID（可能是应用ID或表单ID）
 * @param appKey - API 密钥
 * @param baseUrl - API 基础 URL
 * @returns 解析结果
 * @throws {Error} 当应用下没有表单时抛出错误
 * @example
 * // 标准表单ID
 * const result = await resolveFormId('507f1f77bcf86cd799439011', 'api-key');
 * console.log(result.formId); // '507f1f77bcf86cd799439011'
 *
 * // 应用ID（自动获取第一个表单）
 * const result = await resolveFormId('5f3e9b2b8e4b4b0001f3e9b2', 'api-key');
 * console.log(result.formId); // 应用下第一个表单的ID
 */
export async function resolveFormId(inputId: string, appKey: string, baseUrl: string = 'https://api.jiandaoyun.com'): Promise<FormIdResolution> {
  // 如果输入看起来像表单ID（通常24位字符），直接返回
  if (inputId.length === 24 && /^[a-f0-9]{24}$/i.test(inputId)) {
    return { formId: inputId };
  }

  // 尝试作为应用ID处理
  const appList = await getAppList(appKey, baseUrl);
  const targetApp = appList.find(app => app.app_id === inputId);
  if (targetApp) {
    // 这是一个应用ID，需要获取其下的表单列表
    try {
      const data = await httpRequest<{ forms?: Array<{ entry_id?: string; _id?: string; name?: string }> }>(`${baseUrl}/api/v5/app/entry/list`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appKey}`
        },
        body: JSON.stringify({ app_id: inputId, skip: 0, limit: 0 })
      });
      const forms = data?.forms || [];
      if (forms.length === 0) {
        throw new Error(`应用 "${targetApp.name}" 下没有找到可用的表单`);
      }
      // 如果只有一个表单，直接返回
      if (forms.length === 1) {
        return {
          formId: forms[0].entry_id || forms[0]._id || '',
          appId: inputId
        };
      }
      // 多个表单时，返回建议列表
      const suggestions = forms.map((form) => `${form.name || '未命名表单'} (${form.entry_id || form._id})`);
      return {
        formId: forms[0].entry_id || forms[0]._id || '',
        appId: inputId,
        suggestions
      };
    } catch (error) {
      throw new Error(`无法获取应用 "${targetApp.name}" 下的表单列表: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 既不是标准表单ID也不是已知应用ID，直接尝试使用
  return { formId: inputId };
}

/**
 * 智能字段匹配 - 将用户输入的字段名转换为后台字段名
 * 匹配策略（按优先级）：
 * 1. 精确匹配字段标签（label）
 * 2. 包含匹配（用户输入包含字段标签或反之）
 * 3. 字段名（name）精确匹配
 * 4. 常见字段名映射（如"姓名"映射到 name/username 等）
 * @param formId - 表单ID
 * @param userData - 用户输入的数据，键为用户友好的字段名
 * @param appKey - API 密钥
 * @param appId - 应用ID
 * @param baseUrl - API 基础 URL
 * @returns 映射结果
 * @example
 * const result = await smartFieldMapping('form-id', { '姓名': '张三', '电话': '13800138000' }, 'api-key', 'app-id');
 * console.log(result.mappedData); // { name: '张三', phone: '13800138000' }
 */
export async function smartFieldMapping(
  formId: string,
  userData: Record<string, any>,
  appKey: string,
  appId: string,
  baseUrl: string = 'https://api.jiandaoyun.com'
): Promise<FieldMappingResult> {
  try {
    // 获取表单字段信息
    const data = await httpRequest<{ widgets?: JianDaoYunField[] }>(`${baseUrl}/api/v5/app/entry/widget/list`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${appKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        entry_id: formId
      })
    });
    // API返回格式: {widgets: [...], sysWidgets: ...}
    const widgets = data?.widgets || [];
    const mappedData: Record<string, any> = {};

    // 为每个用户输入的字段找到对应的后台字段名
    for (const [userKey, value] of Object.entries(userData)) {
      let matchedField: JianDaoYunField | undefined = undefined;

      // 1. 精确匹配label
      matchedField = widgets.find((w) => w.label === userKey);

      // 2. 如果没找到，尝试包含匹配
      if (!matchedField) {
        matchedField = widgets.find((w) => w.label?.includes(userKey) || userKey.includes(w.label || ''));
      }

      // 3. 如果还没找到，尝试name匹配
      if (!matchedField) {
        matchedField = widgets.find((w) => w.name === userKey);
      }

      // 4. 常见字段名映射
      if (!matchedField) {
        const commonMappings: Record<string, string[]> = {
          '姓名': ['name', 'username', '用户名', '姓名'],
          '电话': ['phone', 'tel', 'mobile', '手机', '电话'],
          '邮箱': ['email', 'mail', '邮件', '邮箱'],
          '地址': ['address', '地址', '住址'],
          '备注': ['remark', 'note', 'comment', '备注', '说明']
        };
        for (const [cnName, enNames] of Object.entries(commonMappings)) {
          if (userKey === cnName || enNames.includes(userKey)) {
            matchedField = widgets.find((w) => enNames.some(en => w.label?.includes(en) || w.name?.includes(en)));
            if (matchedField) break;
          }
        }
      }

      if (matchedField) {
        mappedData[matchedField.name] = value;
        console.log(`字段映射: "${userKey}" -> "${matchedField.name}" (${matchedField.label})`);
      } else {
        // 如果找不到匹配字段，保持原样
        mappedData[userKey] = value;
        console.log(`字段未映射: "${userKey}" 保持原样`);
      }
    }

    return {
      mappedData,
      fieldInfo: widgets.map((w) => ({
        name: w.name,
        label: w.label,
        type: w.type,
        required: w.required
      }))
    };
  } catch (error) {
    console.error('字段映射失败:', error);
    // 如果获取字段信息失败，返回原始数据
    return { mappedData: userData, fieldInfo: [] };
  }
}

export { httpRequest };
