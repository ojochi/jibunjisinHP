const list = document.querySelector('#admin-list');
function render(items, page) {
  list.replaceChildren();
  for (const item of items.slice((page - 1) * 30, page * 30)) {
    const link = document.createElement('a');
    link.href = '/admin/me/' + encodeURIComponent(item.id) + '/edit';
    if (item.image?.imageUrl) {
      const img = new Image();
      img.loading = 'lazy';
      img.src = item.image.imageUrl;
      img.alt = '写真を編集';
      link.append(img);
    }
    link.append(new Date(item.createdAt).toLocaleDateString('ja-JP', {timeZone:'Asia/Tokyo'}));
    list.append(link);
  }
  for (const nav of document.querySelectorAll('.pages')) {
    nav.replaceChildren();
    for (let i = 1; i <= Math.ceil(items.length / 30); i++) {
      const button = document.createElement('button');
      button.textContent = i;
      if (i === page) button.setAttribute('aria-current','page');
      button.onclick = () => { render(items, i); window.scrollTo(0,0); };
      nav.append(button);
    }
    const active = nav.querySelector('[aria-current]');
    if (active) nav.scrollLeft += active.getBoundingClientRect().left - nav.getBoundingClientRect().left - nav.clientWidth / 2 + active.offsetWidth / 2;
  }
}
async function loadList() {
  const response = await fetch('/api/admin/me');
  if (!response.ok) throw Error();
  const {items} = await response.json();
  document.querySelector('#admin-empty').hidden = items.length > 0;
  render(items, 1);
}
loadList().catch(() => {
  const message = document.querySelector('#admin-message');
  message.hidden = false;
  message.textContent = '写真を読み込めませんでした。再読み込みしてください。';
});
