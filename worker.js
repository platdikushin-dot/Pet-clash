// Cloudflare Worker: принимает заявку на подарок из мини-приложения и шлёт её во второй бот.
// Переменные (Settings → Variables and Secrets):
//   MAIN_BOT_TOKEN   — токен ОСНОВНОГО бота (того, в котором открывается игра), нужен для проверки игрока
//   ORDERS_BOT_TOKEN — токен ВТОРОГО бота, который присылает тебе заявки
//   ORDERS_CHAT_ID   — id чата, куда второй бот пишет заявки (твой id)

const GIFTS = {
  bear:    { name: 'Мишка',  price: 5000 },
  rose:    { name: 'Роза',   price: 8000 },
  rocket:  { name: 'Ракета', price: 16000 },
  diamond: { name: 'Алмаз',  price: 32000 },
};
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function hmac(key, data) {
  const raw = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const k = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
}

// Проверяем, что данные реально пришли из Telegram, и достаём игрока
async function verify(initData, botToken) {
  if (!initData) return { error: 'Пустые данные игрока' };
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  if (!hash) return { error: 'Нет подписи Telegram' };
  p.delete('hash');
  const str = [...p.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const sig = await hmac(await hmac('WebAppData', botToken.trim()), str);
  const hex = [...sig].map(b => b.toString(16).padStart(2, '0')).join('');
  if (hex !== hash) return { error: 'Подпись не совпала: MAIN_BOT_TOKEN должен быть токеном бота, из которого открыта игра' };
  if (Date.now() / 1000 - Number(p.get('auth_date')) > 86400) return { error: 'Данные устарели, закрой и открой игру заново' };
  try { return { user: JSON.parse(p.get('user')) }; } catch { return { error: 'Нет данных игрока' }; }
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method !== 'POST') return reply({ ok: false, error: 'POST only' }, 405);

    let body;
    try { body = await req.json(); } catch { return reply({ ok: false, error: 'bad json' }, 400); }

    const v = await verify(body.initData || '', env.MAIN_BOT_TOKEN || '');
    if (!v.user) return reply({ ok: false, error: v.error }, 401);
    const user = v.user;

    const gift = GIFTS[body.gift];
    if (!gift) return reply({ ok: false, error: 'Неизвестный подарок' }, 400);

    const who = [user.first_name, user.last_name].filter(Boolean).join(' ');
    const text =
      `🎁 Новая заявка на подарок\n\n` +
      `Подарок: ${gift.name} (${gift.price})\n` +
      `Игрок: ${who}${user.username ? ' @' + user.username : ''}\n` +
      `ID: ${user.id}`;

    const r = await fetch(`https://api.telegram.org/bot${(env.ORDERS_BOT_TOKEN || '').trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: String(env.ORDERS_CHAT_ID || '').trim(), text }),
    });
    if (!r.ok) return reply({ ok: false, error: 'Не получилось отправить заявку' }, 502);
    return reply({ ok: true, name: gift.name, price: gift.price });
  },
};
