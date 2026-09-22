import type { Request } from 'express';

/**
 * NestJS 在全局前缀下挂载模块中间件时，会剥离 req.url/req.path 的挂载前缀
 * （此时 req.path 可能退化为 '/'）。路由匹配统一使用 originalUrl 的路径部分。
 */
export function getApiPath(req: Request): string {
  return req.originalUrl.split('?')[0];
}
