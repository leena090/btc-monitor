'use client';

/**
 * AlertHistory — 최근 알림 10개 목록
 * 타입별 아이콘 + 시각 + 메시지
 */

import type { AlertHistoryItem } from '@/lib/scoring/types';

interface Props {
  alerts: AlertHistoryItem[];
}

// 알림 타입별 아이콘
const ALERT_ICONS: Record<AlertHistoryItem['type'], string> = {
  rsi_bottom:       '★',
  rsi_bull:         '★★',
  bear_regime:      '⚠️',
  score_change:     '📊',
  grade_change:     '🔔',
  extreme_fear:     '🟢',
  price_spike:      '⚡',
  funding_extreme:  '💰',
  whale_inflow:     '🐋',
  miner_outflow:    '⛏️',
  exchange_reserve: '🏦',
  mvrv_bottom:      '📉',
};

// 심각도별 색상
const SEVERITY_COLORS = {
  critical: { dot: '#ef4444', text: '#fca5a5' },
  warning:  { dot: '#f59e0b', text: '#fcd34d' },
  info:     { dot: '#3b82f6', text: '#93c5fd' },
};

// 시간 포맷 헬퍼 (상대 시간)
function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금';
}

export default function AlertHistory({ alerts }: Props) {
  // 최근 10개만 표시
  const recentAlerts = alerts.slice(0, 10);

  return (
    <div className="p-5 rounded-xl border border-white/8"
         style={{ background: '#12121a' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold tracking-widest"
            style={{ color: '#64748b' }}>
          알림 히스토리
        </h3>
        <span className="text-xs" style={{ color: '#475569' }}>
          최근 {recentAlerts.length}건
        </span>
      </div>

      {/* 알림 목록 */}
      {recentAlerts.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: '#475569' }}>
          최근 알림 없음
        </p>
      ) : (
        <div className="space-y-2">
          {recentAlerts.map((alert) => {
            const sev = SEVERITY_COLORS[alert.severity];
            const icon = ALERT_ICONS[alert.type];
            return (
              <div key={alert.id}
                   className="flex items-start gap-3 py-2 border-b border-white/8 last:border-0">
                {/* 심각도 점 */}
                <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                     style={{ background: sev.dot }} />

                {/* 아이콘 */}
                <span className="text-sm flex-shrink-0 w-5">{icon}</span>

                {/* 메시지 */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed"
                     style={{ color: sev.text }}>
                    {alert.message}
                  </p>
                </div>

                {/* 시간 */}
                <span className="text-xs flex-shrink-0 tabular-nums"
                      style={{ color: '#475569' }}>
                  {formatRelativeTime(alert.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
