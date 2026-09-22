import { ApiError } from './request';

/**
 * 后端在线时接口报错（4xx/5xx，ApiError）应当向上抛出让 UI 提示；
 * 只有网络层失败（后端离线/容器未启动）才回退到本地 mock 数据。
 */
export function isOffline(error: unknown): boolean {
  return !(error instanceof ApiError);
}
