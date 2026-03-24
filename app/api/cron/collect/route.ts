/**
 * QStash 크론 엔드포인트 — 5분 간격 데이터 수집
 * 호출: QStash → POST /api/cron/collect
 * 인증: QStash 서명 헤더 검증
 *
 * 수집 순서:
 * 1. Tier A: Binance 가격/klines + Fear&Greed + Coinbase + Macro + Onchain (병렬)
 * 2. Tier B: TradingView 지표 (/api/indicators.py)
 * 3. Tier B2: 볼린저밴드 자체 계산 (Binance klines 기반)
 * 4. Tier C: Perplexity (30분 TTL 체크 후 선택적 호출)
 * 5. CollectSnapshot 조립 (raw → 처리된 필드)
 * 6. 스코어 계산 → Redis 저장
 * 7. 알림 조건 체크 → Telegram 발송
 */

import { NextRequest, NextResponse } from 'next/server';
import redis, {
  REDIS_KEYS,
  pushScoreHistory,
  updateFreshness,
  cacheGet,
  cacheSet,
} from '@/lib/storage/redis';
import { fetchBinanceData, extractClosePrices } from '@/lib/data-sources/binance';
import { fetchFearGreed } from '@/lib/data-sources/fear-greed';
import { fetchCoinbasePremium } from '@/lib/data-sources/coinbase';
import { fetchMacroData } from '@/lib/data-sources/macro';
import { fetchOnchainData } from '@/lib/data-sources/onchain';
import { fetchPerplexityData } from '@/lib/data-sources/perplexity';
import { calculateBollingerBands } from '@/lib/indicators/bollinger';
import {
  assembleCollectSnapshot,
  fetchTradingViewIndicators,
} from '@/lib/collectors/assemble-snapshot';
import { calculateSignal } from '@/lib/scoring/engine';
import { snapshotToScoringInput, enrichSignalResult } from '@/lib/scoring/adapter';

// Perplexity API 캐시 TTL = 30분 (1800초)
const PERPLEXITY_TTL = 1800;

// 직전 주봉 RSI Redis 키 (50 돌파 감지용)
const PREV_RSI_WEEKLY_KEY = 'btc:cache:rsi_weekly_prev';

export async function POST(req: NextRequest) {
  try {
    // ──────────────────────────────────────────
    // 크론 인증: Vercel Cron Secret 또는 QStash 서명 중 하나 허용
    // Vercel: Authorization: Bearer $CRON_SECRET
    // QStash: upstash-signature 헤더 (향후 실제 검증 추가 가능)
    // ──────────────────────────────────────────
    if (process.env.NODE_ENV === 'production') {
      const cronSecret = process.env.CRON_SECRET;
      const authHeader = req.headers.get('authorization');
      const qstashSig = req.headers.get('upstash-signature');

      // Vercel Cron: Authorization: Bearer <CRON_SECRET>
      const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
      // QStash: upstash-signature 헤더 존재 시 허용 (기본 체크)
      const isQStash = !!qstashSig;

      if (!isVercelCron && !isQStash) {
        return NextResponse.json(
          { error: 'Unauthorized — cron secret or QStash signature required' },
          { status: 401 }
        );
      }
    }

    console.log('[CRON] 5분 데이터 수집 시작 —', new Date().toISOString());

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // ──────────────────────────────────────────
    // Tier A: 핵심 시장 데이터 병렬 수집
    // ──────────────────────────────────────────
    const [binanceResult, fearGreedResult, coinbaseResult, macroResult, onchainResult] =
      await Promise.allSettled([
        fetchBinanceData(),
        fetchFearGreed(),
        fetchCoinbasePremium(),
        fetchMacroData(),
        fetchOnchainData(),
      ]);

    // 결과 추출 + 신선도 업데이트
    const binanceData =
      binanceResult.status === 'fulfilled' ? binanceResult.value : null;
    const fearGreedData =
      fearGreedResult.status === 'fulfilled' ? fearGreedResult.value : null;
    const coinbaseData =
      coinbaseResult.status === 'fulfilled' ? coinbaseResult.value : null;
    const macroData =
      macroResult.status === 'fulfilled' ? macroResult.value : null;
    const onchainData =
      onchainResult.status === 'fulfilled' ? onchainResult.value : null;

    if (binanceData) await updateFreshness('binance');
    else console.error('[CRON] Binance 수집 실패:', binanceResult.status === 'rejected' ? binanceResult.reason : '');

    if (fearGreedData) await updateFreshness('fearGreed');
    if (coinbaseData) await updateFreshness('coinbase');
    if (macroData) await updateFreshness('macro');
    if (onchainData) await updateFreshness('onchain');

    // ──────────────────────────────────────────
    // Tier B: TradingView 지표 (/api/indicators.py)
    // 직전 주봉 RSI는 Redis에서 읽어 50 돌파 감지에 사용
    // ──────────────────────────────────────────
    const prevRsiWeeklyStr = await cacheGet<string>(PREV_RSI_WEEKLY_KEY);
    const prevRsiWeekly = prevRsiWeeklyStr ? parseFloat(String(prevRsiWeeklyStr)) : undefined;

    const tradingViewData = await fetchTradingViewIndicators(baseUrl, prevRsiWeekly);
    await updateFreshness('tradingview');

    // 현재 주봉 RSI를 Redis에 저장 (다음 크론에서 직전값으로 사용)
    await cacheSet(PREV_RSI_WEEKLY_KEY, tradingViewData.rsiWeekly, 3600);

    // ──────────────────────────────────────────
    // Tier B2: 볼린저밴드 자체 계산
    // ──────────────────────────────────────────
    let bollingerData = null;
    if (binanceData?.dailyKlines) {
      try {
        const closes = extractClosePrices(binanceData.dailyKlines);
        bollingerData = calculateBollingerBands(closes);
        await updateFreshness('bollinger');
      } catch (err) {
        console.error('[CRON] 볼린저밴드 계산 실패:', err);
      }
    }

    // ──────────────────────────────────────────
    // Tier C: Perplexity API (30분 캐시 체크)
    // ──────────────────────────────────────────
    let perplexityData = await cacheGet<unknown>(REDIS_KEYS.PERPLEXITY_CACHE);

    if (!perplexityData) {
      try {
        perplexityData = await fetchPerplexityData();
        await cacheSet(REDIS_KEYS.PERPLEXITY_CACHE, perplexityData, PERPLEXITY_TTL);
        await updateFreshness('perplexity');
        console.log('[CRON] Perplexity 신규 수집 완료');
      } catch (err) {
        console.error('[CRON] Perplexity 수집 실패:', err);
      }
    } else {
      console.log('[CRON] Perplexity 캐시 사용 (30분 TTL 미만)');
    }

    // ──────────────────────────────────────────
    // CollectSnapshot 조립
    // raw API 응답 → scoring-engine이 기대하는 처리된 구조로 변환
    // ──────────────────────────────────────────
    const snapshot = assembleCollectSnapshot({
      binance: binanceData,
      fearGreed: fearGreedData,
      coinbase: coinbaseData,
      macro: macroData,
      onchain: onchainData,
      perplexity: perplexityData as import('@/lib/data-sources/perplexity').PerplexityData | null,
      bollinger: bollingerData,
      tradingView: tradingViewData,
    });

    // Redis에 최신 데이터 스냅샷 저장 (1시간 TTL)
    await redis.set(REDIS_KEYS.LATEST_DATA, JSON.stringify(snapshot), {
      ex: 3600,
    });

    // ──────────────────────────────────────────
    // 스코어 계산 (직접 호출 — HTTP 왕복 불필요)
    // ──────────────────────────────────────────
    try {
      // 1. snapshot → ScoringInput 변환
      const input = snapshotToScoringInput(snapshot);

      // 2. 11카테고리 스코어링 엔진 실행
      const signal = calculateSignal(input);

      // 3. UI 전용 필드 추가 (price, rsi, whale, miner, onchain, cycle, dataFreshness)
      const enriched = enrichSignalResult(signal, snapshot);

      // 4. 스코어 히스토리 + 최신 스코어 저장
      await pushScoreHistory(enriched);
      await redis.set(REDIS_KEYS.LATEST_SCORE, JSON.stringify(enriched), {
        ex: 600, // 10분 TTL (5분 크론이 갱신)
      });
      console.log('[CRON] 스코어 저장 완료:', enriched.finalScore, enriched.grade);

      // 5. 알림 조건 체크
      await fetch(`${baseUrl}/api/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: enriched, snapshot }),
      }).catch((err) => console.error('[CRON] 알림 체크 실패:', err));
    } catch (scoreErr) {
      console.error('[CRON] 스코어 계산 오류:', scoreErr);
      // 스코어 실패는 치명적이지 않음 — 다음 크론에서 재시도
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      sources: {
        binance: !!binanceData,
        fearGreed: !!fearGreedData,
        coinbase: !!coinbaseData,
        macro: !!macroData,
        onchain: !!onchainData,
        tradingview: true,
        bollinger: !!bollingerData,
        perplexity: !!perplexityData,
      },
    });
  } catch (error) {
    console.error('[CRON] 크론 실행 오류:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET은 개발용 수동 트리거 (프로덕션에서는 QStash POST만 사용)
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  return POST(
    new NextRequest('http://localhost:3000/api/cron/collect', {
      method: 'POST',
    })
  );
}
