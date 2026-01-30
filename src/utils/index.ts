import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

// 应用缓存，避免重复API调用
let appListCache: any[] | null = null;
let appListCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取参数默认值，优先使用传入的参数，否则从环境变量获取
 */
export function getDefaultParams(args: any) {
  return {
    appId: args.appId || process.env.JIANDAOYUN_APP_ID,
    appKey: args.appKey || process.env.JIANDAOYUN_APP_KEY,
    baseUrl: process.env.JIANDAOYUN_BASE_URL
  };
}

/**
 * 增强的错误处理函数
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
 */
export async function getAppList(appKey: string): Promise<any[]> {
  const now = Date.now();
  if (appListCache && (now - appListCacheTime) < CACHE_DURATION) {
    return appListCache;
  }

  try {
    const response = await axios.post(
      `${process.env.JIANDAOYUN_BASE_URL || 'https://api.jiandaoyun.com'}/api/v5/app/list`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${appKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // 简道云API返回格式是 { apps: [...] }
    const apps = response.data?.apps || [];
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
 */
export async function resolveFormId(inputId: string, appKey: string): Promise<{ formId: string; appId?: string; suggestions?: string[] }> {
  // 如果输入看起来像表单ID（通常24位字符），直接返回
  if (inputId.length === 24 && /^[a-f0-9]{24}$/i.test(inputId)) {
    return { formId: inputId };
  }

  // 尝试作为应用ID处理
  const appList = await getAppList(appKey);
  const targetApp = appList.find(app => app.app_id === inputId);
  
  if (targetApp) {
    // 这是一个应用ID，需要获取其下的表单列表
    try {
      const response = await axios.post(
        `${process.env.JIANDAOYUN_BASE_URL || 'https://api.jiandaoyun.com'}/api/v1/app/${inputId}/entry/list`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${appKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const forms = response.data || [];
      if (forms.length === 0) {
        throw new Error(`应用 "${targetApp.name}" 下没有找到可用的表单`);
      }
      
      // 如果只有一个表单，直接返回
      if (forms.length === 1) {
        return { 
          formId: forms[0].entry_id || forms[0]._id,
          appId: inputId
        };
      }
      
      // 多个表单时，返回建议列表
      const suggestions = forms.map((form: any) => 
        `${form.name || '未命名表单'} (${form.entry_id || form._id})`
      );
      
      return {
        formId: forms[0].entry_id || forms[0]._id, // 默认返回第一个
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
 */
export async function smartFieldMapping(formId: string, userData: any, appKey: string, appId?: string): Promise<any> {
  try {
    // 获取表单字段信息
    const response = await axios.post(
      `${process.env.JIANDAOYUN_BASE_URL || 'https://api.jiandaoyun.com'}/api/v5/app/entry/widget/list`,
      {
        app_id: appId,
        entry_id: formId
      },
      {
        headers: {
          'Authorization': `Bearer ${appKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // API返回格式: {widgets: [...], sysWidgets: ...}
    const widgets = response.data?.widgets || [];
    const mappedData: any = {};
    
    // 为每个用户输入的字段找到对应的后台字段名
    for (const [userKey, value] of Object.entries(userData)) {
      let matchedField = null;
      
      // 1. 精确匹配label
      matchedField = widgets.find((w: any) => w.label === userKey);
      
      // 2. 如果没找到，尝试包含匹配
      if (!matchedField) {
        matchedField = widgets.find((w: any) => 
          w.label?.includes(userKey) || userKey.includes(w.label || '')
        );
      }
      
      // 3. 如果还没找到，尝试name匹配
      if (!matchedField) {
        matchedField = widgets.find((w: any) => w.name === userKey);
      }
      
      // 4. 常见字段名映射
      if (!matchedField) {
        const commonMappings: { [key: string]: string[] } = {
          '姓名': ['name', 'username', '用户名', '姓名'],
          '电话': ['phone', 'tel', 'mobile', '手机', '电话'],
          '邮箱': ['email', 'mail', '邮件', '邮箱'],
          '地址': ['address', '地址', '住址'],
          '备注': ['remark', 'note', 'comment', '备注', '说明']
        };
        
        for (const [cnName, enNames] of Object.entries(commonMappings)) {
          if (userKey === cnName || enNames.includes(userKey)) {
            matchedField = widgets.find((w: any) => 
              enNames.some(en => w.label?.includes(en) || w.name?.includes(en))
            );
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
      fieldInfo: widgets.map((w: any) => ({
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
