export async function onRequestPost({ request, env }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, {status:403});
  if (!request.headers.get('content-type')?.startsWith('application/json')) return new Response(null, {status:415});
  const data = await request.json().catch(() => null);
  const message = typeof data?.message === 'string' ? data.message.trim() : '';
  const email = typeof data?.email === 'string' ? data.email.trim() : '';
  if (!message || message.length > 4000 || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return new Response(null, {status:400});
  if (!env.EMAIL_ACCOUNT_ID || !env.EMAIL_SEND_TOKEN) return new Response(null, {status:503});
  const recipient = 'jibunjisin.net@gmail.com';
  const response = await fetch('https://api.cloudflare.com/client/v4/accounts/' + env.EMAIL_ACCOUNT_ID + '/email/sending/send', {
    method: 'POST',
    headers: {'Content-Type':'application/json', Authorization:'Bearer ' + env.EMAIL_SEND_TOKEN},
    body: JSON.stringify({from:'contact@jibunjisin.net', to:recipient, subject:'HPからのお問い合わせ', text:'返信先: ' + (email || '記載なし') + '\n\n' + message})
  });
  const result = await response.json().catch(() => null);
  const accepted = response.ok && result?.success && result.result?.delivered?.includes(recipient);
  return new Response(null, {status:accepted ? 204 : 502});
}
