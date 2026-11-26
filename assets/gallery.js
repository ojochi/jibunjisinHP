const news = document.querySelector('#news');
for (const item of window.newsItems || []) {
  const date = document.createElement('small');
  const body = document.createElement('p');
  date.textContent = item.date;
  body.textContent = item.text;
  news.append(date, body);
}
const album = document.querySelector('#album');
const grid = album.querySelector('.grid');
const count = album.querySelector('small');
const modal = document.querySelector('dialog');
modal.onclick = event => { if (event.target === modal) modal.close(); };
function displayDate(caption, value) {
  const date = new Date(value);
  const valid = Boolean(value) && Number.isFinite(date.getTime());
  caption.hidden = !valid;
  caption.textContent = valid ? '投稿日　' + date.toLocaleDateString('ja-JP', {timeZone:'Asia/Tokyo'}) : '';
}
function openPhoto(item) {
  modal.querySelector('img').src = item.image.imageUrl;
  displayDate(modal.querySelector('small'), item.createdAt);
  modal.showModal();
}
async function fetchPage(page) {
  const response = await fetch('/api/me?page=' + page);
  if (!response.ok) throw Error('写真の読み込みに失敗しました。');
  return response.json();
}
let latest = 0;
async function showPage(page, scroll = false) {
  const request = ++latest;
  try {
    const {items, pagination} = await fetchPage(page);
    if (latest !== request) return;
    count.textContent = '全' + pagination.totalItems + '枚';
    grid.replaceChildren();
    for (const item of items) {
      const button = document.createElement('button');
      const image = new Image();
      image.loading = 'lazy';
      image.src = item.image.imageUrl;
      image.alt = '自撮りを拡大';
      button.append(image);
      button.onclick = () => openPhoto(item);
      grid.append(button);
    }
    for (const nav of album.querySelectorAll('nav')) {
      nav.replaceChildren();
      for (let i = 1; i <= pagination.totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.onclick = () => showPage(i, true);
        if (i === pagination.page) button.setAttribute('aria-current', 'page');
        nav.append(button);
      }
      const active = nav.querySelector('[aria-current]');
      if (active) nav.scrollLeft += active.getBoundingClientRect().left - nav.getBoundingClientRect().left - nav.clientWidth / 2 + active.offsetWidth / 2;
    }
    if (scroll) {
      const url = new URL(location.href);
      if (Number(url.searchParams.get('page') || 1) !== pagination.page) {
        url.searchParams.set('page', pagination.page);
        history.pushState(null, '', url);
      }
      album.scrollIntoView();
    }
    return pagination;
  } catch {
    if (request === latest) count.textContent = '写真を読み込めませんでした。ページを再読み込みしてください。';
  }
}
async function start() {
  const page = Number(new URL(location.href).searchParams.get('page')) || 1;
  const paging = await showPage(page);
  if (!paging?.totalItems) return;
  const index = Math.floor(Math.random() * paging.totalItems);
  const data = await fetchPage(Math.floor(index / paging.pageSize) + 1);
  const item = data.items[index % paging.pageSize];
  if (!item) return;
  document.querySelector('#hero').src = item.image.imageUrl;
  displayDate(document.querySelector('figcaption'), item.createdAt);
  document.querySelector('#open-hero').onclick = () => openPhoto(item);
  document.querySelector('figure').hidden = false;
}
window.addEventListener('popstate', () => showPage(Number(new URL(location.href).searchParams.get('page')) || 1));
start().catch(console.error);
const form = document.querySelector('form');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  if (button.disabled) return;
  button.disabled = true;
  const status = form.querySelector('[role=status]');
  status.textContent = '送信中…';
  try {
    const response = await fetch('/api/contact', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:form.querySelector('input').value, message:form.querySelector('textarea').value})
    });
    if (response.status !== 204) throw Error();
    form.reset();
    status.textContent = 'お問い合わせを送信しました。';
  } catch {
    status.textContent = '送信を確認できませんでした。時間をおいてお試しください。';
  } finally {
    button.disabled = false;
  }
});
