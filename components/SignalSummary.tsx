'use client';

/**
 * SignalSummary — 3장 요약 카드 (라이트 핀테크 스타일)
 * 레퍼런스: interfacely 핀테크 카드 — 둥근 모서리 + 연한 배경 + 아이콘
 */

import type { SignalResult } from '@/lib/scoring/types';
import { getMarketTemp, getBigPlayerSummary, getTimingSummary } from '@/lib/verdict';

interface Props {
  data: SignalResult;
}

export default function SignalSummary({ data }: Props) {
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
      <div className="card-fintech p-5" style={{ borderLeft: `4px solid ${marketTemp.color}` }}>
        <div className="text-xs font-semibold tracking-wider mb-3" style={{ color: '#9098b1' }}>
          시장 온도
        </div>

        <div className="text-xl font-bold mb-1.5" style={{ color: '#1a1d2e' }}>
          {marketTemp.temp}
        </div>

        <p className="text-xs leading-relaxed mb-2" style={{ color: '#5b6178' }}>
          {marketTemp.desc}
        </p>

        {data.rsi && (
          <div className="flex gap-3 text-xs tabular-nums" style={{ color: '#9098b1' }}>
            <span>일봉 {data.rsi.daily.toFixed(0)}</span>
            <span>주봉 {data.rsi.weekly.toFixed(0)}</span>
            <span>월봉 {data.rsi.monthly.toFixed(0)}</span>
          </div>
        )}

        {marketTemp.cycleNote && (
          <div className="mt-2 pt-2 text-xs" style={{ borderTop: '1px solid #f0f2f5', color: '#9098b1' }}>
            {marketTemp.cycleNote}
          </div>
        )}
      </div>

      {/* 카드 2: 큰손 동향 */}
      <div className="card-fintech p-5" style={{ borderLeft: `4px solid ${bigPlayer.color}` }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{bigPlayer.icon}</span>
          <span className="text-xs font-semibold tracking-wider" style={{ color: '#9098b1' }}>
            큰손 동향
          </span>
        </div>

        <div className="text-xl font-bold mb-1.5" style={{ color: '#1a1d2e' }}>
          {bigPlayer.headline}
        </div>

        <p className="text-xs leading-relaxed mb-2" style={{ color: '#5b6178' }}>
          {bigPlayer.desc}
        </p>

        <div className="flex flex-col gap-1 text-xs" style={{ color: '#9098b1' }}>
          {/* 고래: 원시 수치 대신 의미 있는 해석 표시 */}
          {data.whale && data.whale.whaleRatio > 0 ? (
            <span>
              {data.whale.whaleRatio >= 0.6 ? '⚠️ 거래소 대량 입금 — 매도 압력 높음'
                : data.whale.whaleRatio >= 0.4 ? '⚡ 거래소 입금 증가 — 주의 필요'
                : data.whale.whaleRatio >= 0.2 ? '✅ 정상 수준 — 특이사항 없음'
                : '💰 거래소 입금 매우 적음 — 축적 신호'}
            </span>
          ) : (
            <span>🔄 고래 데이터 수집 대기 중</span>
          )}

          {/* 채굴자: 원시 수치 대신 해석 */}
          {data.miner && (data.miner.mpi !== 0 || data.miner.hashribbon) ? (
            <span>
              {data.miner.hashribbon ? '⛏️ 채굴자 항복 중 — 역사적 바닥 신호'
                : data.miner.mpi >= 2 ? '⚠️ 채굴자 대량 매도 중'
                : data.miner.mpi >= 0.5 ? '⛏️ 채굴자 일부 매도'
                : data.miner.mpi <= -0.5 ? '💎 채굴자 보유 중 — 강세 신호'
                : '⛏️ 채굴자 중립'}
            </span>
          ) : (
            <span>🔄 채굴자 데이터 수집 대기 중</span>
          )}
        </div>
      </div>

      {/* 카드 3: 매매 타이밍 */}
      <div className="card-fintech p-5" style={{ borderLeft: `4px solid ${timing.color}` }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{timing.icon}</span>
          <span className="text-xs font-semibold tracking-wider" style={{ color: '#9098b1' }}>
            매매 타이밍
          </span>
        </div>

        <div className="text-xl font-bold mb-1.5" style={{ color: '#1a1d2e' }}>
          {timing.headline}
        </div>

        {timing.priceInfo && (
          <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: '#5b6178' }}>
            {timing.priceInfo}
          </div>
        )}

        {data.tradeSetup && data.grade !== 'NO_TRADE' && (
          <div className="mt-2 pt-2 text-xs" style={{ borderTop: '1px solid #f0f2f5', color: '#9098b1' }}>
            투자금의 {data.tradeSetup.kellyPct?.toFixed(0) ?? '0'}% 권장 · 수익:손실 = {data.tradeSetup.riskRewardRatio.toFixed(1)}:1
          </div>
        )}
      </div>
    </div>
  );
}
