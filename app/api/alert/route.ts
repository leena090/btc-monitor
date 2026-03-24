/**
 * 알림 발송 API 엔드포인트
 * 용도 1: 수동 알림 테스트 (/api/alert?test=true)
 * 용도 2: 외부에서 알림 파이프라인 트리거 (POST)
 * 용도 3: 봇 연결 상태 확인 (GET)
 */

import { testBotConnection, sendTelegramAlert } from '@/lib/alerts/telegram';

// ──────────────────────────────────────────────
// GET — 봇 연결 상태 + 테스트 메시지 발송
// ──────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isTest = searchParams.get('test') === 'true';

  // 봇 연결 확인
  const bot = await testBotConnection();

  if (!bot) {
    return Response.json({
      status: 'error',
      message: 'TELEGRAM_BOT_TOKEN 미설정 또는 봇 연결 실패',
    }, { status: 500 });
  }

  // 테스트 모드: 테스트 메시지 발송
  if (isTest) {
    const testMessage = [
      `🧪 BTC 모니터 알림 테스트`,
      ``,
      `봇: @${bot.username}`,
      `시각: ${new Date().toISOString()}`,
      `상태: 정상 작동 중`,
    ].join('\n');

    const sent = await sendTelegramAlert(testMessage);

    return Response.json({
      status: sent ? 'sent' : 'failed',
      bot: bot.username,
      test: true,
    });
  }

  // 기본: 연결 상태만 반환
  return Response.json({
    status: 'ok',
    bot: bot.username,
    message: '텔레그램 봇 연결 정상. ?test=true 파라미터로 테스트 메시지 발송 가능',
  });
}
