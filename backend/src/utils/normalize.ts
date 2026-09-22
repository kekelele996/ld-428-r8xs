import { Types } from 'mongoose';

/**
 * Mongoose 的 lean 查询返回 _id，这里统一映射为前端使用的 id 字段，
 * 同时保留 createdAt/updatedAt 的 ISO 字符串。
 */
export function withId<T extends { _id: Types.ObjectId | string; __v?: number }>(doc: T | null) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return { id: String(_id), ...rest };
}

export function withIds<T extends { _id: Types.ObjectId | string; __v?: number }>(docs: T[]) {
  return docs.map((doc) => withId(doc)!);
}
