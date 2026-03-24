'use client';

/**
 * 메인 대시보드 페이지
 * 5초마다 /api/data 폴링 → 전체 대시보드 업데이트
 * 모바일 반응형 (텔레그램 알림 → 폰에서 확인 시나리오)
 */

import { useEffect, useState, useCallback } from 'react';
import type { SignalResult } from '@/lib/scoring/types';
import { DashboardSkeleton } from '@/components/Skeleton';
import PriceHeader from '@/components/PriceHeader';
import ScoreGauge from '@/components/ScoreGauge';
import RSIMacroPanel from '@/components/RSIMacroPanel';
import CyclePosition from '@/components/CyclePosition';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import WhalePanel from '@/components/WhalePanel';
import MinerPanel from '@/components/MinerPanel';
import OnchainPanel from '@/components/OnchainPanel';
import TradeSetup from '@/components/TradeSetup';
import AlertHistory from '@/components/AlertHistory';
import DataFreshness from '@/components/DataFreshness';

// 폴링 간격 (5초)
const POLL_INTERVAL_MS = 5000;

export default function DashboardPage() {
  // 스코어링 결과 상태
  const [data, setData] = useState<SignalResult | null>(null);
  // 로딩 상태 (최초 1회만)
  const [loading, setLoading] = useState(true);
  // 오류 메시지
  const [error, setError] = useState<string | null>(null);
  // 마지막 폴링 시각
  const [lastPolled, setLastPolled] = useState<Date | null>(null);

  // ─── /api/data 폴링 함수 ───
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error ?? '데이터 없음');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결 오류');
    } finally {
      setLoading(false);
      setLastPolled(new Date());
    }
  }, []);

  // ─── 마운트 시 즉시 로드 + 5초마다 폴링 ───
  useEffect(() => {
    fetchData(); // 최초 즉시 로드

    const timer = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(timer); // 언마운트 시 정리
  }, [fetchData]);

  // ─── 최초 로딩 중 ───
  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-6">
        <DashboardSkeleton />
      </main>
    );
  }

  // ─── 오류 상태 ───
  if (error && !data) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-center min-h-screen">
        <div className="text-center p-8 rounded-xl border border-red-500/20"
             style={{ background: 'rgba(239,68,68,0.05)' }}>
          <div className="text-2xl mb-3">⚠️</div>
          <p className="text-sm text-red-400 mb-2">데이터 로드 실패</p>
          <p className="text-xs" style={{ color: '#64748b' }}>{error}</p>
          <button
            className="mt-4 px-4 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            onClick={fetchData}
          >
            재시도
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main className="max-w-7xl mx-auto px-3 py-4 space-y-4">
      {/* ─── 상단 바: 타이틀 + 상태 표시 ─── */}
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xs font-bold tracking-widest uppercase"
            style={{ color: '#94a3b8' }}>
          BTC 시그널 모니터
        </h1>
        <div className="flex items-center gap-2">
          {/* 오류 표시 (데이터는 있지만 폴링 오류) */}
          {error && (
            <span className="text-xs text-amber-400">⚠ 폴링 오류</span>
          )}
          {/* 마지막 폴링 시각 */}
          {lastPolled && (
            <span className="text-xs tabular-nums" style={{ color: '#475569' }}>
              {lastPolled.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} 갱신
            </span>
          )}
          {/* 히스토리 링크 */}
          <a href="/history"
             className="text-xs px-2 py-1 rounded"
             style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
            히스토리
          </a>
        </div>
      </div>

      {/* ─── 1행: PriceHeader ─── */}
      <PriceHeader
        data={{
          // price/priceChange24h는 optional — 없으면 0으로 폴백
          price: data.price ?? 0,
          priceChange24h: data.priceChange24h ?? 0,
          timestamp: data.timestamp,
        }}
      />

      {/* ─── 2행: ScoreGauge / RSIMacroPanel / CyclePosition ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreGauge
          data={{
            finalScore: data.finalScore,
            grade: data.grade,
            confidence: data.confidence,
            sigma: data.sigma,
            rsiMacroBonus: data.rsiMacroBonus,
            fibConfluenceBonus: data.fibConfluenceBonus,
          }}
        />
        {/* rsi/cycle은 optional — 없으면 패널 숨김 */}
        {data.rsi && <RSIMacroPanel rsi={data.rsi} />}
        {data.cycle && <CyclePosition cycle={data.cycle} currentPrice={data.price ?? 0} />}
      </div>

      {/* ─── 3행: CategoryBreakdown (전체 너비) ─── */}
      <CategoryBreakdown categories={data.categories} />

      {/* ─── 4행: WhalePanel / MinerPanel / OnchainPanel ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* whale/miner/onchain은 optional — 없으면 패널 숨김 */}
        {data.whale && <WhalePanel whale={data.whale} />}
        {data.miner && <MinerPanel miner={data.miner} />}
        {data.onchain && <OnchainPanel onchain={data.onchain} currentPrice={data.price ?? 0} />}
      </div>

      {/* ─── 5행: TradeSetup (전체 너비, tradeSetup optional) ─── */}
      {data.tradeSetup && (
        <TradeSetup
          setup={data.tradeSetup}
          grade={data.grade}
          finalScore={data.finalScore}
        />
      )}

      {/* ─── 6행: AlertHistory / DataFreshness ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* alertHistory/dataFreshness optional — 없으면 빈 배열로 폴백 */}
        <AlertHistory alerts={data.alertHistory ?? []} />
        <DataFreshness sources={data.dataFreshness ?? []} />
      </div>

      {/* ─── 하단 여백 ─── */}
      <div className="h-8" />
    </main>
  );
}
