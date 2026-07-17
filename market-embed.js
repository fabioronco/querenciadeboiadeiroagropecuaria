(() => {
  const sourceUrl = 'https://beta.noticiasagricolas.com.br/cotacoes/boi-gordo';
  const showApp = () => {
    document.querySelector('#loginScreen').style.display = 'none';
    const shell = document.querySelector('#mainShell');
    shell.classList.remove('hide');
    shell.style.display = 'grid';
    if (!document.querySelector('#app').innerHTML.trim() && typeof window.render === 'function') window.render();
  };
  const loginForm = document.querySelector('#loginForm');
  loginForm?.addEventListener('submit', event => {
    event.preventDefault();
    const login = loginForm.elements.login.value.trim().toUpperCase();
    const password = loginForm.elements.password.value.trim();
    const valid = login === 'JF' && password === '1708';
    const error = document.querySelector('#loginError');
    error.style.display = valid ? 'none' : 'block';
    if (!valid) return;
    if (loginForm.elements.remember.checked) localStorage.setItem('querencia-remembered-access', 'JF');
    else localStorage.removeItem('querencia-remembered-access');
    showApp();
  });
  if (localStorage.getItem('querencia-remembered-access') === 'JF') showApp();
  const renderMarket = () => {
    const target = document.querySelector('#app');
    if (!target) return;
    target.innerHTML = `<div class="content market-page">
      <div class="section-title"><div><h2>Mercado pecuário</h2><p>Cotações públicas de boi gordo, por praça e estado.</p></div><a class="btn secondary" href="${sourceUrl}" target="_blank" rel="noopener">Abrir fonte ↗</a></div>
      <div class="market-notice"><strong>Fonte pública:</strong> Notícias Agrícolas / Indicador AgroBrazil. Os valores e a disponibilidade são definidos pela própria fonte.</div>
      <div class="market-tabs"><span class="pill">Boi gordo</span><span class="pill gold">Preço por arroba</span><span class="market-updated">Atualização pela fonte externa</span></div>
      <div class="market-frame-wrap"><iframe title="Cotações públicas do boi gordo" src="${sourceUrl}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="market-fallback">Se a tabela não carregar aqui, a fonte pode bloquear incorporação. Use o botão “Abrir fonte”.</div></div>
    </div>`;
    document.querySelector('#pageTitle').textContent = 'Mercado pecuário';
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === 'cotacoes'));
  };
  document.addEventListener('click', event => {
    const item = event.target.closest('.nav-item[data-view="cotacoes"]');
    if (item) setTimeout(renderMarket, 0);
  });
})();
