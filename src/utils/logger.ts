/**
 * 日志工具类
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/**
 * 获取当前日志级别
 */
function getCurrentLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toUpperCase();
  switch (level) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'SILENT':
      return LogLevel.SILENT;
    default:
      return process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
  }
}

/**
 * 格式化日志消息
 * @param level - 日志级别
 * @param message - 日志消息
 * @param meta - 元数据
 * @returns 格式化后的日志字符串
 */
function formatLogMessage(level: string, message: string, meta: Record<string, any> = {}): string {
  const timestamp = new Date().toISOString();
  const pid = process.pid;
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] [PID:${pid}] ${message}${metaStr}`;
}

/**
 * 增强的日志工具类
 */
export class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = getCurrentLogLevel();
  }

  /**
   * 设置日志级别
   * @param level - 日志级别
   */
  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * 检查是否应该记录该级别的日志
   * @param level - 日志级别
   * @returns 是否应该记录
   */
  shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  /**
   * 记录调试日志
   * @param message - 日志消息
   * @param meta - 元数据
   */
  debug(message: string, meta: Record<string, any> = {}): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(formatLogMessage('DEBUG', message, meta));
    }
  }

  /**
   * 记录信息日志
   * @param message - 日志消息
   * @param meta - 元数据
   */
  info(message: string, meta: Record<string, any> = {}): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(formatLogMessage('INFO', message, meta));
    }
  }

  /**
   * 记录警告日志
   * @param message - 日志消息
   * @param meta - 元数据
   */
  warn(message: string, meta: Record<string, any> = {}): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(formatLogMessage('WARN', message, meta));
    }
  }

  /**
   * 记录错误日志
   * @param message - 日志消息
   * @param meta - 元数据
   */
  error(message: string, meta: Record<string, any> = {}): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(formatLogMessage('ERROR', message, meta));
    }
  }

  /**
   * 记录 API 请求日志
   * @param method - HTTP 方法
   * @param url - 请求 URL
   * @param meta - 元数据
   */
  logRequest(method: string, url: string, meta: Record<string, any> = {}): void {
    this.debug(`API Request: ${method} ${url}`, meta);
  }

  /**
   * 记录 API 响应日志
   * @param method - HTTP 方法
   * @param url - 请求 URL
   * @param status - HTTP 状态码
   * @param duration - 请求耗时（毫秒）
   * @param meta - 元数据
   */
  logResponse(method: string, url: string, status: number, duration: number, meta: Record<string, any> = {}): void {
    const message = `API Response: ${method} ${url} - ${status} (${duration}ms)`;
    
    if (status >= 400) {
      this.error(message, meta);
    } else if (status >= 300) {
      this.warn(message, meta);
    } else {
      this.debug(message, meta);
    }
  }

  /**
   * 记录性能日志
   * @param operation - 操作名称
   * @param duration - 耗时（毫秒）
   * @param meta - 元数据
   */
  logPerformance(operation: string, duration: number, meta: Record<string, any> = {}): void {
    this.debug(`Performance: ${operation} took ${duration}ms`, meta);
  }
}

/**
 * 创建单例实例
 */
export const logger = new Logger();

/**
 * 为了向后兼容，保留旧的日志接口
 */
export const legacyLogger = {
  info: (message: string): void => logger.info(message),
  error: (message: string): void => logger.error(message),
  warn: (message: string): void => logger.warn(message),
  debug: (message: string): void => logger.debug(message)
};

export default logger;
