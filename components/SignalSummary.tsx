'use client';

/**
 * SignalSummary — 3장 요약 카드
 * 기술 지표를 50대 퇴직금 투자자가 이해할 수 있는 일상 한국어로 변환
 * 1. 시장 온도 (RSI + 사이클)
 * 2. 큰손 동향 (고래 + 채굴자)
 * 3. 매매 타이밍 (tradeSetup)
 */

import type { SignalResult } from '@/lib/scoring/types';
import { getMarketTemp, getBigPlayerSummary, getTimingSummary } from '@/lib/verdict';

interface Props {
  data: SignalResult;
}

export default function SignalSummary({ data }: Props) {
  // 3가지 요약 데이터 계산
  const marketTemp = getMarketTemp(data.rsi, data.cycle);
  const bigPlayer = getBigPlayerSummary(data.whale, data.miner);
  const timing = getTimingSummary({
    grade: data.grade,
    direction: data.direction,
    tradeSetup: data.tradeSetup,
    noTradeReason: data.noTradeReason,
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 카드 1: 시장 온도 */}
      <div className="p-4 rounded-xl border border-white/8" style={{
        background: '#12121a',
        borderLeft: `3px solid ${marketTemp.color}`,
      }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold tracking-widest" style={{ color: '#64748b' }}>
            시장 온도
          </span>
        </div>

        {/* 온도 레이블 — 이모지 포함 */}
        <div className="text-xl font-bold mb-1" style={{ color: marketTemp.color }}>
          {marketTemp.temp}
        </div>

        {/* 설명 */}
        <p className="text-xs leading-relaxed mb-2" style={{ color: '#94a3b8' }}>
          {marketTemp.desc}
        </p>

        {/* RSI 수치 (작게) */}
        {data.rsi && (
          <div className="flex gap-3 text-xs tabular-nums" style={{ color: '#475569' }}>
            <span>일봉 {data.rsi.daily.toFixed(0)}</span>
            <span>주봉 {data.rsi.weekly.toFixed(0)}</span>
            <span>월봉 {data.rsi.monthly.toFixed(0)}</span>
          </div>
        )}

        {/* 반감기 사이클 노트 */}
        {marketTemp.cycleNote && (
          <div className="mt-2 pt-2 border-t border-white/8 text-xs" style={{ color: '#64748b' }}>
            {marketTemp.cycleNote}
          </div>
        )}
      </div>

      {/* 카드 2: 큰손 동향 */}
      <div className="p-4 rounded-xl border border-white/8" style={{
        background: '#12121a',
        borderLeft: `3px solid ${bigPlayer.color}`,
      }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{bigPlayer.icon}</span>
          <span className="text-xs font-semibold tracking-widest" style={{ color: '#64748b' }}>
            큰손 동향
          </span>
        </div>

        {/* 헤드라인 */}
        <div className="text-xl font-bold mb-1" style={{ color: bigPlayer.color }}>
          {bigPlayer.headline}
        </div>

        {/* 설명 */}
        <p className="text-xs leading-relaxed mb-2" style={{ color: '#94a3b8' }}>
          {bigPlayer.desc}
        </p>

        {/* 세부 수치 (작게) */}
        <div className="flex flex-col gap-1 text-xs" style={{ color: '#475569' }}>
          {data.whale && (
            <span>고래 입금비율: {(data.whale.whaleRatio * 100).toFixed(1)}%</span>
          )}
          {data.miner && (
            <span>채굴자 MPI: {data.miner.mpi.toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* 카드 3: 매매 타이밍 */}
      <div className="p-4 rounded-xl border border-white/8" style={{
        background: '#12121a',
        borderLeft: `3px solid ${timing.color}`,
      }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{timing.icon}</span>
          <span className="text-xs font-semibold tracking-widest" style={{ color: '#64748b' }}>
            매매 타이밍
          </span>
        </div>

        {/* 헤드라인 */}
        <div className="text-xl font-bold mb-1" style={{ color: timing.color }}>
          {timing.headline}
        </div>

        {/* 가격 정보 */}
        {timing.priceInfo && (
          <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: '#94a3b8' }}>
            {timing.priceInfo}
          </div>
        )}

        {/* tradeSetup 추가 정보 — 일반인 언어로 */}
        {data.tradeSetup && data.grade !== 'NO_TRADE' && (
          <div className="mt-2 pt-2 border-t border-white/8 text-xs" style={{ color: '#475569' }}>
            투자금의 {data.tradeSetup.kellyPct?.toFixed(0) ?? '0'}% 권장 · 수익:손실 = {data.tradeSetup.riskRewardRatio.toFixed(1)}:1
          </div>
        )}
      </div>
    </div>
  );
}
