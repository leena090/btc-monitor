/**
 * 스코어링 엔진 핵심 타입 정의
 * btc-50b 스킬 v5 FINAL 기준 — signal-scoring-algorithm.md 1:1 포팅
 */

// ─────────────────────────────────────────────
// 확신도 등급 타입 + UI 상수
// ─────────────────────────────────────────────
export type Grade = 'S' | 'A' | 'B' | 'C' | 'NO_TRADE' | 'F';

/** 등급별 UI 색상 (Bloomberg Terminal 스타일) */
export const GRADE_COLORS: Record<Grade, string> = {
  S:        '#00ff88',  // 네온 그린 — 최고 등급
  A:        '#4ade80',  // 밝은 초록
  B:        '#f59e0b',  // 황금색
  C:        '#fb923c',  // 주황
  NO_TRADE: '#6b7280',  // 회색
  F:        '#ef4444',  // 빨강 — 역신호
};

/** 등급별 한국어 레이블 */
export const GRADE_LABELS: Record<Grade, string> = {
  S:        'S — 최대 포지션',
  A:        'A — 표준 진입',
  B:        'B — 반 포지션',
  C:        'C — 관망',
  NO_TRADE: '⛔ NO TRADE',
  F:        'F — 역신호',
};

// ─────────────────────────────────────────────
// 카테고리 개별 점수 결과
// ─────────────────────────────────────────────
export interface CategoryScore {
  /** 카테고리 번호 (1~11) */
  id: number;
  /** 카테고리 식별 키 (영문, camelCase) */
  key?: string;
  /** 카테고리 이름 (한국어) */
  name: string;
  /** 가중치 (0.04 ~ 0.15) — 전체 합계 = 1.0 */
  weight: number;
  /** 원점수 (-10 ~ +10) — 각 서브항목 합산 후 정규화 */
  rawScore: number;
  /** 가중 점수 = rawScore × weight */
  weightedScore: number;
  /** 각 서브항목별 계산 근거 (한국어 설명) */
  details: string[];
  /** 해당 카테고리 데이터의 최신성 (ISO string 또는 Date) */
  dataFreshness: Date | string;
}

// ─────────────────────────────────────────────
// UI 전용 서브 데이터 타입 (대시보드 패널용)
// ─────────────────────────────────────────────

/** RSI 대시보드 패널 데이터 */
export interface RsiData {
  daily: number;
  weekly: number;
  monthly: number;
  regime: 'bull' | 'bear' | 'neutral';
  macroBonus: number;
  macroStatus: string;
  historyCases?: string[];
}

/** 고래 움직임 패널 데이터 */
export interface WhaleData {
  exchangeInflow: number;
  whaleRatio: number;
  whaleRatioChange: number;
  interpretation: string;
  direction: 'sell' | 'buy' | 'neutral';
}

/** 채굴자 움직임 패널 데이터 */
export interface MinerData {
  outflow: number;
  mpi: number;
  reserve: number;
  hashribbon: boolean;
  hashrate: number;
}

/** 온체인 종합 패널 데이터 */
export interface OnchainData {
  mvrv: number;
  mvrvStatus: 'undervalued' | 'fair' | 'overvalued' | 'bubble';
  sthRealizedPrice: number;
  exchangeReserve: number;
  exchangeReserveTrend: 'down' | 'up' | 'flat';
}

/** 반감기 사이클 + 피보나치 패널 데이터 */
export interface CycleData {
  monthsSinceHalving: number;
  phase: 'accumulation' | 'bull_run' | 'late_cycle' | 'bear_bottom';
  phaseLabel: string;
  fibLevel: string;
  fibScore: number;
  athDrawdown: number;
  nextHalvingDate: string;
  daysUntilNextHalving: number;
}

/** 알림 히스토리 항목 */
export interface AlertHistoryItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
}

/** 데이터 소스 신선도 항목 */
export interface DataFreshnessItem {
  source: string;
  label: string;
  lastUpdated: string;
  updateFreq: string;
}

/** API /api/data 응답 타입 */
export interface ApiDataResponse {
  success: boolean;
  data: SignalResult | null;
  error?: string;
}

// ─────────────────────────────────────────────
// 트레이드 셋업 카드
// ─────────────────────────────────────────────
export interface TradeSetup {
  /** 방향: 롱 또는 숏 */
  direction: 'LONG' | 'SHORT';
  /** 진입 존 {low, high} (현재가 ±1%) */
  entryZone: { low: number; high: number };
  /** 손절가 (MA200 -3% 또는 Fib 0.786) */
  stopLoss: number;
  /** 1차 목표가 — Fib 0.382 방향 */
  tp1: number;
  /** 2차 목표가 — Fib 0.236 방향 */
  tp2: number;
  /** 3차 목표가 — ATH 방향 */
  tp3: number;
  /** Half-Kelly 포지션 비율 (%) */
  kellyPct: number;
  /** Half-Kelly 포지션 소수 비율 (0~1, kellyPct/100과 동일) */
  kellyFraction?: number;
  /** 기대값 (Expected Value, %) */
  expectedValue: number;
  /** 손익비 (TP1 기준) */
  riskRewardRatio: number;
  /** 진입 대기 조건 목록 (NO_TRADE 시 사용) */
  waitConditions?: string[];
  /** 진입 근거 요약 */
  rationale?: string;
  /** 7일 TP1 미도달 시 권고 액션 */
  timeExit7d: string;
  /** 14일 TP1 미도달 시 권고 액션 */
  timeExit14d: string;
}

// ─────────────────────────────────────────────
// 최종 시그널 결과
// ─────────────────────────────────────────────
export interface SignalResult {
  /** 정규화된 기본 점수 (0~100) — 보너스 적용 전 */
  baseScore: number;
  /** RSI 매크로 보너스 (0 / +6 / +8) */
  rsiMacroBonus: number;
  /** 피보나치 컨플루언스 보너스 (0 / +4) */
  fibConfluenceBonus: number;
  /** 최종 점수 = min(baseScore + rsiMacroBonus + fibConfluenceBonus, 100) */
  finalScore: number;
  /** 11개 카테고리 rawScore의 표준편차 (분산도) */
  sigma: number;
  /** 신뢰도 등급 (영문 — UI 표기는 한국어로 변환) */
  confidence: 'high' | 'medium' | 'low';
  /** 확신도 등급 (σ > 4.0이면 1단계 하향) */
  grade: 'S' | 'A' | 'B' | 'C' | 'NO_TRADE' | 'F';
  /** 매매 방향 */
  direction: 'LONG' | 'SHORT' | 'WAIT' | 'NO_TRADE';
  /** NO TRADE 이유 (해당 시) */
  noTradeReason?: string;
  /** 11개 카테고리 점수 상세 */
  categories: CategoryScore[];
  /** RSI 매크로 알림 메시지 (해당 시) */
  rsiAlert?: string;
  /** 트레이드 셋업 카드 (등급 B 이상, NO TRADE가 아닐 때만) */
  tradeSetup?: TradeSetup;
  /** 계산 시각 (ISO string 또는 Date) */
  timestamp: Date | string;

  // ─── UI 확장 필드 (대시보드 패널용, 선택적) ───
  /** 현재 BTC 가격 */
  price?: number;
  /** 24h 가격 변동률 (%) */
  priceChange24h?: number;
  /** RSI 대시보드 데이터 */
  rsi?: RsiData;
  /** 고래 움직임 데이터 */
  whale?: WhaleData;
  /** 채굴자 움직임 데이터 */
  miner?: MinerData;
  /** 온체인 종합 데이터 */
  onchain?: OnchainData;
  /** 반감기 사이클 + 피보나치 데이터 */
  cycle?: CycleData;
  /** 최근 알림 히스토리 */
  alertHistory?: AlertHistoryItem[];
  /** 데이터 소스 신선도 목록 */
  dataFreshness?: DataFreshnessItem[];
}

// ─────────────────────────────────────────────
// 카테고리별 입력 데이터 타입
// ─────────────────────────────────────────────

/** Cat1: 가격 액션 & 추세 입력 데이터 */
export interface PriceActionInput {
  currentPrice: number;
  ma20: number;
  ma50: number;
  ma100: number;
  ma200: number;
  /** MA 기울기 (상승=true, 하락=false) */
  ma20Rising: boolean;
  ma50Rising: boolean;
  ma200Rising: boolean;
  adx: number;
  /** ADX 기준 추세 방향 (상승=true, 하락=false) */
  adxTrendUp: boolean;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  /** CME 갭 방향: 'above'=현재가 위, 'below'=현재가 아래, 'none'=없음 */
  cmeGap: 'above' | 'below' | 'none';
  dataFreshness: Date;
}

/** Cat2: RSI 매크로 사이클 입력 데이터 */
export interface RsiMacroInput {
  /** 일봉 RSI(14) */
  rsiDaily: number;
  /** 주봉 RSI(14) */
  rsiWeekly: number;
  /** 월봉 RSI(14) */
  rsiMonthly: number;
  /** 직전 주봉 RSI (50 돌파 여부 확인용) */
  rsiWeeklyPrev: number;
  dataFreshness: Date;
}

/** Cat3: 파생상품 + 청산 입력 데이터 */
export interface DerivativesInput {
  /** 펀딩비 (%) */
  fundingRate: number;
  /** 미결제약정 변화율 (24h %) */
  oiChangePercent: number;
  /** 가격 방향 (상승=true, 하락=false) */
  priceUp: boolean;
  /** 현재가 위 숏 청산 클러스터 ($M 단위) */
  shortLiquidationAbove: number;
  /** 현재가 아래 롱 청산 클러스터 ($M 단위) */
  longLiquidationBelow: number;
  /** 탑 트레이더 롱 비율 (%) */
  topTraderLongPct: number;
  dataFreshness: Date;
}

/** Cat4: 옵션 시장 GEX 입력 데이터 */
export interface OptionsGexInput {
  /** 딜러 넷 감마 방향: 'positive'=양, 'negative'=음, 'neutral'=중립 */
  dealerNetGamma: 'positive' | 'negative' | 'neutral';
  /** 감마 월 가격 */
  gammaWallPrice: number;
  currentPrice: number;
  putCallRatio: number;
  maxPainPrice: number;
  /** 만기까지 남은 시간 (시간 단위) */
  expiryHoursRemaining: number;
  dataFreshness: Date;
}

/** Cat5: ETF 유출입 + 베이시스 입력 데이터 */
export interface EtfFlowsInput {
  /** ETF 7일 누적 순유입 ($M 단위, 음수=유출) */
  etf7dNetFlowM: number;
  /** CME 선물가 */
  cmePrice: number;
  /** 현물가 */
  spotPrice: number;
  /** CME 선물 만기까지 남은 일수 */
  cmeDaysToExpiry: number;
  dataFreshness: Date;
}

/** Cat6: CVD + 거래량 구조 입력 데이터 */
export interface CvdInput {
  /** 현물 CVD 방향 (상승=true, 하락=false) */
  spotCvdUp: boolean;
  /** 파생 CVD 방향 (상승=true, 하락=false) */
  derivativeCvdUp: boolean;
  /** 가격 방향 (상승=true, 하락=false) */
  priceUp: boolean;
  /** 현물 CVD 강도 (0=약, 1=보통, 2=강) */
  spotCvdStrength: 0 | 1 | 2;
  /** 파생 CVD 강도 (0=약, 1=보통, 2=강) */
  derivativeCvdStrength: 0 | 1 | 2;
  /** 거래량 이상 여부 (2=급증, 1=보통, 0=감소) */
  volumeAnomaly: 0 | 1 | 2;
  dataFreshness: Date;
}

/** Cat7: 온체인 강화 입력 데이터 */
export interface OnchainInput {
  /** MVRV 비율 */
  mvrv: number;
  /** 단기 보유자(STH) 원가 */
  sthCostBasis: number;
  currentPrice: number;
  /** 거래소 BTC 보유량 30일 변화율 (%) */
  exchangeReserveChange30d: number;
  /** 해시리본 상태: 'pink'=핑크존(채굴자 항복), 'normal'=정상, 'cross'=크로스 직후 */
  hashRibbonStatus: 'pink' | 'normal' | 'cross';
  /** Days Destroyed 이상 여부 (역사적 상위 10%=true) */
  daysDestroyedAnomaly: boolean;
  dataFreshness: Date;
}

/** Cat8: 매크로 오버레이 입력 데이터 */
export interface MacroInput {
  /** DXY MA50 대비 상태: 'break_up'=상향돌파, 'break_down'=하향돌파, 'uptrend'=상승추세, 'downtrend'=하락추세, 'sideways'=횡보 */
  dxyStatus: 'break_up' | 'break_down' | 'uptrend' | 'downtrend' | 'sideways';
  /** 10Y 실질금리 (TIPS, %) */
  realYield: number;
  /** 실질금리 추세: 'rising'=상승, 'falling'=하락, 'sideways'=횡보 */
  realYieldTrend: 'rising' | 'falling' | 'sideways';
  /** SPX-BTC 30일 상관관계 */
  spxBtcCorrelation: number;
  /** SPX 추세 방향 (상승=true, 하락=false) */
  spxTrendUp: boolean;
  /** 연준 금리 사이클: 'cutting'=인하중, 'cut_start'=인하시작, 'hold'=동결, 'hiking'=인상중 */
  fedCycle: 'cutting' | 'cut_start' | 'hold' | 'hiking';
  dataFreshness: Date;
}

/** Cat9: 4년 사이클 + 피보나치 입력 데이터 */
export interface CycleFibInput {
  /** 마지막 반감기 이후 경과 개월 수 */
  monthsSinceHalving: number;
  /** 현재가 */
  currentPrice: number;
  /** 사이클 ATH (현재 사이클 최고가) */
  cycleHigh: number;
  /** 사이클 시작 저점 (파동 시작점) */
  cycleLow: number;
  /** ATH 대비 하락률 (%) */
  drawdownFromAth: number;
  dataFreshness: Date;
}

/** Cat10: 자금 흐름 입력 데이터 */
export interface FundFlowsInput {
  /** 스테이블코인 총 시총 30일 추세: 'up'=증가, 'down'=감소, 'flat'=횡보 */
  stablecoinTrend: 'up' | 'down' | 'flat';
  /** 코인베이스 프리미엄 (%) */
  coinbasePremium: number;
  /** 코인베이스 프리미엄 추세: 'rising'=증가, 'falling'=감소 */
  coinbasePremiumTrend: 'rising' | 'falling' | 'flat';
  dataFreshness: Date;
}

/** Cat11: 군중 역발상 입력 데이터 */
export interface CrowdInput {
  /** 공포탐욕 지수 (0~100) */
  fearGreedIndex: number;
  /** 네이버 검색량 이상 여부 (역대 상위 20%=true) */
  naverSearchAnomaly: boolean;
  /** 네이버 검색량 급감 여부 (관심 없음=true) */
  naverSearchLow: boolean;
  /** 김치 프리미엄 (%) */
  kimchiPremium: number;
  dataFreshness: Date;
}

// ─────────────────────────────────────────────
// 전체 스코어링 입력 데이터 (11카테고리 묶음)
// ─────────────────────────────────────────────
export interface ScoringInput {
  cat1: PriceActionInput;
  cat2: RsiMacroInput;
  cat3: DerivativesInput;
  cat4: OptionsGexInput;
  cat5: EtfFlowsInput;
  cat6: CvdInput;
  cat7: OnchainInput;
  cat8: MacroInput;
  cat9: CycleFibInput;
  cat10: FundFlowsInput;
  cat11: CrowdInput;
}

// ─────────────────────────────────────────────
// 보너스 계산 결과
// ─────────────────────────────────────────────
export interface BonusResult {
  rsiMacroBonus: number;
  fibConfluenceBonus: number;
  rsiAlert: string | undefined;
}
