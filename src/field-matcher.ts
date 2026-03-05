/**
 * 字段匹配工具
 * 提供简道云字段和用户输入之间的智能匹配功能
 */

import type { JianDaoYunField } from './types.js';

/**
 * 字段匹配结果
 */
export interface FieldMatchResult {
  /** 匹配到的字段定义 */
  field: JianDaoYunField | null;
  /** 匹配分数 (0-1) */
  score: number;
  /** 匹配类型 */
  matchType: 'exact' | 'partial' | 'fuzzy' | 'none';
}

/**
 * 常见字段名映射表
 * 用于将用户友好的字段名映射到标准字段名
 */
export const COMMON_FIELD_MAPPINGS: Record<string, string[]> = {
  '姓名': ['name', 'username', 'realname', '姓名', '用户姓名', '联系人姓名'],
  '电话': ['phone', 'tel', 'mobile', 'cellphone', '手机', '联系电话', '电话号码'],
  '邮箱': ['email', 'mail', 'e-mail', '电子邮件', '邮箱地址'],
  '地址': ['address', 'addr', 'location', '详细地址', '居住地址'],
  '备注': ['remark', 'note', 'comment', 'description', '说明', '备注信息'],
  '日期': ['date', 'datetime', '时间', '日期时间'],
  '金额': ['amount', 'money', 'price', 'total', '金额', '总价'],
  '数量': ['quantity', 'count', 'number', 'qty', '数量', '件数'],
  '状态': ['status', 'state', '当前状态', '处理状态'],
  '类型': ['type', 'category', 'kind', '分类', '类型'],
  '部门': ['department', 'dept', '所属部门', '部门名称'],
  '职位': ['position', 'job', 'title', '职务', '岗位'],
  '公司': ['company', 'organization', '企业', '公司名称'],
  '创建人': ['creator', 'creator_name', '创建者', '提交人'],
  '创建时间': ['create_time', 'created_at', '提交时间', '录入时间']
};

/**
 * 计算两个字符串的相似度分数
 * @param str1 - 第一个字符串
 * @param str2 - 第二个字符串
 * @returns 相似度分数 (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // 完全匹配
  if (s1 === s2) return 1.0;
  
  // 包含匹配
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // 计算编辑距离
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 删除
        matrix[i][j - 1] + 1,      // 插入
        matrix[i - 1][j - 1] + cost // 替换
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1.0 : 1 - matrix[len1][len2] / maxLen;
}

/**
 * 查找最佳匹配的字段
 * @param userKey - 用户输入的字段名
 * @param fields - 可用的字段列表
 * @returns 匹配结果
 */
export function findBestMatch(userKey: string, fields: JianDaoYunField[]): FieldMatchResult {
  if (!userKey || !fields || fields.length === 0) {
    return { field: null, score: 0, matchType: 'none' };
  }
  
  let bestMatch: JianDaoYunField | null = null;
  let bestScore = 0;
  let matchType: FieldMatchResult['matchType'] = 'none';
  
  // 1. 精确匹配 label
  for (const field of fields) {
    if (field.label === userKey) {
      return { field, score: 1.0, matchType: 'exact' };
    }
  }
  
  // 2. 精确匹配 name
  for (const field of fields) {
    if (field.name === userKey) {
      return { field, score: 1.0, matchType: 'exact' };
    }
  }
  
  // 3. 常见字段名映射
  for (const [cnName, enNames] of Object.entries(COMMON_FIELD_MAPPINGS)) {
    if (userKey === cnName || enNames.includes(userKey)) {
      for (const field of fields) {
        const fieldLabels = [field.label, field.name].filter(Boolean);
        for (const label of fieldLabels) {
          if (enNames.some(en => label?.toLowerCase().includes(en.toLowerCase()))) {
            return { field, score: 0.95, matchType: 'exact' };
          }
        }
      }
    }
  }
  
  // 4. 部分匹配 label
  for (const field of fields) {
    if (field.label) {
      const score = calculateSimilarity(field.label, userKey);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = field;
        matchType = score > 0.8 ? 'exact' : score > 0.5 ? 'partial' : 'fuzzy';
      }
    }
  }
  
  // 5. 部分匹配 name
  for (const field of fields) {
    if (field.name) {
      const score = calculateSimilarity(field.name, userKey);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = field;
        matchType = score > 0.8 ? 'exact' : score > 0.5 ? 'partial' : 'fuzzy';
      }
    }
  }
  
  // 6. 模糊匹配
  if (bestScore < 0.5) {
    for (const field of fields) {
      const labels = [field.label, field.name].filter(Boolean);
      for (const label of labels) {
        // 首字母匹配
        if (label && userKey && label[0].toLowerCase() === userKey[0].toLowerCase()) {
          const score = 0.3;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = field;
            matchType = 'fuzzy';
          }
        }
      }
    }
  }
  
  return { field: bestMatch, score: bestScore, matchType };
}

/**
 * 批量匹配字段
 * @param userData - 用户输入的数据
 * @param fields - 可用的字段列表
 * @returns 匹配结果映射
 */
export function batchMatchFields(
  userData: Record<string, any>,
  fields: JianDaoYunField[]
): Map<string, FieldMatchResult> {
  const results = new Map<string, FieldMatchResult>();
  
  for (const key of Object.keys(userData)) {
    const result = findBestMatch(key, fields);
    results.set(key, result);
  }
  
  return results;
}

/**
 * 转换用户数据为表单数据
 * @param userData - 用户输入的数据
 * @param fields - 表单字段定义
 * @returns 转换后的数据和匹配信息
 */
export function convertUserData(
  userData: Record<string, any>,
  fields: JianDaoYunField[]
): {
  formData: Record<string, any>;
  matched: Array<{ userKey: string; fieldName: string; fieldLabel: string; score: number }>;
  unmatched: string[];
} {
  const formData: Record<string, any> = {};
  const matched: Array<{ userKey: string; fieldName: string; fieldLabel: string; score: number }> = [];
  const unmatched: string[] = [];
  
  const matchResults = batchMatchFields(userData, fields);
  
  for (const [userKey, value] of Object.entries(userData)) {
    const result = matchResults.get(userKey);
    
    if (result && result.field && result.score >= 0.5) {
      formData[result.field.name] = value;
      matched.push({
        userKey,
        fieldName: result.field.name,
        fieldLabel: result.field.label || result.field.name,
        score: result.score
      });
    } else {
      // 未匹配到的字段，保持原样
      formData[userKey] = value;
      unmatched.push(userKey);
    }
  }
  
  return { formData, matched, unmatched };
}

/**
 * 获取字段建议
 * @param partialKey - 部分输入的字段名
 * @param fields - 可用的字段列表
 * @param limit - 返回的最大建议数量
 * @returns 建议列表
 */
export function getFieldSuggestions(
  partialKey: string,
  fields: JianDaoYunField[],
  limit: number = 5
): Array<{ field: JianDaoYunField; score: number }> {
  if (!partialKey || !fields || fields.length === 0) {
    return [];
  }
  
  const suggestions: Array<{ field: JianDaoYunField; score: number }> = [];
  
  for (const field of fields) {
    const labelScore = field.label ? calculateSimilarity(field.label, partialKey) : 0;
    const nameScore = field.name ? calculateSimilarity(field.name, partialKey) : 0;
    const score = Math.max(labelScore, nameScore);
    
    if (score > 0.3) {
      suggestions.push({ field, score });
    }
  }
  
  // 按分数排序并限制数量
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export default {
  findBestMatch,
  batchMatchFields,
  convertUserData,
  getFieldSuggestions,
  COMMON_FIELD_MAPPINGS
};
