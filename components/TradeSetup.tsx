'use client';

/**
 * TradeSetup — 트레이드 셋업 카드 (btc-50b 플랜 6.2 형식)
 * 방향 / 진입존 / 손절 / TP1~3 / 켈리 비율 / NO TRADE 조건
 */

import type { TradeSetup as TradeSetupType, Grade } from '@/lib/scoring/types';
import { GRADE_COLORS } from '@/lib/scoring/types';

interface Props {
  setup: TradeSetupType;
  grade: Grade;
  finalScore: number;
}

// 방향 배지 스타일 — TradeSetup.direction은 'LONG' | 'SHORT' 만 가짐
// NO_TRADE/WAIT는 grade로 판별하므로 여기서는 제외
const DIRECTION_STYLES: Record<'LONG' | 'SHORT', { label: string; color: string; bg: string; desc: string }> = {
  LONG:  { label: 'LONG',  color: '#00ff88', bg: 'rgba(0,255,136,0.15)',  desc: '매수 포지션' },
  SHORT: { label: 'SHORT', color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  desc: '매도 포지션' },
};

export default function TradeSetup({ setup, grade, finalScore }: Props) {
  // direction은 'LONG' | 'SHORT' — 폴백으로 LONG 스타일 사용
  const dir = DIRECTION_STYLES[setup.direction] ?? DIRECTION_STYLES.LONG;
  const gradeColor = GRADE_COLORS[grade];

  // 켈리 비율 퍼센트 표시 — kellyPct(정수) 또는 kellyFraction(소수) 중 존재하는 값 사용
  const kellyPct = setup.kellyPct?.toFixed(0)
    ?? (setup.kellyFraction != null ? (setup.kellyFraction * 100).toFixed(0) : '0');

  // TP 레벨별 가격 포맷
  const fmtPrice = (p: number) => `$${p.toLocaleString()}`;

  return (
    <div className="p-5 rounded-xl border border-white/5"
         style={{ background: '#12121a' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold tracking-widest"
            style={{ color: '#64748b' }}>
          트레이드 셋업
        </h3>
        {/* 등급 + 점수 */}
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums"
                style={{ color: gradeColor }}>
            {finalScore}점
          </span>
          <span className="px-3 py-1 rounded-full text-sm font-bold"
                style={{
                  background: `${gradeColor}22`,
                  color: gradeColor,
                  border: `1px solid ${gradeColor}44`,
                }}>
            {grade}
          </span>
        </div>
      </div>

      {/* NO TRADE인 경우 대기 조건 표시 — grade 기준으로 판별 (TradeSetup.direction은 LONG|SHORT 만 가짐) */}
      {grade === 'NO_TRADE' ? (
        <div className="p-4 rounded-xl text-center"
             style={{ background: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.2)' }}>
          <div className="text-2xl font-bold mb-2" style={{ color: '#6b7280' }}>
            ⛔ NO TRADE
          </div>
          <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
            현재 진입 조건 불충족 — 대기 필요
          </p>
          {(setup.waitConditions ?? []).length > 0 && (
            <div className="text-left">
              <div className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>
                진입 대기 조건
              </div>
              <ul className="space-y-1.5">
                {(setup.waitConditions ?? []).map((cond, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs"
                      style={{ color: '#64748b' }}>
                    <span style={{ color: '#475569' }}>•</span>
                    {cond}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 왼쪽: 방향 + 진입존 + 손절 */}
          <div className="space-y-3">
            {/* 방향 배지 */}
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-wide px-4 py-2 rounded-lg"
                    style={{ background: dir.bg, color: dir.color }}>
                {dir.label}
              </span>
              <div>
                <div className="text-xs" style={{ color: '#94a3b8' }}>{dir.desc}</div>
                <div className="text-xs mt-0.5" style={{ color: '#475569' }}>
                  켈리 {kellyPct}% 포지션
                </div>
              </div>
            </div>

            {/* 진입존 */}
            <div className="p-3 rounded-lg"
                 style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-xs mb-1.5" style={{ color: '#475569' }}>진입존</div>
              <div className="text-sm font-bold tabular-nums"
                   style={{ color: '#e2e8f0' }}>
                {fmtPrice(setup.entryZone.low)}
                <span className="mx-1 text-xs font-normal" style={{ color: '#475569' }}>~</span>
                {fmtPrice(setup.entryZone.high)}
              </div>
            </div>

            {/* 손절선 */}
            <div className="p-3 rounded-lg"
                 style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="text-xs mb-1.5" style={{ color: '#ef444460' }}>손절선 (SL)</div>
              <div className="text-sm font-bold tabular-nums text-red-400">
                {fmtPrice(setup.stopLoss)}
              </div>
            </div>
          </div>

          {/* 오른쪽: TP1~3 + 켈리 + 근거 */}
          <div className="space-y-3">
            {/* TP 레벨들 */}
            {[
              { label: 'TP1', price: setup.tp1, color: '#4ade80', note: '1차 익절' },
              { label: 'TP2', price: setup.tp2, color: '#22c55e', note: '2차 익절' },
              { label: 'TP3', price: setup.tp3, color: '#16a34a', note: '목표가' },
            ].map(({ label, price, color, note }) => (
              <div key={label} className="p-3 rounded-lg flex items-center justify-between"
                   style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.1)' }}>
                <div>
                  <div className="text-xs font-bold" style={{ color }}>{label}</div>
                  <div className="text-xs" style={{ color: '#475569' }}>{note}</div>
                </div>
                <div className="text-sm font-bold tabular-nums" style={{ color }}>
                  {fmtPrice(price)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 진입 근거 — NO_TRADE 등급이 아닐 때만 표시 (grade 기준 판별) */}
      {grade !== 'NO_TRADE' && setup.rationale && (
        <div className="mt-4 p-3 rounded-lg"
             style={{ background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${dir.color}40` }}>
          <div className="text-xs font-semibold mb-1" style={{ color: '#475569' }}>진입 근거</div>
          <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
            {setup.rationale}
          </p>
        </div>
      )}
    </div>
  );
}
