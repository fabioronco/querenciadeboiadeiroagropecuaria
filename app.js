(() => {
const key = 'querencia-boiadeiro-v2';
const seed = { expenses: [], purchases: [], sales: [], quotes: [] };
let data = JSON.parse(localStorage.getItem(key) || JSON.stringify(seed));
let currentView = 'dashboard';
const app = document.querySelector('#app');
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const money = n => brl.format(Number(n || 0));
const today = new Date().toISOString().slice(0, 10);
const dateBR = d => d ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${d}T12:00:00`)) : '—';
const total = (rows, field = 'value') => rows.reduce((sum, x) => sum + Number(x[field] || 0), 0);
const parseNum = value => Number(String(value || '0').replace(',', '.')) || 0;
const esc = value => String(value || '').replace(/[&<>"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
function save() { localStorage.setItem(key, JSON.stringify(data)); }
function button(type, label = 'Novo lançamento') { return `<button class="btn primary" data-new="${type}">+ ${label}</button>`; }
function schedule() { const start = new Date(2026, 6, 15); return Array.from({ length:24 }, (_, i) => { const month=i+1, due=new Date(start); due.setMonth(start.getMonth()+i); const interest=month<=3?0:6500+(month<=15?1625:0); return { month, due, phase:month<=3?'Carência':month<=15?'Diluição':'Juros normais', interest, amortization:month===24?500000:0, payment:interest+(month===24?500000:0) }; }); }
function attachmentBadge(row, label = 'Anexos') { const count = (row.attachments || []).length; return count ? `<span class="attachment-badge">⌕ ${count} ${label}</span>` : '—'; }
function dashboard() { const p=total(data.purchases), s=total(data.sales), e=total(data.expenses), next=schedule().find(item=>item.due>=new Date()); return `<div class="content"><div class="hero"><div><p class="eyebrow">OPERAÇÃO EM UM SÓ LUGAR</p><h2>Bem-vindo, JF.</h2><p>Controle compras, vendas, custos, cotações e documentos da fazenda.</p></div>${button('purchase','Registrar compra')}</div><div class="cards"><div class="card"><div class="card-label">Compras de gado</div><div class="card-value">${money(p)}</div><div class="card-foot">${data.purchases.length} lote(s) registrado(s)</div></div><div class="card"><div class="card-label">Vendas de gado</div><div class="card-value green">${money(s)}</div><div class="card-foot">${data.sales.length} lote(s) registrado(s)</div></div><div class="card"><div class="card-label">Investimentos e gastos</div><div class="card-value red">${money(e)}</div><div class="card-foot">${data.expenses.length} lançamento(s)</div></div><div class="card"><div class="card-label">Resultado operacional</div><div class="card-value ${s-p-e>=0?'green':'red'}">${money(s-p-e)}</div><div class="card-foot">Vendas − compras − gastos</div></div></div><div class="grid-2"><div class="panel"><div class="panel-head"><div><h3>Próximo compromisso do capital de giro</h3><small>R$ 500.000 · 1,3% ao mês</small></div><button class="btn secondary" data-view-link="capital">Ver cronograma</button></div><div class="timeline">${next?`<div class="timeline-row"><div><strong>${dateBR(next.due.toISOString().slice(0,10))}</strong><br><small>Mês ${next.month}</small></div><div><strong>${next.phase}</strong><br><small>Pagamento previsto</small></div><div class="amount">${money(next.payment)}</div></div>`:'<p class="empty">Cronograma concluído.</p>'}</div></div><div class="panel"><div class="panel-head"><h3>Atalhos</h3></div><div class="timeline"><div class="timeline-row"><div>↓</div><div><strong>Compra de gado</strong><br><small>Com fotos e documentos do lote</small></div>${button('purchase','Adicionar')}</div><div class="timeline-row"><div>▣</div><div><strong>Gasto ou investimento</strong><br><small>Com orçamento e comprovantes</small></div>${button('expense','Adicionar')}</div><div class="timeline-row"><div>⌁</div><div><strong>Cotação de animais</strong><br><small>Compare propostas de compra e venda</small></div>${button('quote','Cotação')}</div></div></div></div></div>`; }
function capital() { const rows=schedule(); return `<div class="content"><div class="section-title"><div><h2>Capital de giro</h2><p>R$ 500.000 · 24 meses · juros de 1,3% ao mês</p></div><span class="pill gold">Carência: 3 meses</span></div><div class="cards"><div class="card"><div class="card-label">Juro mensal base</div><div class="card-value">${money(6500)}</div></div><div class="card"><div class="card-label">Juros da carência</div><div class="card-value">${money(19500)}</div><div class="card-foot">diluídos em 12 meses</div></div><div class="card"><div class="card-label">Total de juros</div><div class="card-value">${money(156000)}</div></div><div class="card"><div class="card-label">Total previsto</div><div class="card-value">${money(656000)}</div><div class="card-foot">inclui quitação do principal</div></div></div><div class="panel"><div class="panel-head"><div><h3>Cronograma de pagamento</h3><small>O principal está previsto para quitação no mês 24.</small></div></div><div class="table-wrap"><table><thead><tr><th>Mês</th><th>Vencimento</th><th>Fase</th><th>Juros</th><th>Amortização</th><th>Pagamento</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.month}</td><td>${dateBR(row.due.toISOString().slice(0,10))}</td><td><span class="pill ${row.phase==='Diluição'?'gold':''}">${row.phase}</span></td><td>${money(row.interest)}</td><td>${money(row.amortization)}</td><td class="amount">${money(row.payment)}</td></tr>`).join('')}</tbody></table></div></div></div>`; }
function lotPerformance(sale) { const purchase=data.purchases.find(row=>String(row.lot||'').trim().toLowerCase()===String(sale.lot||'').trim().toLowerCase()); if(!purchase) return 'Lote sem compra'; const cost=Number(purchase.value||0)+Number(purchase.freight||0), revenue=Number(sale.value||0)-Number(sale.freight||0), gain=revenue-cost, rate=cost?gain/cost*100:0; return `${money(gain)} (${rate.toFixed(1).replace('.',',')}%)`; }
function lotReport() { const todayMs=new Date().setHours(0,0,0,0); const rows=data.purchases.map(purchase=>{ const lot=String(purchase.lot||'').trim(); const sales=data.sales.filter(sale=>String(sale.lot||'').trim().toLowerCase()===lot.toLowerCase()); const cost=Number(purchase.value||0)+Number(purchase.freight||0); const revenue=sales.reduce((sum,sale)=>sum+Number(sale.value||0)-Number(sale.freight||0),0); const quantitySold=sales.reduce((sum,sale)=>sum+Number(sale.quantity||0),0); const quantityBought=Number(purchase.quantity||0); const lastSale=sales.map(sale=>sale.date).filter(Boolean).sort().at(-1); const start=new Date(`${purchase.date||today}T12:00:00`).getTime(); const end=lastSale?new Date(`${lastSale}T12:00:00`).getTime():todayMs; const days=Math.max(1,Math.round((end-start)/86400000)); const profit=revenue-cost; const gross=cost?profit/cost*100:0; const monthly=cost?(profit/days*30)/cost*100:0; const closed=quantityBought>0&&quantitySold>=quantityBought; return {lot:lot||'Sem lote',cost,revenue,profit,gross,monthly,days,quantityBought,quantitySold,lastSale,status:closed?'Finalizado':sales.length?'Venda parcial':'Em estoque'}; }); return `<div class="content"><div class="section-title"><div><h2>Rentabilidade por lote</h2><p>Retorno bruto e mensal calculados sobre o capital investido em cada lote.</p></div></div><div class="quote-note"><strong>Retorno mensal:</strong> (lucro ÷ dias em estoque × 30) ÷ custo de compra. Em vendas parciais, a venda acumulada é considerada até a última venda registrada.</div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Lote</th><th>Compra</th><th>Vendas acumuladas</th><th>Lucro</th><th>Ganho bruto</th><th>Dias em estoque</th><th>Retorno mensal</th><th>Status</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr><td><strong>${esc(row.lot)}</strong><br><small>${row.quantitySold}/${row.quantityBought||'—'} cabeças vendidas</small></td><td>${money(row.cost)}</td><td>${money(row.revenue)}</td><td class="${row.profit>=0?'green':'red'}">${money(row.profit)}</td><td>${row.gross.toFixed(2).replace('.',',')}%</td><td>${row.days} dia(s)</td><td class="${row.monthly>=0?'green':'red'}"><strong>${row.monthly.toFixed(2).replace('.',',')}% a.m.</strong></td><td><span class="pill ${row.status==='Finalizado'?'gold':''}">${row.status}</span></td></tr>`).join(''):`<tr><td class="empty" colspan="8">Cadastre uma compra de lote para acompanhar a rentabilidade.</td></tr>`}</tbody></table></div></div></div>`; }
function recordsView(kind) { const cfg={gastos:{title:'Investimentos e gastos',desc:'Registre custos, despesas, orçamentos e comprovantes.',type:'expense',rows:data.expenses,cols:['Data','Tipo','Categoria','Descrição','Lote','Fornecedor','Valor','Documentos'],values:r=>[dateBR(r.date),r.type,r.category,r.description,r.lot,r.party,money(r.value),attachmentBadge(r)]},compras:{title:'Compras de gado',desc:'Lotes adquiridos, fotos e documentação da negociação.',type:'purchase',rows:data.purchases,cols:['Lote','Data','Animais','Sexo','Qtd.','Peso médio','Valor pago','Fotos / docs'],values:r=>[r.lot,dateBR(r.date),r.animalType,r.sex,r.quantity,`${r.avgWeight||'—'} kg`,money(r.value),attachmentBadge(r)]},vendas:{title:'Vendas de gado',desc:'Lotes comercializados pela operação.',type:'sale',rows:data.sales,cols:['Lote','Data','Animais','Sexo','Qtd.','Peso médio','Valor recebido','Resultado','Documentos'],values:r=>[r.lot,dateBR(r.date),r.animalType,r.sex,r.quantity,`${r.avgWeight||'—'} kg`,money(r.value),lotPerformance(r),attachmentBadge(r)]}}[kind]; return `<div class="content"><div class="section-title"><div><h2>${cfg.title}</h2><p>${cfg.desc}</p></div><div class="sheet-actions">${button(cfg.type)}</div></div><div class="summary-strip"><div>Total de lançamentos<strong>${cfg.rows.length}</strong></div><div>Valor acumulado<strong>${money(total(cfg.rows))}</strong></div><div>Documentos e fotos<strong>${cfg.rows.reduce((n,r)=>n+(r.attachments||[]).length,0)}</strong></div></div><div class="panel"><div class="table-wrap"><table><thead><tr>${cfg.cols.map(c=>`<th>${c}</th>`).join('')}<th></th></tr></thead><tbody>${cfg.rows.length?cfg.rows.map((row,index)=>`<tr>${cfg.values(row).map(v=>`<td>${v||'—'}</td>`).join('')}<td><button class="btn secondary" data-files="${cfg.type}" data-index="${index}">Ver</button> <button class="btn danger" data-delete="${cfg.type}" data-index="${index}">Excluir</button></td></tr>`).join(''):`<tr><td class="empty" colspan="${cfg.cols.length+1}">Ainda não há lançamentos. Use o botão para começar.</td></tr>`}</tbody></table></div></div></div>`; }
function quotes() { const rows=data.quotes; return `<div class="content"><div class="section-title"><div><h2>Cotações de animais</h2><p>Compare oportunidades por praça, categoria, peso e preço.</p></div>${button('quote','Nova cotação')}</div><div class="quote-note"><strong>Campos essenciais:</strong> categoria, raça, sexo, idade/dentição, quantidade, peso médio, praça, preço por arroba ou kg, frete, comissão e condição de pagamento.</div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Data</th><th>Operação</th><th>Praça</th><th>Categoria / raça</th><th>Sexo</th><th>Qtd.</th><th>Peso médio</th><th>Preço</th><th>Condição</th><th></th></tr></thead><tbody>${rows.length?rows.map((row,index)=>`<tr><td>${dateBR(row.date)}</td><td><span class="pill ${row.operation==='Venda'?'gold':''}">${row.operation}</span></td><td>${esc(row.city)} / ${esc(row.state)}</td><td>${esc(row.category)} ${row.breed?`· ${esc(row.breed)}`:''}</td><td>${esc(row.sex)}</td><td>${esc(row.quantity)}</td><td>${esc(row.avgWeight)} kg</td><td>${money(row.price)} / ${esc(row.priceBasis)}</td><td>${esc(row.paymentTerms)}</td><td><button class="btn danger" data-delete="quote" data-index="${index}">Excluir</button></td></tr>`).join(''):`<tr><td class="empty" colspan="10">Cadastre uma cotação para começar a comparar oportunidades.</td></tr>`}</tbody></table></div></div></div>`; }
function render() { const titles={dashboard:'Visão geral',capital:'Capital de giro',gastos:'Investimentos e gastos',compras:'Compras de gado',vendas:'Vendas de gado',cotacoes:'Cotações de animais'}; document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView)); document.querySelector('#pageTitle').textContent=titles[currentView]; app.innerHTML=currentView==='dashboard'?dashboard():currentView==='capital'?capital():currentView==='cotacoes'?quotes():recordsView(currentView); bindPage(); }
const input=(name,label,type='text',options='',full=false)=>`<label class="${full?'full':''}">${label}<${type==='select'?'select':'input'} name="${name}" ${type==='date'?'type="date"':type==='number'?'type="number" step="0.01" min="0"':''}>${options}</${type==='select'?'select':'input'}></label>`;
const select=(name,label,items,full=false)=>input(name,label,'select',items.map(item=>`<option>${item}</option>`).join(''),full);
const upload=(label,accept,help)=>`<label class="full upload-field">${label}<input name="attachments" type="file" accept="${accept}" multiple /><small>${help}</small></label>`;
function openForm(type) { const dialog=document.querySelector('#recordDialog'), fields=document.querySelector('#formFields'); const expense=type==='expense', sale=type==='sale', quote=type==='quote'; document.querySelector('#modalTitle').textContent=quote?'Nova cotação de animais':expense?'Adicionar gasto ou investimento':sale?'Registrar venda de gado':'Registrar compra de gado'; document.querySelector('#modalEyebrow').textContent=quote?'COTAÇÃO DE MERCADO':expense?'INVESTIMENTOS E GASTOS':sale?'VENDA DE GADO':'COMPRA DE GADO'; if(quote) fields.innerHTML=input('date','Data','date')+select('operation','Operação',['Compra','Venda'])+select('category','Categoria',['Bezerro(a)','Desmama','Garrote','Novilho(a)','Boi magro','Boi gordo','Vaca','Matriz','Touro','Outro'])+input('breed','Raça / cruzamento')+select('sex','Sexo',['Macho','Fêmea','Misto'])+input('quantity','Quantidade','number')+input('avgWeight','Peso médio (kg)','number')+input('age','Idade ou dentição')+input('city','Praça / cidade')+input('state','Estado')+select('priceBasis','Base de preço',['@','kg vivo','cabeça','lote'])+input('price','Preço unitário (R$)','number')+input('freight','Frete estimado (R$)','number')+input('commission','Comissão (%)','number')+input('paymentTerms','Condição de pagamento')+input('source','Fonte / contato')+`<label class="full">Observações<textarea name="notes"></textarea></label>`; else if(expense) fields.innerHTML=input('date','Data','date')+select('type','Tipo',['Gasto','Investimento','Despesa'])+select('category','Categoria',['Frete','Alimentação','Sanidade','Mão de obra','Infraestrutura','Financeiro','Outro'])+input('lot','Lote relacionado')+input('party','Fornecedor / beneficiário')+input('value','Valor (R$)','number')+input('description','Descrição','text','',true)+upload('Orçamentos, notas ou comprovantes','image/*,.pdf,.doc,.docx,.xls,.xlsx','Você pode anexar fotos, PDF ou documentos da negociação.'); else fields.innerHTML=input('lot','Identificação do lote')+input('date','Data','date')+select('animalType','Tipo de animais',['Bezerro','Garrote','Novilho','Vaca','Boi magro','Boi gordo','Matriz','Touro','Outro'])+input('breed','Raça / cruzamento')+select('sex','Sexo',['Macho','Fêmea','Misto'])+input('quantity','Quantidade','number')+input('avgWeight','Peso médio (kg)','number')+input('freight','Custo de frete (R$)','number')+input('value',sale?'Valor recebido (R$)':'Valor pago (R$)','number')+input('party',sale?'Comprador':'Vendedor')+input('city','Cidade')+input('state','Estado')+`<label class="full">Observações<textarea name="notes"></textarea></label>`+upload(sale?'Documentos da venda':'Fotos do lote e documentos da compra','image/*,.pdf,.doc,.docx,.xls,.xlsx','Anexe fotos dos animais, orçamento, GTA, nota ou outro documento do lote.'); fields.querySelector('[name=date]').value=today; dialog.dataset.type=type; dialog.showModal(); }
async function readFiles(files) { const selected=Array.from(files||[]).slice(0,6); return Promise.all(selected.map(file=>new Promise((resolve,reject)=>{ if(file.size>1500000) return reject(new Error(`O arquivo ${file.name} é maior que 1,5 MB.`)); const reader=new FileReader(); reader.onload=()=>resolve({name:file.name,type:file.type,url:reader.result}); reader.onerror=reject; reader.readAsDataURL(file); }))); }
function showFiles(type,index) { const map={expense:'expenses',purchase:'purchases',sale:'sales'}, row=data[map[type]][index], files=row.attachments||[]; if(!files.length) return alert('Este lançamento ainda não possui anexos.'); const popup=window.open('','_blank'); popup.document.write(`<title>Anexos</title><style>body{font-family:system-ui;padding:24px;color:#18251f}img{max-width:100%;height:auto;margin:12px 0}a{display:block;margin:12px 0;color:#164534}</style><h1>Anexos — ${esc(row.lot||row.description||'lançamento')}</h1>${files.map(file=>file.type.startsWith('image/')?`<h3>${esc(file.name)}</h3><img src="${file.url}" alt="${esc(file.name)}">`:`<a download="${esc(file.name)}" href="${file.url}">Baixar ${esc(file.name)}</a>`).join('')}`); }
function bindPage() { document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>openForm(b.dataset.new)); document.querySelectorAll('[data-view-link]').forEach(b=>b.onclick=()=>{currentView=b.dataset.viewLink;render();}); document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const map={expense:'expenses',purchase:'purchases',sale:'sales',quote:'quotes'}; data[map[b.dataset.delete]].splice(Number(b.dataset.index),1);save();render();}); document.querySelectorAll('[data-files]').forEach(b=>b.onclick=()=>showFiles(b.dataset.files,Number(b.dataset.index))); }
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;document.querySelector('#sidebar').classList.remove('open');render();});
document.querySelector('#menuBtn').onclick=()=>document.querySelector('#sidebar').classList.toggle('open');
document.querySelector('#recordForm').addEventListener('submit',async event=>{ event.preventDefault(); try { const form=event.currentTarget, formData=new FormData(form), row=Object.fromEntries(formData.entries()); row.attachments=await readFiles(form.querySelector('[name=attachments]')?.files); ['value','freight','quantity','avgWeight','price','commission'].forEach(name=>row[name]=parseNum(row[name])); const map={expense:'expenses',purchase:'purchases',sale:'sales',quote:'quotes'};data[map[document.querySelector('#recordDialog').dataset.type]].unshift(row);save();document.querySelector('#recordDialog').close();render(); } catch(error) { alert(error.message || 'Não foi possível salvar os anexos.'); } });
document.querySelector('#loginForm').addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);const ok=f.get('login').trim().toUpperCase()==='JF'&&f.get('password')==='1708';document.querySelector('#loginError').classList.toggle('hide',ok);if(ok){sessionStorage.setItem('querencia-session','JF');document.querySelector('#loginScreen').classList.add('hide');document.querySelector('#mainShell').classList.remove('hide');render();}});
if(sessionStorage.getItem('querencia-session')==='JF'){document.querySelector('#loginScreen').classList.add('hide');document.querySelector('#mainShell').classList.remove('hide');render();}

// Versão sem o módulo de cotações externas.
function dashboard() {
  const p = total(data.purchases), s = total(data.sales), e = total(data.expenses);
  const next = schedule().find(item => item.due >= new Date());
  return `<div class="content"><div class="hero"><div><p class="eyebrow">OPERAÇÃO EM UM SÓ LUGAR</p><h2>Bem-vindo, JF.</h2><p>Controle compras, vendas, custos e documentos da fazenda.</p></div>${button('purchase','Registrar compra')}</div><div class="cards"><div class="card"><div class="card-label">Compras de gado</div><div class="card-value">${money(p)}</div><div class="card-foot">${data.purchases.length} lote(s) registrado(s)</div></div><div class="card"><div class="card-label">Vendas de gado</div><div class="card-value green">${money(s)}</div><div class="card-foot">${data.sales.length} lote(s) registrado(s)</div></div><div class="card"><div class="card-label">Investimentos e gastos</div><div class="card-value red">${money(e)}</div><div class="card-foot">${data.expenses.length} lançamento(s)</div></div><div class="card"><div class="card-label">Resultado operacional</div><div class="card-value ${s-p-e>=0?'green':'red'}">${money(s-p-e)}</div><div class="card-foot">Vendas − compras − gastos</div></div></div><div class="grid-2"><div class="panel"><div class="panel-head"><div><h3>Próximo compromisso do capital de giro</h3><small>R$ 500.000 · 1,3% ao mês</small></div><button class="btn secondary" data-view-link="capital">Ver cronograma</button></div><div class="timeline">${next?`<div class="timeline-row"><div><strong>${dateBR(next.due.toISOString().slice(0,10))}</strong><br><small>Mês ${next.month}</small></div><div><strong>${next.phase}</strong><br><small>Pagamento previsto</small></div><div class="amount">${money(next.payment)}</div></div>`:'<p class="empty">Cronograma concluído.</p>'}</div></div><div class="panel"><div class="panel-head"><h3>Atalhos</h3></div><div class="timeline"><div class="timeline-row"><div>↓</div><div><strong>Compra de gado</strong><br><small>Com fotos e documentos do lote</small></div>${button('purchase','Adicionar')}</div><div class="timeline-row"><div>▣</div><div><strong>Gasto ou investimento</strong><br><small>Com orçamento e comprovantes</small></div>${button('expense','Adicionar')}</div></div></div></div></div>`;
}

function render() {
  const titles = { dashboard:'Visão geral', capital:'Capital de giro', gastos:'Investimentos e gastos', compras:'Compras de gado', vendas:'Vendas de gado', relatorios:'Rentabilidade por lote' };
  if (!titles[currentView]) currentView = 'dashboard';
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === currentView));
  document.querySelector('#pageTitle').textContent = titles[currentView];
  app.innerHTML = currentView === 'dashboard' ? dashboard() : currentView === 'capital' ? capital() : currentView === 'relatorios' ? lotReport() : recordsView(currentView);
  bindPage();
}

render();

// Sincronização segura entre aparelhos via Cloudflare Pages Functions + D1.
const cloudTokenKey = 'querencia-cloud-token';
let cloudToken = localStorage.getItem(cloudTokenKey) || sessionStorage.getItem(cloudTokenKey) || '';

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}), 'content-type': 'application/json' };
  if (cloudToken) headers.authorization = `Bearer ${cloudToken}`;
  const response = await fetch(`/api${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Não foi possível sincronizar os dados.');
  return body;
}

function hasLocalRecords() {
  return data.expenses.length || data.purchases.length || data.sales.length;
}

async function loadCloudData(migrate = false) {
  const response = await api('/state');
  if (response.state) {
    data = { expenses: response.state.expenses || [], purchases: response.state.purchases || [], sales: response.state.sales || [], quotes: [] };
    localStorage.setItem(key, JSON.stringify(data));
  } else if (migrate && hasLocalRecords()) {
    await api('/state', { method: 'PUT', body: JSON.stringify({ state: data }) });
  }
  render();
}

async function saveCloud() {
  if (!cloudToken) return;
  try {
    await api('/state', { method: 'PUT', body: JSON.stringify({ state: data }) });
  } catch (error) {
    console.error(error);
    document.querySelector('.side-note strong').textContent = 'Aguardando sincronização';
  }
}

function save() {
  localStorage.setItem(key, JSON.stringify(data));
  void saveCloud();
}

async function enterApp(migrate = false) {
  await loadCloudData(migrate);
  document.querySelector('#loginScreen').classList.add('hide');
  document.querySelector('#mainShell').classList.remove('hide');
  document.querySelector('.profile strong').textContent = 'QDB';
  document.querySelector('.avatar').textContent = 'QDB';
  render();
}

document.querySelector('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  const form = event.currentTarget;
  const loginError = document.querySelector('#loginError');
  const submit = form.querySelector('[type=submit]');
  submit.disabled = true;
  try {
    const formData = new FormData(form);
    const response = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username: formData.get('login'), password: formData.get('password') }) });
    cloudToken = response.token;
    const storage = formData.get('remember') ? localStorage : sessionStorage;
    storage.setItem(cloudTokenKey, cloudToken);
    loginError.classList.add('hide');
    await enterApp(true);
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hide');
  } finally {
    submit.disabled = false;
  }
}, true);

if (cloudToken) {
  api('/auth/me').then(() => enterApp(false)).catch(() => {
    cloudToken = '';
    localStorage.removeItem(cloudTokenKey);
    sessionStorage.removeItem(cloudTokenKey);
  });
}

setInterval(() => {
  if (cloudToken && !document.querySelector('#mainShell').classList.contains('hide')) void loadCloudData(false).catch(() => {});
}, 30000);
})();
