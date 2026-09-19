import { NextResponse } from 'next/server';

const LOW_STOCK_THRESHOLD = 5;

// ป้องกันชื่อสินค้าที่มีตัวอักษร < > & ทำให้ parse_mode HTML พัง
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegram(token, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Telegram API ${res.status}: ${detail}`);
  }
}

export async function POST(request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json(
      { ok: false, error: 'Missing Telegram environment variables' },
      { status: 500 }
    );
  }

  try {
    const { productName, quantity, totalPrice, stockAfter, unit } = await request.json();

    const unitLabel = escapeHtml(unit || 'ชิ้น');
    const name = escapeHtml(productName ?? '-');

    // เซิร์ฟเวอร์บน Vercel ใช้เวลา UTC จึงต้องระบุ timezone ไทยเอง
    const now = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // ข้อความที่ 1: มีรายการขายใหม่
    const orderMessage =
      `🛍️ <b>มีรายการขายใหม่!</b>\n` +
      `- สินค้า: ${name}\n` +
      `- จำนวน: ${quantity} ${unitLabel}\n` +
      `- ราคารวม: ${Number(totalPrice).toLocaleString('th-TH')} บาท\n` +
      `- สต๊อกคงเหลือปัจจุบัน: ${stockAfter} ${unitLabel}\n` +
      `- เวลา: ${now}`;

    await sendTelegram(token, chatId, orderMessage);

    // ข้อความที่ 2: สต๊อกใกล้หมด (แยกอีก 1 ข้อความ)
    if (Number(stockAfter) <= LOW_STOCK_THRESHOLD) {
      const lowStockMessage =
        `🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>\n` +
        `- สินค้า: ${name}\n` +
        `- คงเหลือเพียง: ${stockAfter} ${unitLabel}\n` +
        `⚠️ กรุณาเติมสต๊อกสินค้าด่วน!`;

      await sendTelegram(token, chatId, lowStockMessage);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram notify failed:', err);
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 502 });
  }
}
