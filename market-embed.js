(() => {
  const sourceUrl = 'https://beta.noticiasagricolas.com.br/cotacoes/boi-gordo';
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
