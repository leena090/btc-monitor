'use client';

/**
 * 메인 대시보드 페이지 — 3-Tier Progressive Disclosure
 *
 * Tier 1: HeroVerdict — "사야 하나 말아야 하나" 3초 판단
 * Tier 2: SignalSummary — 시장온도 / 큰손동향 / 매매타이밍 3장 카드
 * Tier 3: DetailAccordion — 기존 11카테고리 + 상세 패널 (접이식)
 *
 * 50대 퇴직금 투자자가 화면 열자마자 판단 가능하도록 설계
 * 5초마다 /api/data 폴링
 */

import { useEffect, useState, useCallback } from 'react';
import type { SignalResult } from '@/lib/scoring/types';
import { DashboardSkeleton } from '@/components/Skeleton';
import PriceHeader from '@/components/PriceHeader';
import HeroVerdict from '@/components/HeroVerdict';
import SignalSummary from '@/components/SignalSummary';
import DetailAccordion, { AccordionSection } from '@/components/DetailAccordion';
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
      <main className="max-w-3xl mx-auto px-4 py-6">
        <DashboardSkeleton />
      </main>
    );
  }

  // ─── 오류 상태 ───
  if (error && !data) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-center min-h-screen">
        <div className="card-fintech text-center p-8">
          <div className="text-2xl mb-3">⚠️</div>
          <p className="text-sm font-semibold mb-2" style={{ color: '#ef4444' }}>데이터 로드 실패</p>
          <p className="text-xs mb-4" style={{ color: '#9098b1' }}>{error}</p>
          <button
            className="px-4 py-2 rounded-xl text-xs font-medium"
            style={{ background: '#ef444412', color: '#ef4444' }}
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
    <main className="max-w-3xl mx-auto px-3 py-4 space-y-4">
      {/* ─── 상단 바: 타이틀 + 상태 표시 ─── */}
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xs font-bold tracking-widest uppercase"
            style={{ color: '#9098b1' }}>
          BTC 시그널 모니터
        </h1>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs" style={{ color: '#f59e0b' }}>⚠ 폴링 오류</span>
          )}
          {lastPolled && (
            <span className="text-xs tabular-nums" style={{ color: '#9098b1' }}>
              {lastPolled.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} 갱신
            </span>
          )}
          <a href="/history"
             className="text-xs px-3 py-1.5 rounded-full font-medium"
             style={{ background: '#7c5cfc15', color: '#7c5cfc' }}>
            히스토리
          </a>
        </div>
      </div>

      {/* ═══ Tier 0: 현재 가격 ═══ */}
      <PriceHeader
        data={{
          price: data.price ?? 0,
          priceChange24h: data.priceChange24h ?? 0,
          timestamp: data.timestamp,
        }}
      />

      {/* ═══ Tier 1: HeroVerdict — 3초 투자 판단 (화면의 주인공) ═══ */}
      <HeroVerdict
        data={{
          finalScore: data.finalScore,
          grade: data.grade,
          confidence: data.confidence,
          sigma: data.sigma,
          rsiMacroBonus: data.rsiMacroBonus,
          fibConfluenceBonus: data.fibConfluenceBonus,
          direction: data.direction,
        }}
      />

      {/* ═══ Tier 2: SignalSummary — 3장 요약 카드 ═══ */}
      <SignalSummary data={data} />

      {/* ═══ Tier 3: 상세 분석 (접이식 아코디언) ═══ */}
      <DetailAccordion>
        {/* 매매 셋업 (있을 때만) */}
        {data.tradeSetup && (
          <AccordionSection title="트레이드 셋업" icon="📊" subtitle="진입/손절/목표가">
            <TradeSetup
              setup={data.tradeSetup}
              grade={data.grade}
              finalScore={data.finalScore}
            />
          </AccordionSection>
        )}

        {/* 11카테고리 분석 */}
        <AccordionSection title="11카테고리 분석" icon="📋" subtitle="원점수 · 가중치 · 기여도">
          <CategoryBreakdown categories={data.categories} />
        </AccordionSection>

        {/* 점수 게이지 + RSI + 사이클 */}
        <AccordionSection title="기술적 지표" icon="📈" subtitle="RSI · 사이클 · 점수 상세">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
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
            {data.rsi && <RSIMacroPanel rsi={data.rsi} />}
            {data.cycle && <CyclePosition cycle={data.cycle} currentPrice={data.price ?? 0} />}
          </div>
        </AccordionSection>

        {/* 고래 + 채굴자 + 온체인 */}
        {(data.whale || data.miner || data.onchain) && (
          <AccordionSection title="온체인 분석" icon="🔗" subtitle="고래 · 채굴자 · 온체인">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
              {data.whale && <WhalePanel whale={data.whale} />}
              {data.miner && <MinerPanel miner={data.miner} />}
              {data.onchain && <OnchainPanel onchain={data.onchain} currentPrice={data.price ?? 0} />}
            </div>
          </AccordionSection>
        )}

        {/* 알림 히스토리 + 데이터 신선도 */}
        <AccordionSection title="시스템 상태" icon="🔔" subtitle="알림 · 데이터 신선도">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <AlertHistory alerts={data.alertHistory ?? []} />
            <DataFreshness sources={data.dataFreshness ?? []} />
          </div>
        </AccordionSection>
      </DetailAccordion>

      {/* ─── 하단 여백 ─── */}
      <div className="h-8" />
    </main>
  );
}
