/**
 * 모의 데이터 — Redis 연결 전 UI 개발용 폴백
 * 실제 배포 시 Redis에서 읽어온 데이터로 교체됨
 */

import type { SignalResult } from './scoring/types';

export function getMockSignalResult(): SignalResult {
  const now = new Date().toISOString();

  return {
    // ─── 기본 스코어 ───
    baseScore: 62,
    rsiMacroBonus: 6,          // ★ RSI 바닥 시그널
    fibConfluenceBonus: 0,
    finalScore: 68,
    sigma: 2.8,
    grade: 'B',
    direction: 'LONG',
    confidence: 'medium',

    // ─── 가격 ───
    price: 83420,
    priceChange24h: -2.14,

    // ─── 11카테고리 ───
    categories: [
      { id: 1, key: 'priceAction',  name: '가격 액션 & 추세',   weight: 0.12, rawScore:  3, weightedScore:  0.36, details: ['MA200 지지', '일봉 MACD 약세'], dataFreshness: now },
      { id: 2, key: 'rsiMacro',     name: 'RSI 매크로 사이클', weight: 0.08, rawScore:  6, weightedScore:  0.48, details: ['주봉 RSI 42 (40~50 구간)', '월봉 RSI 44 (>40 레짐)'], dataFreshness: now },
      { id: 3, key: 'derivatives',  name: '파생상품 + 청산',   weight: 0.15, rawScore:  2, weightedScore:  0.30, details: ['펀딩비 -0.01%', 'OI 보합'], dataFreshness: now },
      { id: 4, key: 'optionsGex',   name: '옵션 시장 GEX',     weight: 0.10, rawScore:  1, weightedScore:  0.10, details: ['Put/Call ratio 0.85', 'GEX 중립'], dataFreshness: now },
      { id: 5, key: 'etfFlows',     name: 'ETF 유출입 + 베이시스', weight: 0.10, rawScore: -1, weightedScore: -0.10, details: ['Farside 소폭 유출', '베이시스 양수'], dataFreshness: now },
      { id: 6, key: 'cvdVolume',    name: 'CVD + 거래량 구조', weight: 0.08, rawScore: -2, weightedScore: -0.16, details: ['CVD 하락', '거래량 감소 추세'], dataFreshness: now },
      { id: 7, key: 'onchain',      name: '온체인',            weight: 0.12, rawScore:  4, weightedScore:  0.48, details: ['MVRV 0.95 (공정가치 이하)', 'STH 원가 81200'], dataFreshness: now },
      { id: 8, key: 'macro',        name: '매크로 오버레이',   weight: 0.08, rawScore: -3, weightedScore: -0.24, details: ['DXY 강세', 'SPX 조정 중'], dataFreshness: now },
      { id: 9, key: 'cycleFib',     name: '4년 사이클 + 피보나치', weight: 0.07, rawScore: 3, weightedScore: 0.21, details: ['반감기 후 23개월', '0.382 근처'], dataFreshness: now },
      { id: 10, key: 'fundFlows',   name: '자금 흐름',         weight: 0.06, rawScore:  2, weightedScore:  0.12, details: ['스테이블코인 증가', '코인베이스 프리미엄 양수'], dataFreshness: now },
      { id: 11, key: 'crowdContra', name: '군중 역발상',       weight: 0.04, rawScore:  5, weightedScore:  0.20, details: ['공포탐욕 28 (Extreme Fear)', '소셜 부정 80%'], dataFreshness: now },
    ],

    // ─── RSI 데이터 ───
    rsi: {
      daily: 41.2,
      weekly: 42.0,
      monthly: 44.5,
      regime: 'bull',
      macroBonus: 6,
      macroStatus: '★ RSI 매크로 바닥 시그널 — 주봉 RSI 40~50 + 월봉 >40',
      historyCases: [
        '2020.03: 주봉 RSI 40→50 돌파 → +312% (17개월)',
        '2019.01: 동일 패턴 → +263% (12개월)',
        '2018.12: 바닥 확인 → +1,600% (23개월)',
        '2015.01: 패턴 진입 → +7,500% (35개월)',
        '2022.11: 패턴 진입 → +450% (17개월)',
      ],
    },

    // ─── 고래 데이터 ───
    whale: {
      exchangeInflow: 4820,
      whaleRatio: 0.32,
      whaleRatioChange: -0.04,
      interpretation: '거래소 입금 감소 추세 — 매도 압력 완화 신호',
      direction: 'neutral' as const,
    },

    // ─── 채굴자 데이터 ───
    miner: {
      outflow: 1250,
      mpi: -0.3,
      reserve: 1850000,
      hashribbon: false,
      hashrate: 780,
    },

    // ─── 온체인 데이터 ───
    onchain: {
      mvrv: 0.95,
      mvrvStatus: 'undervalued',
      sthRealizedPrice: 81200,
      exchangeReserve: 2340000,
      exchangeReserveTrend: 'down',
    },

    // ─── 사이클 포지션 ───
    cycle: {
      monthsSinceHalving: 23,
      phase: 'late_cycle',
      phaseLabel: '후기/조정',
      fibLevel: '0.382 근처',
      fibScore: 1,
      athDrawdown: 33.9,
      nextHalvingDate: '2028-04-01T00:00:00.000Z',
      daysUntilNextHalving: 738,
    },

    // ─── 트레이드 셋업 ───
    tradeSetup: {
      direction: 'LONG',
      entryZone: { low: 80000, high: 85000 },
      stopLoss: 76500,
      tp1: 92000,
      tp2: 100000,
      tp3: 110000,
      kellyPct: 8,                  // Half-Kelly 8%
      kellyFraction: 0.08,          // 소수 형태 (kellyPct/100)
      expectedValue: 3.2,           // EV +3.2%
      riskRewardRatio: 2.1,         // 손익비 2.1:1
      waitConditions: [],
      rationale: 'RSI 매크로 바닥 시그널 + Fib 0.382 지지 + MVRV 공정가치 이하',
      timeExit7d: '50% 청산 후 관망 또는 손절선 강화 검토',
      timeExit14d: '전량 청산 권고 — 시나리오 무효 가능성',
    },

    // ─── 메타 ───
    timestamp: now,

    // ─── 알림 히스토리 ───
    alertHistory: [
      { id: '1', type: 'rsi_bottom',    message: '★ RSI 매크로 바닥 시그널 — 주봉 42.0 (40~50구간)',     timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), severity: 'critical' },
      { id: '2', type: 'grade_change',  message: '📊 등급 변경: C → B (68점)',                           timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), severity: 'warning' },
      { id: '3', type: 'extreme_fear',  message: '🟢 극단적 공포 28 — 역발상 매수 구간',                 timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), severity: 'info' },
      { id: '4', type: 'price_spike',   message: '⚡ 급락 -5.2% (24h) — BTC $83,420',                   timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), severity: 'warning' },
      { id: '5', type: 'mvrv_bottom',   message: '📉 MVRV 0.95 — 공정가치 이하 진입',                   timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), severity: 'info' },
      { id: '6', type: 'score_change',  message: '📊 스코어 급변: 55 → 68 (+13점)',                      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(), severity: 'info' },
      { id: '7', type: 'whale_inflow',  message: '🐋 고래 거래소 입금 감소 — 매도 압력 완화',           timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), severity: 'info' },
      { id: '8', type: 'funding_extreme', message: '💰 펀딩비 -0.08% — 과도한 숏 쏠림',                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), severity: 'warning' },
    ],

    // ─── 데이터 신선도 ───
    dataFreshness: [
      { source: 'Binance',       label: 'BTC 가격 / 거래량',    lastUpdated: new Date(Date.now() - 1000 * 60 * 2).toISOString(),  updateFreq: '5분' },
      { source: 'Fear&Greed',    label: '공포탐욕 지수',         lastUpdated: new Date(Date.now() - 1000 * 60 * 5).toISOString(),  updateFreq: '5분' },
      { source: 'TradingView',   label: 'RSI / MACD / MA',      lastUpdated: new Date(Date.now() - 1000 * 60 * 7).toISOString(),  updateFreq: '5분' },
      { source: 'Perplexity',    label: 'OI / 펀딩비 / ETF',    lastUpdated: new Date(Date.now() - 1000 * 60 * 35).toISOString(), updateFreq: '30분' },
      { source: 'Blockchain.com', label: '거래소 보유량 / 해시레이트', lastUpdated: new Date(Date.now() - 1000 * 60 * 18).toISOString(), updateFreq: '15분' },
      { source: 'CoinGecko',     label: '스테이블코인 시총',     lastUpdated: new Date(Date.now() - 1000 * 60 * 12).toISOString(), updateFreq: '15분' },
      { source: 'Cycle Data',    label: '반감기 / 피보나치',     lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), updateFreq: '월 1회' },
    ],
  };
}
