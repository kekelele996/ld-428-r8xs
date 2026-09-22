import { AlertTriangle } from 'lucide-react';

import { withdrawalReasonLabels } from '../../constants/statusLabels';
import type { WithdrawalLog } from '../../types/withdrawal';

/** 展览页的撤出留痕：作品被退回/下架/审核推翻时自动撤出并展示原因。 */
export function WithdrawalNotice({ logs, artworkTitle }: { logs: WithdrawalLog[]; artworkTitle?: (id: string) => string }) {
  if (!logs.length) return null;
  return (
    <section className="mt-8 border border-red-300 bg-red-50 p-5">
      <h3 className="flex items-center gap-2 font-display text-2xl text-red-800">
        <AlertTriangle size={20} /> 自动撤出记录
      </h3>
      <ul className="mt-4 space-y-3">
        {logs.map((log) => (
          <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-ink">{artworkTitle?.(log.artworkId) ?? log.artworkId}</span>
            <span className="rounded-full bg-red-700 px-3 py-1 text-xs font-semibold text-rice">
              {withdrawalReasonLabels[log.reason]}
            </span>
            {log.comment && <span className="w-full text-ink/70">原因：{log.comment}</span>}
            <span className="w-full text-xs text-ink/45">{new Date(log.createdAt).toLocaleString('zh-CN')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
