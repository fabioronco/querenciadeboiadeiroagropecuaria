(() => {
const key = 'querencia-boiadeiro-v2';
const seed = { expenses: [], purchases: [], sales: [], quotes: [], meta: { capitalInterestProvisioned: false } };
let data = JSON.parse(localStorage.getItem(key) || JSON.stringify(seed));
let currentView = 'dashboard';
let expenseReportFilters = { scope: 'all', categories: [] };
const app = document.querySelector('#app');
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const money = n => brl.format(Number(n || 0));
const today = new Date().toISOString().slice(0, 10);
const dateBR = d => d ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${d}T12:00:00`)) : '—';
const total = (rows, field = 'value') => rows.reduce((sum, x) => sum + Number(x[field] || 0), 0);
const isExpensePaid = row => row.paymentStatus !== 'A pagar';
const paidExpenses = () => data.expenses.filter(isExpensePaid);
const payableExpenses = () => data.expenses.filter(row => !isExpensePaid(row));
const expenseStatus = row => isExpensePaid(row) ? 'Pago' : 'A pagar';
const expenseStatusBadge = row => `<span class="pill ${isExpensePaid(row) ? '' : 'danger'}">${expenseStatus(row)}</span>`;
const dueThisMonth = () => {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return payableExpenses().filter(row => (row.dueDate || row.date || '').startsWith(prefix));
};
const parseNum = value => Number(String(value || '0').replace(',', '.')) || 0;
const esc = value => String(value || '').replace(/[&<>"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
function localRecord(row) {
  const copy = { ...row };
  // Fotos antigas em Base64 podem ocupar vários megabytes no navegador. O
  // lançamento financeiro permanece; apenas o arquivo local é omitido do cache.
  if (Array.isArray(copy.attachments)) copy.attachments = copy.attachments.map(file => ({ key:file.key || '', name:file.name || 'anexo', type:file.type || '', size:Number(file.size || 0), shared:Boolean(file.key || file.shared), localOnly:Boolean(file.localOnly || (!file.key && file.url)) }));
  return copy;
}
function saveLocalState(source = data) {
  try { localStorage.setItem(key, JSON.stringify(source)); }
  catch (error) {
    const compact = { expenses:(source.expenses || []).map(localRecord), purchases:(source.purchases || []).map(localRecord), sales:(source.sales || []).map(localRecord), quotes:source.quotes || [], meta:source.meta || {} };
    localStorage.setItem(key, JSON.stringify(compact));
  }
}
function save() { saveLocalState(data); }
function button(type, label = 'Novo lançamento') { return `<button class="btn primary" data-new="${type}">+ ${label}</button>`; }
function schedule() { const start = new Date(2026, 6, 15); return Array.from({ length:24 }, (_, i) => { const month=i+1, due=new Date(start); due.setMonth(start.getMonth()+i); const interest=month<=3?0:6500+(month<=15?1625:0); return { month, due, phase:month<=3?'Carência':month<=15?'Diluição':'Juros normais', interest, amortization:month===24?500000:0, payment:interest+(month===24?500000:0) }; }); }
function ensureCapitalInterestProvisions() {
  data.meta = data.meta || {};
  if (data.meta.capitalInterestProvisioned) return false;
  const provisions = schedule().filter(item => item.interest > 0).map(item => ({
    date: today,
    dueDate: item.due.toISOString().slice(0, 10),
    paymentStatus: 'A pagar',
    type: 'Despesa',
    category: 'Financeiro',
    lot: '',
    party: 'Capital de giro',
    value: item.interest,
    description: `Juros do capital de giro — Mês ${item.month}`,
    attachments: [],
    systemProvision: 'capital-interest',
    scheduleMonth: item.month,
  }));
  const existing = new Set(data.expenses.filter(row => row.systemProvision === 'capital-interest').map(row => Number(row.scheduleMonth)));
  data.expenses.push(...provisions.filter(row => !existing.has(row.scheduleMonth)));
  data.expenses.sort((a, b) => String(a.dueDate || a.date || '').localeCompare(String(b.dueDate || b.date || '')));
  data.meta.capitalInterestProvisioned = true;
  saveLocalState(data);
  return true;
}
function attachmentBadge(row, label = 'Anexos') { const count = (row.attachments || []).length; return count ? `<span class="attachment-badge">⌕ ${count} ${label}</span>` : '—'; }
function dashboard() { const p=total(data.purchases), s=total(data.sales), e=total(data.expenses), next=schedule().find(item=>item.due>=new Date()); return `<div class="content"><div class="hero"><div><p class="eyebrow">OPERAÇÃO EM UM SÓ LUGAR</p><h2>Bem-vindo, JF.</h2><p>Controle compras, vendas, custos, cotações e documentos da fazenda.</p></div>${button('purchase','Registrar compra')}</div><div class="cards"><div class="card"><div class="card-label">Compras de gado</div><div class="card-value">${money(p)}</div><div class="card-foot">${data.purchases.length} lote(s) registrado(s)</div></div><div class="card"><div class="card-label">Vendas de gado</div><div class="card-value green">${money(s)}</div><div class="card-foot">${data.sales.length} lote(s) registrado(s)</div></div><div class="card"><div class="card-label">Investimentos e gastos</div><div class="card-value red">${money(e)}</div><div class="card-foot">${data.expenses.length} lançamento(s)</div></div><div class="card"><div class="card-label">Resultado operacional</div><div class="card-value ${s-p-e>=0?'green':'red'}">${money(s-p-e)}</div><div class="card-foot">Vendas − compras − gastos</div></div></div><div class="grid-2"><div class="panel"><div class="panel-head"><div><h3>Próximo compromisso do capital de giro</h3><small>R$ 500.000 · 1,3% ao mês</small></div><button class="btn secondary" data-view-link="capital">Ver cronograma</button></div><div class="timeline">${next?`<div class="timeline-row"><div><strong>${dateBR(next.due.toISOString().slice(0,10))}</strong><br><small>Mês ${next.month}</small></div><div><strong>${next.phase}</strong><br><small>Pagamento previsto</small></div><div class="amount">${money(next.payment)}</div></div>`:'<p class="empty">Cronograma concluído.</p>'}</div></div><div class="panel"><div class="panel-head"><h3>Atalhos</h3></div><div class="timeline"><div class="timeline-row"><div>↓</div><div><strong>Compra de gado</strong><br><small>Com fotos e documentos do lote</small></div>${button('purchase','Adicionar')}</div><div class="timeline-row"><div>▣</div><div><strong>Gasto ou investimento</strong><br><small>Com orçamento e comprovantes</small></div>${button('expense','Adicionar')}</div><div class="timeline-row"><div>⌁</div><div><strong>Cotação de animais</strong><br><small>Compare propostas de compra e venda</small></div>${button('quote','Cotação')}</div></div></div></div></div>`; }
function capital() { const rows=schedule(); return `<div class="content"><div class="section-title"><div><h2>Capital de giro</h2><p>R$ 500.000 · 24 meses · juros de 1,3% ao mês</p></div><span class="pill gold">Carência: 3 meses</span></div><div class="cards"><div class="card"><div class="card-label">Juro mensal base</div><div class="card-value">${money(6500)}</div></div><div class="card"><div class="card-label">Juros da carência</div><div class="card-value">${money(19500)}</div><div class="card-foot">diluídos em 12 meses</div></div><div class="card"><div class="card-label">Total de juros</div><div class="card-value">${money(156000)}</div></div><div class="card"><div class="card-label">Total previsto</div><div class="card-value">${money(656000)}</div><div class="card-foot">inclui quitação do principal</div></div></div><div class="panel"><div class="panel-head"><div><h3>Cronograma de pagamento</h3><small>O principal está previsto para quitação no mês 24.</small></div></div><div class="table-wrap"><table><thead><tr><th>Mês</th><th>Vencimento</th><th>Fase</th><th>Juros</th><th>Amortização</th><th>Pagamento</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.month}</td><td>${dateBR(row.due.toISOString().slice(0,10))}</td><td><span class="pill ${row.phase==='Diluição'?'gold':''}">${row.phase}</span></td><td>${money(row.interest)}</td><td>${money(row.amortization)}</td><td class="amount">${money(row.payment)}</td></tr>`).join('')}</tbody></table></div></div></div>`; }
function lotPerformance(sale) { const purchase=data.purchases.find(row=>String(row.lot||'').trim().toLowerCase()===String(sale.lot||'').trim().toLowerCase()); if(!purchase) return 'Lote sem compra'; const cost=Number(purchase.value||0)+Number(purchase.freight||0), revenue=Number(sale.value||0)-Number(sale.freight||0), gain=revenue-cost, rate=cost?gain/cost*100:0; return `${money(gain)} (${rate.toFixed(1).replace('.',',')}%)`; }
function lotReport() { const todayMs=new Date().setHours(0,0,0,0); const rows=data.purchases.map(purchase=>{ const lot=String(purchase.lot||'').trim(); const sales=data.sales.filter(sale=>String(sale.lot||'').trim().toLowerCase()===lot.toLowerCase()); const cost=Number(purchase.value||0)+Number(purchase.freight||0); const revenue=sales.reduce((sum,sale)=>sum+Number(sale.value||0)-Number(sale.freight||0),0); const quantitySold=sales.reduce((sum,sale)=>sum+Number(sale.quantity||0),0); const quantityBought=Number(purchase.quantity||0); const lastSale=sales.map(sale=>sale.date).filter(Boolean).sort().at(-1); const start=new Date(`${purchase.date||today}T12:00:00`).getTime(); const end=lastSale?new Date(`${lastSale}T12:00:00`).getTime():todayMs; const days=Math.max(1,Math.round((end-start)/86400000)); const profit=revenue-cost; const gross=cost?profit/cost*100:0; const monthly=cost?(profit/days*30)/cost*100:0; const closed=quantityBought>0&&quantitySold>=quantityBought; return {lot:lot||'Sem lote',cost,revenue,profit,gross,monthly,days,quantityBought,quantitySold,lastSale,status:closed?'Finalizado':sales.length?'Venda parcial':'Em estoque'}; }); return `<div class="content"><div class="section-title"><div><h2>Rentabilidade por lote</h2><p>Retorno bruto e mensal calculados sobre o capital investido em cada lote.</p></div></div><div class="quote-note"><strong>Retorno mensal:</strong> (lucro ÷ dias em estoque × 30) ÷ custo de compra. Em vendas parciais, a venda acumulada é considerada até a última venda registrada.</div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Lote</th><th>Compra</th><th>Vendas acumuladas</th><th>Lucro</th><th>Ganho bruto</th><th>Dias em estoque</th><th>Retorno mensal</th><th>Status</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr><td><strong>${esc(row.lot)}</strong><br><small>${row.quantitySold}/${row.quantityBought||'—'} cabeças vendidas</small></td><td>${money(row.cost)}</td><td>${money(row.revenue)}</td><td class="${row.profit>=0?'green':'red'}">${money(row.profit)}</td><td>${row.gross.toFixed(2).replace('.',',')}%</td><td>${row.days} dia(s)</td><td class="${row.monthly>=0?'green':'red'}"><strong>${row.monthly.toFixed(2).replace('.',',')}% a.m.</strong></td><td><span class="pill ${row.status==='Finalizado'?'gold':''}">${row.status}</span></td></tr>`).join(''):`<tr><td class="empty" colspan="8">Cadastre uma compra de lote para acompanhar a rentabilidade.</td></tr>`}</tbody></table></div></div></div>`; }
function recordsView(kind) {
  const expense = kind === 'gastos';
  const cfg = expense
    ? { title:'Investimentos e gastos', desc:'Registre custos, despesas, provisões, orçamentos e comprovantes.', type:'expense', rows:data.expenses, cols:['Lançamento','Vencimento','Status','Tipo','Categoria','Descrição','Lote','Fornecedor','Valor','Documentos'], values:r=>[dateBR(r.date),dateBR(r.dueDate || r.date),expenseStatusBadge(r),r.type,r.category,r.description,r.lot,r.party,money(r.value),attachmentBadge(r)] }
    : kind === 'compras'
      ? { title:'Compras de gado', desc:'Lotes adquiridos, fotos e documentação da negociação.', type:'purchase', rows:data.purchases, cols:['Lote','Data','Animais','Sexo','Qtd.','Peso médio','Valor pago','Fotos / docs'], values:r=>[r.lot,dateBR(r.date),r.animalType,r.sex,r.quantity,`${r.avgWeight||'—'} kg`,money(r.value),attachmentBadge(r)] }
      : { title:'Vendas de gado', desc:'Lotes comercializados pela operação.', type:'sale', rows:data.sales, cols:['Lote','Data','Animais','Sexo','Qtd.','Peso médio','Valor recebido','Resultado','Documentos'], values:r=>[r.lot,dateBR(r.date),r.animalType,r.sex,r.quantity,`${r.avgWeight||'—'} kg`,money(r.value),lotPerformance(r),attachmentBadge(r)] };
  const summary = expense
    ? `<div class="summary-strip"><div>Total de lançamentos<strong>${cfg.rows.length}</strong></div><div>Pago / já saiu do caixa<strong class="green">${money(total(paidExpenses()))}</strong></div><div>A pagar / provisões<strong class="red">${money(total(payableExpenses()))}</strong></div><div>Vence neste mês<strong>${money(total(dueThisMonth()))}</strong></div></div>`
    : `<div class="summary-strip"><div>Total de lançamentos<strong>${cfg.rows.length}</strong></div><div>Valor acumulado<strong>${money(total(cfg.rows))}</strong></div><div>Documentos e fotos<strong>${cfg.rows.reduce((n,r)=>n+(r.attachments||[]).length,0)}</strong></div></div>`;
  return `<div class="content"><div class="section-title"><div><h2>${cfg.title}</h2><p>${cfg.desc}</p></div><div class="sheet-actions">${button(cfg.type)}</div></div>${summary}<div class="panel"><div class="table-wrap"><table><thead><tr>${cfg.cols.map(c=>`<th>${c}</th>`).join('')}<th></th></tr></thead><tbody>${cfg.rows.length?cfg.rows.map((row,index)=>`<tr>${cfg.values(row).map(v=>`<td>${v||'—'}</td>`).join('')}<td>${expense?`<button class="btn ${isExpensePaid(row)?'danger':'primary'}" data-payment-toggle="${index}">${isExpensePaid(row)?'Marcar a pagar':'Marcar pago'}</button> `:''}<button class="btn secondary" data-files="${cfg.type}" data-index="${index}">Ver</button> <button class="btn danger" data-delete="${cfg.type}" data-index="${index}">Excluir</button></td></tr>`).join(''):`<tr><td class="empty" colspan="${cfg.cols.length+1}">Ainda não há lançamentos. Use o botão para começar.</td></tr>`}</tbody></table></div></div></div>`;
}
function quotes() { const rows=data.quotes; return `<div class="content"><div class="section-title"><div><h2>Cotações de animais</h2><p>Compare oportunidades por praça, categoria, peso e preço.</p></div>${button('quote','Nova cotação')}</div><div class="quote-note"><strong>Campos essenciais:</strong> categoria, raça, sexo, idade/dentição, quantidade, peso médio, praça, preço por arroba ou kg, frete, comissão e condição de pagamento.</div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Data</th><th>Operação</th><th>Praça</th><th>Categoria / raça</th><th>Sexo</th><th>Qtd.</th><th>Peso médio</th><th>Preço</th><th>Condição</th><th></th></tr></thead><tbody>${rows.length?rows.map((row,index)=>`<tr><td>${dateBR(row.date)}</td><td><span class="pill ${row.operation==='Venda'?'gold':''}">${row.operation}</span></td><td>${esc(row.city)} / ${esc(row.state)}</td><td>${esc(row.category)} ${row.breed?`· ${esc(row.breed)}`:''}</td><td>${esc(row.sex)}</td><td>${esc(row.quantity)}</td><td>${esc(row.avgWeight)} kg</td><td>${money(row.price)} / ${esc(row.priceBasis)}</td><td>${esc(row.paymentTerms)}</td><td><button class="btn danger" data-delete="quote" data-index="${index}">Excluir</button></td></tr>`).join(''):`<tr><td class="empty" colspan="10">Cadastre uma cotação para começar a comparar oportunidades.</td></tr>`}</tbody></table></div></div></div>`; }
function render() { const titles={dashboard:'Visão geral',capital:'Capital de giro',gastos:'Investimentos e gastos',compras:'Compras de gado',vendas:'Vendas de gado',cotacoes:'Cotações de animais'}; document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView)); document.querySelector('#pageTitle').textContent=titles[currentView]; app.innerHTML=currentView==='dashboard'?dashboard():currentView==='capital'?capital():currentView==='cotacoes'?quotes():recordsView(currentView); bindPage(); }
const input=(name,label,type='text',options='',full=false)=>`<label class="${full?'full':''}">${label}<${type==='select'?'select':'input'} name="${name}" ${type==='date'?'type="date"':type==='number'?'type="number" step="0.01" min="0"':''}>${options}</${type==='select'?'select':'input'}></label>`;
const select=(name,label,items,full=false)=>input(name,label,'select',items.map(item=>`<option>${item}</option>`).join(''),full);
const upload=(label,accept,help)=>`<label class="full upload-field">${label}<input name="attachments" type="file" accept="${accept}" multiple /><small>${help} Máximo de 10 MB por arquivo.</small></label>`;
function openForm(type) { const dialog=document.querySelector('#recordDialog'), fields=document.querySelector('#formFields'); const expense=type==='expense', sale=type==='sale', quote=type==='quote'; document.querySelector('#modalTitle').textContent=quote?'Nova cotação de animais':expense?'Adicionar gasto ou investimento':sale?'Registrar venda de gado':'Registrar compra de gado'; document.querySelector('#modalEyebrow').textContent=quote?'COTAÇÃO DE MERCADO':expense?'INVESTIMENTOS E GASTOS':sale?'VENDA DE GADO':'COMPRA DE GADO'; if(quote) fields.innerHTML=input('date','Data','date')+select('operation','Operação',['Compra','Venda'])+select('category','Categoria',['Bezerro(a)','Desmama','Garrote','Novilho(a)','Boi magro','Boi gordo','Vaca','Matriz','Touro','Outro'])+input('breed','Raça / cruzamento')+select('sex','Sexo',['Macho','Fêmea','Misto'])+input('quantity','Quantidade','number')+input('avgWeight','Peso médio (kg)','number')+input('age','Idade ou dentição')+input('city','Praça / cidade')+input('state','Estado')+select('priceBasis','Base de preço',['@','kg vivo','cabeça','lote'])+input('price','Preço unitário (R$)','number')+input('freight','Frete estimado (R$)','number')+input('commission','Comissão (%)','number')+input('paymentTerms','Condição de pagamento')+input('source','Fonte / contato')+`<label class="full">Observações<textarea name="notes"></textarea></label>`; else if(expense) fields.innerHTML=input('date','Data do lançamento','date')+input('dueDate','Vencimento / previsão de pagamento','date')+select('paymentStatus','Situação do pagamento',['Pago','A pagar'])+select('type','Tipo',['Gasto','Investimento','Despesa'])+select('category','Categoria',['Frete','Alimentação','Sanidade','Mão de obra','Infraestrutura','Financeiro','Outro'])+input('lot','Lote relacionado')+input('party','Fornecedor / beneficiário')+input('value','Valor (R$)','number')+input('description','Descrição','text','',true); else fields.innerHTML=input('lot','Identificação do lote')+input('date','Data','date')+select('animalType','Tipo de animais',['Bezerro','Garrote','Novilho','Vaca','Boi magro','Boi gordo','Matriz','Touro','Outro'])+input('breed','Raça / cruzamento')+select('sex','Sexo',['Macho','Fêmea','Misto'])+input('quantity','Quantidade','number')+input('avgWeight','Peso médio (kg)','number')+input('freight','Custo de frete (R$)','number')+input('value',sale?'Valor recebido (R$)':'Valor pago (R$)','number')+input('party',sale?'Comprador':'Vendedor')+input('city','Cidade')+input('state','Estado')+`<label class="full">Observações<textarea name="notes"></textarea></label>`; fields.querySelector('[name=date]').value=today; if(expense) fields.querySelector('[name=dueDate]').value=today; dialog.dataset.type=type; dialog.showModal(); }
async function readFiles(files) { const selected=Array.from(files||[]).slice(0,6); return Promise.all(selected.map(async file=>{ if(file.size>10*1024*1024) throw new Error(`O arquivo ${file.name} é maior que 10 MB.`); return api('/attachments',{method:'POST',raw:true,headers:{'content-type':file.type||'application/octet-stream','x-file-name':encodeURIComponent(file.name)},body:file}); })); }
async function showFiles(type,index) { const map={expense:'expenses',purchase:'purchases',sale:'sales'}, row=data[map[type]][index], files=row.attachments||[]; if(!files.length) return alert('Este lançamento ainda não possui anexos.'); const popup=window.open('','_blank'); if(!popup) return alert('Permita a abertura de janela para visualizar os anexos.'); popup.document.write(`<title>Anexos</title><style>body{font-family:system-ui;padding:24px;color:#18251f}img{max-width:100%;height:auto;margin:12px 0}a{display:block;margin:12px 0;color:#164534}</style><h1>Anexos — ${esc(row.lot||row.description||'lançamento')}</h1><p>Carregando documentos...</p>`); try { const items=await Promise.all(files.map(async file=>{ if(file.key){const response=await fetch(`/api/attachments/${encodeURIComponent(file.key)}`,{headers:{authorization:`Bearer ${cloudToken}`}}); if(!response.ok) throw new Error(`Não foi possível abrir ${file.name}.`); return {...file,url:URL.createObjectURL(await response.blob())};} return file; })); if(items.some(file=>!file.url)) throw new Error('Um anexo antigo está disponível somente no aparelho em que foi incluído.'); popup.document.body.innerHTML=`<h1>Anexos — ${esc(row.lot||row.description||'lançamento')}</h1>${items.map(file=>file.type.startsWith('image/')?`<h3>${esc(file.name)}</h3><img src="${file.url}" alt="${esc(file.name)}">`:`<a download="${esc(file.name)}" href="${file.url}">Baixar ${esc(file.name)}</a>`).join('')}`; } catch(error) { popup.document.body.innerHTML=`<h1>Anexos</h1><p>${esc(error.message||'Não foi possível abrir os anexos.')}</p>`; } }
async function removeSharedAttachments(files) { await Promise.all((files||[]).filter(file=>file.key).map(file=>api(`/attachments/${encodeURIComponent(file.key)}`,{method:'DELETE'}).catch(()=>null))); }
function bindPage() { document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>openForm(b.dataset.new)); document.querySelectorAll('[data-view-link]').forEach(b=>b.onclick=()=>{currentView=b.dataset.viewLink;render();}); document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const map={expense:'expenses',purchase:'purchases',sale:'sales',quote:'quotes'}, rows=data[map[b.dataset.delete]], index=Number(b.dataset.index), row=rows[index]; if(!confirm('Excluir este lançamento?')) return; rows.splice(index,1); void removeSharedAttachments(row?.attachments); save();render();}); document.querySelectorAll('[data-files]').forEach(b=>b.onclick=()=>showFiles(b.dataset.files,Number(b.dataset.index))); document.querySelectorAll('[data-payment-toggle]').forEach(b=>b.onclick=()=>{ const row=data.expenses[Number(b.dataset.paymentToggle)]; row.paymentStatus=isExpensePaid(row)?'A pagar':'Pago'; save(); render(); }); }
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;document.querySelector('#sidebar').classList.remove('open');render();});
document.querySelector('#menuBtn').onclick=()=>document.querySelector('#sidebar').classList.toggle('open');
document.querySelector('#recordForm').addEventListener('submit',async event=>{ event.preventDefault(); try { const form=event.currentTarget, formData=new FormData(form), row=Object.fromEntries(formData.entries()); row.attachments=await readFiles(form.querySelector('[name=attachments]')?.files); ['value','freight','quantity','avgWeight','price','commission'].forEach(name=>row[name]=parseNum(row[name])); const map={expense:'expenses',purchase:'purchases',sale:'sales',quote:'quotes'};data[map[document.querySelector('#recordDialog').dataset.type]].unshift(row);save();document.querySelector('#recordDialog').close();render(); } catch(error) { alert(error.message || 'Não foi possível salvar os anexos.'); } });
document.querySelector('#loginForm').addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);const ok=f.get('login').trim().toUpperCase()==='JF'&&f.get('password')==='1708';document.querySelector('#loginError').classList.toggle('hide',ok);if(ok){sessionStorage.setItem('querencia-session','JF');document.querySelector('#loginScreen').classList.add('hide');document.querySelector('#mainShell').classList.remove('hide');render();}});
if(sessionStorage.getItem('querencia-session')==='JF'){document.querySelector('#loginScreen').classList.add('hide');document.querySelector('#mainShell').classList.remove('hide');render();}

// Versão sem o módulo de cotações externas.
function dashboard() {
  const p = data.purchases.reduce((sum, row) => sum + purchaseTotal(row), 0), s = data.sales.reduce((sum, row) => sum + saleNet(row), 0), paid = total(paidExpenses()), payable = total(payableExpenses()), monthDue = total(dueThisMonth());
  const next = schedule().find(item => item.due >= new Date());
  const cashResult = s - p - paid;
  const openingCash = 500000;
  const cashBalance = openingCash + cashResult;
  const uniqueLots = new Set(data.purchases.map(row => String(row.lot || '').trim().toLocaleLowerCase('pt-BR')).filter(Boolean)).size;
  const purchaseSummary = `${data.purchases.length} compra(s) em ${uniqueLots} lote(s)`;
  return `<div class="content"><div class="hero"><div><p class="eyebrow">OPERAÇÃO EM UM SÓ LUGAR</p><h2>Bem-vindo, JF.</h2><p>Controle compras, vendas, custos, provisões e documentos da fazenda.</p></div>${button('purchase','Registrar compra')}</div><section class="cash-scoreboard" aria-label="Placar do caixa"><div class="cash-score-main"><span>Saldo em caixa</span><strong class="${cashBalance>=0?'':'red'}">${money(cashBalance)}</strong><small>Capital inicial + vendas − compras e gastos pagos</small></div><div class="cash-score-item"><span>Capital inicial</span><strong>${money(openingCash)}</strong></div><div class="cash-score-item outgoing"><span>Compras de gado</span><strong>− ${money(p)}</strong><small>${purchaseSummary}</small></div><div class="cash-score-item outgoing"><span>Gastos pagos</span><strong>− ${money(paid)}</strong><small>Provisões não entram aqui</small></div><div class="cash-score-item incoming"><span>Vendas recebidas</span><strong>+ ${money(s)}</strong><small>${data.sales.length} venda(s) lançada(s)</small></div></section><div class="cards"><div class="card"><div class="card-label">Compras de gado</div><div class="card-value">${money(p)}</div><div class="card-foot">${purchaseSummary}</div></div><div class="card"><div class="card-label">Vendas de gado</div><div class="card-value green">${money(s)}</div><div class="card-foot">${data.sales.length} lote(s) registrado(s)</div></div><div class="card"><div class="card-label">Gastos pagos</div><div class="card-value red">${money(paid)}</div><div class="card-foot">Já abatidos do caixa</div></div><div class="card"><div class="card-label">Resultado operacional</div><div class="card-value ${cashResult>=0?'green':'red'}">${money(cashResult)}</div><div class="card-foot">Vendas − compras − gastos pagos</div></div></div><div class="grid-2"><div class="panel"><div class="panel-head"><div><h3>Próximo compromisso do capital de giro</h3><small>R$ 500.000 · 1,3% ao mês</small></div><button class="btn secondary" data-view-link="capital">Ver cronograma</button></div><div class="timeline">${next?`<div class="timeline-row"><div><strong>${dateBR(next.due.toISOString().slice(0,10))}</strong><br><small>Mês ${next.month}</small></div><div><strong>${next.phase}</strong><br><small>Pagamento previsto</small></div><div class="amount">${money(next.payment)}</div></div>`:'<p class="empty">Cronograma concluído.</p>'}</div></div><div class="panel"><div class="panel-head"><div><h3>Provisões de pagamentos</h3><small>Valores pendentes não abatidos do caixa.</small></div><button class="btn secondary" data-view-link="gastos">Ver lançamentos</button></div><div class="timeline"><div class="timeline-row"><div><strong class="red">${money(payable)}</strong><br><small>Total a pagar</small></div><div><strong>${money(monthDue)}</strong><br><small>Vencimento neste mês</small></div><div class="amount">${payableExpenses().length} pendente(s)</div></div></div></div></div></div>`;
}

function render() {
  const titles = { dashboard:'Visão geral', capital:'Capital de giro', gastos:'Investimentos e gastos', compras:'Compras de gado', vendas:'Vendas de gado', relatorios:'Rentabilidade por lote' };
  if (!titles[currentView]) currentView = 'dashboard';
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === currentView));
  document.querySelector('#pageTitle').textContent = titles[currentView];
  app.innerHTML = currentView === 'dashboard' ? dashboard() : currentView === 'capital' ? capital() : currentView === 'relatorios' ? lotReport() : recordsView(currentView);
  bindPage();
}

// Centro de custo por lote: compras, despesas, perdas e vendas movimentam o
// mesmo estoque. Isso permite chegar ao custo médio real por animal.
const lotText = value => String(value || '').trim();
const lotId = value => lotText(value).toLocaleLowerCase('pt-BR');
const number = value => Number(value || 0) || 0;
const purchaseTotal = row => number(row.value) * number(row.quantity) + number(row.freight);
const saleGross = row => number(row.value) * number(row.quantity);
const saleNet = row => saleGross(row) - number(row.freight);
const allOption = value => !value || ['todos', 'todo o lote', 'misto'].includes(lotId(value));
const animalGroups = ['Bezerro','Garrote','Novilho','Vaca','Boi magro','Boi gordo','Matriz','Touro','Outro'];
const groupId = row => `${lotId(row.animalType || row.lossAnimalType || row.expenseAnimalType)}|${lotId(row.sex || row.lossSex || row.expenseSex)}`;
const groupName = row => `${row.animalType || row.lossAnimalType || row.expenseAnimalType || 'Animais'} · ${row.sex || row.lossSex || row.expenseSex || 'Misto'}`;
const dateValue = row => String(row.date || row.dueDate || today);

function selectedGroups(groups, row) {
  const loss = lotId(row.category) === 'perda de animais' || number(row.lossQuantity) > 0;
  const type = lotId(loss ? row.lossAnimalType : (row.expenseAnimalType || row.animalType));
  const sex = lotId(loss ? row.lossSex : (row.expenseSex || row.sex));
  const exact = [...groups.values()].filter(group => (!type || allOption(type) || group.type === type) && (!sex || allOption(sex) || group.sex === sex));
  return exact.length ? exact : [...groups.values()];
}

function lotAnalytics() {
  const lots = new Map();
  const purchaseAverageByLot = new Map();
  data.purchases.filter(row => lotText(row.lot)).forEach(row => {
    const id = lotId(row.lot);
    const current = purchaseAverageByLot.get(id) || { total: 0, count: 0 };
    current.total += number(row.value);
    current.count += 1;
    purchaseAverageByLot.set(id, current);
  });
  const ensureLot = lot => {
    const id = lotId(lot);
    if (!lots.has(id)) lots.set(id, { id, name: lotText(lot) || 'Sem lote', groups: new Map(), expenses: 0, provisions: 0, purchases: 0, sales: 0, revenue: 0, soldCost: 0, warnings: [] });
    return lots.get(id);
  };
  const ensureGroup = (lot, row) => {
    const id = groupId(row);
    if (!lot.groups.has(id)) lot.groups.set(id, { id, label: groupName(row), type: lotId(row.animalType || row.lossAnimalType || row.expenseAnimalType), sex: lotId(row.sex || row.lossSex || row.expenseSex), bought: 0, lost: 0, sold: 0, live: 0, cost: 0, revenue: 0, soldCost: 0 });
    return lot.groups.get(id);
  };
  const events = [
    ...data.purchases.filter(row => lotText(row.lot)).map(row => ({ kind: 'purchase', row, rank: 1 })),
    ...data.expenses.filter(row => lotText(row.lot) && !row.systemProvision).map(row => ({ kind: lotId(row.category) === 'perda de animais' || number(row.lossQuantity) > 0 ? 'loss' : 'expense', row, rank: 2 })),
    ...data.sales.filter(row => lotText(row.lot)).map(row => ({ kind: 'sale', row, rank: 3 })),
  ].sort((a, b) => dateValue(a.row).localeCompare(dateValue(b.row)) || a.rank - b.rank);

  for (const event of events) {
    const lot = ensureLot(event.row.lot);
    if (event.kind === 'purchase') {
      const group = ensureGroup(lot, event.row);
      const quantity = number(event.row.quantity);
      const purchaseAverage = purchaseAverageByLot.get(lot.id);
      const unitPrice = purchaseAverage ? purchaseAverage.total / purchaseAverage.count : number(event.row.value);
      const cost = unitPrice * quantity + number(event.row.freight);
      group.bought += quantity; group.live += quantity; group.cost += cost; lot.purchases += cost;
      continue;
    }
    if (event.kind === 'expense') {
      const value = number(event.row.value);
      if (!isExpensePaid(event.row)) { lot.provisions += value; continue; }
      const groups = selectedGroups(lot.groups, event.row).filter(group => group.live > 0);
      const heads = groups.reduce((sum, group) => sum + group.live, 0);
      if (!heads) { lot.warnings.push(`Despesa sem animais em estoque: ${event.row.description || event.row.category}`); continue; }
      groups.forEach(group => { group.cost += value * group.live / heads; });
      lot.expenses += value;
      continue;
    }
    if (event.kind === 'loss') {
      const quantity = number(event.row.lossQuantity || event.row.quantity);
      const groups = selectedGroups(lot.groups, event.row).filter(group => group.live > 0);
      let remaining = quantity;
      let removedCost = 0;
      for (const group of groups) {
        const removed = Math.min(group.live, remaining);
        const unitCost = group.live ? group.cost / group.live : 0;
        const cost = unitCost * removed;
        group.cost -= cost;
        removedCost += cost;
        group.live -= removed; group.lost += removed; remaining -= removed;
        if (!remaining) break;
      }
      if (remaining > 0) lot.warnings.push(`Perda informada maior que o estoque: ${number(event.row.lossQuantity || event.row.quantity)} cabeça(s).`);
      const lossValue = number(event.row.value) || removedCost;
      if (!isExpensePaid(event.row)) { lot.provisions += lossValue; continue; }
      const survivors = groups.filter(group => group.live > 0);
      if (!survivors.length) survivors.push(...[...lot.groups.values()].filter(group => group.live > 0));
      const heads = survivors.reduce((sum, group) => sum + group.live, 0);
      if (heads) survivors.forEach(group => { group.cost += lossValue * group.live / heads; });
      if (lossValue) lot.expenses += lossValue;
      continue;
    }
    const saleGroup = ensureGroup(lot, event.row);
    const groups = saleGroup.live > 0 ? [saleGroup] : selectedGroups(lot.groups, event.row).filter(group => group.live > 0);
    let remaining = number(event.row.quantity);
    let soldCost = 0;
    for (const group of groups) {
      const sold = Math.min(group.live, remaining);
      const unitCost = group.live ? group.cost / group.live : 0;
      const cost = unitCost * sold;
      group.live -= sold; group.sold += sold; group.cost -= cost; group.soldCost += cost; soldCost += cost; remaining -= sold;
      if (!remaining) break;
    }
    const revenue = saleNet(event.row);
    saleGroup.revenue += revenue; lot.sales += number(event.row.quantity); lot.revenue += revenue; lot.soldCost += soldCost;
    if (remaining > 0) lot.warnings.push(`Venda de ${event.row.quantity} cabeça(s) excede o estoque disponível no lançamento de ${dateBR(event.row.date)}.`);
  }
  return [...lots.values()].filter(lot => lot.groups.size);
}

function lotPerformance(sale) {
  const lot = lotAnalytics().find(item => item.id === lotId(sale.lot));
  if (!lot) return 'Lote sem compra';
  const result = lot.revenue - lot.soldCost;
  return `${money(result)} (${lot.soldCost ? (result / lot.soldCost * 100).toFixed(1).replace('.', ',') : '0,0'}%)`;
}

function lotReport() {
  const lots = lotAnalytics();
  return `<div class="content"><div class="section-title"><div><h2>Rentabilidade e custo por lote</h2><p>Cada despesa identificada com o lote entra automaticamente no custo do rebanho.</p></div></div><div class="quote-note"><strong>Como lançar:</strong> em <em>Investimentos e gastos</em>, informe o lote e escolha se o custo vale para todo o lote ou para uma categoria/sexo. Para morte, escolha <strong>Perda de animais</strong> e informe a quantidade. O custo da perda permanece nos animais vivos, elevando o custo médio real.</div>${lots.length ? lots.map(lot => { const live = [...lot.groups.values()].reduce((sum, group) => sum + group.live, 0); const bought = [...lot.groups.values()].reduce((sum, group) => sum + group.bought, 0); const lost = [...lot.groups.values()].reduce((sum, group) => sum + group.lost, 0); const inventory = [...lot.groups.values()].reduce((sum, group) => sum + group.cost, 0); const result = lot.revenue - lot.soldCost; const rate = lot.soldCost ? result / lot.soldCost * 100 : 0; return `<section class="panel"><div class="panel-head"><div><h3>Lote ${esc(lot.name)}</h3><small>${bought} comprado(s) · ${lot.sales} vendido(s) · ${lost} perda(s) · ${live} em estoque</small></div><span class="pill ${live ? 'gold' : ''}">${live ? 'Em estoque' : 'Encerrado'}</span></div><div class="summary-strip"><div>Compras<strong>${money(lot.purchases)}</strong></div><div>Despesas pagas do lote<strong>${money(lot.expenses)}</strong></div><div>Custo em estoque<strong>${money(inventory)}</strong></div><div>Custo médio atual<strong>${live ? money(inventory / live) : '—'} / cabeça</strong></div><div>Resultado das vendas<strong class="${result >= 0 ? 'green' : 'red'}">${money(result)} (${rate.toFixed(2).replace('.', ',')}%)</strong></div>${lot.provisions ? `<div>A pagar (fora do custo)<strong class="red">${money(lot.provisions)}</strong></div>` : ''}</div><div class="table-wrap"><table><thead><tr><th>Categoria / sexo</th><th>Comprados</th><th>Perdas</th><th>Vendidos</th><th>Estoque</th><th>Custo em estoque</th><th>Custo médio / cabeça</th><th>Vendas</th><th>Resultado vendido</th></tr></thead><tbody>${[...lot.groups.values()].map(group => { const resultGroup = group.revenue - group.soldCost; return `<tr><td><strong>${esc(group.label)}</strong></td><td>${group.bought}</td><td class="${group.lost ? 'red' : ''}">${group.lost}</td><td>${group.sold}</td><td>${group.live}</td><td>${money(group.cost)}</td><td>${group.live ? money(group.cost / group.live) : '—'}</td><td>${money(group.revenue)}</td><td class="${resultGroup >= 0 ? 'green' : 'red'}">${group.sold ? money(resultGroup) : '—'}</td></tr>`; }).join('')}</tbody></table></div>${lot.warnings.length ? `<p class="empty">⚠ ${lot.warnings.map(esc).join(' ')}</p>` : ''}</section>`; }).join('') : `<div class="panel"><p class="empty">Cadastre compras de gado com identificação de lote para acompanhar o custo médio.</p></div>`}</div>`;
}

function recordsView(kind) {
  const expense = kind === 'gastos';
  const expenseCategories = [...new Set(['Frete','Despesa de viagem','Alimentação','Sanidade','Medicamento','Mão de obra','Insumo','Infraestrutura','Financeiro','Perda de animais','Outro', ...data.expenses.map(row => row.category).filter(Boolean)])];
  const filteredExpenses = data.expenses.filter(row => {
    const hasLot = Boolean(lotText(row.lot));
    const scopeMatches = expenseReportFilters.scope === 'all' || (expenseReportFilters.scope === 'lot' ? hasLot : !hasLot);
    const categoryMatches = !expenseReportFilters.categories.length || expenseReportFilters.categories.includes(row.category);
    return scopeMatches && categoryMatches;
  }).sort((a,b) => dateValue(b).localeCompare(dateValue(a)));
  const cfg = expense
    ? { title:'Investimentos e gastos', desc:'Lance todo custo do lote: frete, viagem, insumo, medicamento ou perdas.', type:'expense', rows:filteredExpenses, cols:['Lançamento','Vencimento','Status','Tipo','Categoria','Descrição','Lote / alocação','Perda','Fornecedor','Valor'], values:r=>[dateBR(r.date),dateBR(r.dueDate || r.date),expenseStatusBadge(r),r.type,r.category,r.description,`${r.lot || '—'}${r.expenseAnimalType && !allOption(r.expenseAnimalType) ? ` · ${r.expenseAnimalType} ${r.expenseSex || ''}` : ''}`,number(r.lossQuantity) ? `${r.lossQuantity} ${r.lossAnimalType || 'animal(is)'}` : '—',r.party,money(r.value)] }
    : kind === 'compras'
      ? { title:'Compras de gado', desc:'Cada compra pode entrar no mesmo lote; o relatório consolida o custo médio.', type:'purchase', rows:data.purchases, cols:['Lote','Data','Animais','Sexo','Qtd.','Peso médio','Valor pago'], values:r=>[r.lot,dateBR(r.date),r.animalType,r.sex,r.quantity,`${r.avgWeight||'—'} kg`,money(number(r.value)+number(r.freight))] }
      : { title:'Vendas de gado', desc:'Vendas parciais são confrontadas com o custo médio da categoria dentro do lote.', type:'sale', rows:data.sales, cols:['Lote','Data','Animais','Sexo','Qtd.','Peso médio','Valor recebido','Resultado'], values:r=>[r.lot,dateBR(r.date),r.animalType,r.sex,r.quantity,`${r.avgWeight||'—'} kg`,money(r.value),lotPerformance(r)] };
  const filteredPaid = cfg.rows.filter(isExpensePaid);
  const filteredPayable = cfg.rows.filter(row => !isExpensePaid(row));
  const filterPanel = expense ? `<section class="panel expense-report"><div class="panel-head"><div><h3>Relatório de gastos</h3><small>Combine categorias e separe os custos dos lotes dos gastos gerais da operação.</small></div><button class="btn secondary" data-print-expense-report>Imprimir relatório</button></div><div class="expense-filter-grid"><label>Origem do gasto<select data-expense-scope><option value="all" ${expenseReportFilters.scope==='all'?'selected':''}>Todos os gastos</option><option value="general" ${expenseReportFilters.scope==='general'?'selected':''}>Somente gerais / sem lote</option><option value="lot" ${expenseReportFilters.scope==='lot'?'selected':''}>Somente vinculados a lote</option></select></label><div class="expense-category-filter"><strong>Categorias (selecione uma ou mais)</strong><div class="filter-options">${expenseCategories.map(category => `<label><input type="checkbox" data-expense-category value="${esc(category)}" ${expenseReportFilters.categories.includes(category)?'checked':''}> ${esc(category)}</label>`).join('')}</div></div></div><div class="sheet-actions"><button class="btn secondary" data-clear-expense-filter>Limpar filtros</button></div></section>` : '';
  const summary = expense ? `<div class="summary-strip"><div>Lançamentos filtrados<strong>${cfg.rows.length}</strong></div><div>Total do relatório<strong>${money(total(cfg.rows))}</strong></div><div>Pago / já saiu do caixa<strong class="green">${money(total(filteredPaid))}</strong></div><div>A pagar / provisões<strong class="red">${money(total(filteredPayable))}</strong></div></div>` : `<div class="summary-strip"><div>Total de lançamentos<strong>${cfg.rows.length}</strong></div><div>Valor acumulado<strong>${money(total(cfg.rows))}</strong></div></div>`;
  return `<div class="content"><div class="section-title"><div><h2>${cfg.title}</h2><p>${cfg.desc}</p></div><div class="sheet-actions">${button(cfg.type)}</div></div>${filterPanel}${summary}<div class="panel"><div class="table-wrap"><table><thead><tr>${cfg.cols.map(c=>`<th>${c}</th>`).join('')}<th></th></tr></thead><tbody>${cfg.rows.length ? cfg.rows.map(row=>{ const index=data[cfg.type === 'expense' ? 'expenses' : cfg.type === 'purchase' ? 'purchases' : 'sales'].indexOf(row); return `<tr>${cfg.values(row).map(value=>`<td>${value||'—'}</td>`).join('')}<td>${expense ? `<button class="btn ${isExpensePaid(row)?'danger':'primary'}" data-payment-toggle="${index}">${isExpensePaid(row)?'Marcar a pagar':'Marcar pago'}</button> ` : ''}<button class="btn danger" data-delete="${cfg.type}" data-index="${index}">Excluir</button></td></tr>`; }).join('') : `<tr><td class="empty" colspan="${cfg.cols.length+1}">Nenhum lançamento corresponde aos filtros selecionados.</td></tr>`}</tbody></table></div></div></div>`;
}

function printExpenseReport() {
  const rows = data.expenses.filter(row => {
    const hasLot = Boolean(lotText(row.lot));
    const scopeMatches = expenseReportFilters.scope === 'all' || (expenseReportFilters.scope === 'lot' ? hasLot : !hasLot);
    const categoryMatches = !expenseReportFilters.categories.length || expenseReportFilters.categories.includes(row.category);
    return scopeMatches && categoryMatches;
  }).sort((a,b) => dateValue(a).localeCompare(dateValue(b)));
  const scopeName = { all:'Todos os gastos', general:'Somente gerais / sem lote', lot:'Somente vinculados a lote' }[expenseReportFilters.scope];
  const categories = expenseReportFilters.categories.length ? expenseReportFilters.categories.join(', ') : 'Todas as categorias';
  const popup = window.open('', '_blank');
  if (!popup) return alert('Permita a abertura de janela para imprimir o relatório.');
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de investimentos e gastos</title><style>body{font-family:Arial,sans-serif;color:#18251f;margin:32px}h1{margin:0 0 4px}p{color:#617169;margin:5px 0}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:12px}th,td{padding:10px 8px;border-bottom:1px solid #dfe8e2;text-align:left}th{background:#f2f7f3;color:#526058}strong{font-size:17px}.total{margin-top:18px;font-size:18px}.brand{color:#176044;font-weight:bold;letter-spacing:1px}</style></head><body><div class="brand">QUERÊNCIA DE BOIADEIRO AGROPECUÁRIA</div><h1>Relatório de investimentos e gastos</h1><p><strong>Origem:</strong> ${esc(scopeName)} · <strong>Categorias:</strong> ${esc(categories)}</p><p><strong>Gerado em:</strong> ${dateBR(today)}</p><table><thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Lote</th><th>Fornecedor</th><th>Situação</th><th>Valor</th></tr></thead><tbody>${rows.map(row => `<tr><td>${dateBR(row.date)}</td><td>${esc(row.category)}</td><td>${esc(row.description)}</td><td>${esc(row.lot || '—')}</td><td>${esc(row.party || '—')}</td><td>${esc(expenseStatus(row))}</td><td>${money(row.value)}</td></tr>`).join('') || '<tr><td colspan="7">Nenhum lançamento encontrado.</td></tr>'}</tbody></table><p class="total"><strong>Total do relatório: ${money(total(rows))}</strong></p><script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
}

function openForm(type) {
  const dialog = document.querySelector('#recordDialog'), fields = document.querySelector('#formFields');
  const expense = type === 'expense', sale = type === 'sale', quote = type === 'quote';
  document.querySelector('#modalTitle').textContent = quote ? 'Nova cotação de animais' : expense ? 'Adicionar gasto ou investimento' : sale ? 'Registrar venda de gado' : 'Registrar compra de gado';
  document.querySelector('#modalEyebrow').textContent = quote ? 'COTAÇÃO DE MERCADO' : expense ? 'INVESTIMENTOS E GASTOS' : sale ? 'VENDA DE GADO' : 'COMPRA DE GADO';
  if (quote) { fields.innerHTML = input('date','Data','date') + select('operation','Operação',['Compra','Venda']) + select('category','Categoria',['Bezerro(a)','Desmama','Garrote','Novilho(a)','Boi magro','Boi gordo','Vaca','Matriz','Touro','Outro']) + input('breed','Raça / cruzamento') + select('sex','Sexo',['Macho','Fêmea','Misto']) + input('quantity','Quantidade','number') + input('avgWeight','Peso médio (kg)','number') + input('city','Praça / cidade') + input('state','Estado') + select('priceBasis','Base de preço',['@','kg vivo','cabeça','lote']) + input('price','Preço unitário (R$)','number') + input('paymentTerms','Condição de pagamento') + `<label class="full">Observações<textarea name="notes"></textarea></label>`; }
  else if (expense) { fields.innerHTML = input('date','Data do lançamento','date') + input('dueDate','Vencimento / previsão de pagamento','date') + select('paymentStatus','Situação do pagamento',['Pago','A pagar']) + select('type','Tipo',['Gasto','Investimento','Despesa']) + select('category','Categoria',['Frete','Despesa de viagem','Alimentação','Sanidade','Medicamento','Mão de obra','Insumo','Infraestrutura','Financeiro','Perda de animais','Outro']) + input('lot','Lote relacionado') + select('expenseAnimalType','Aplicar custo a',['Todo o lote',...animalGroups]) + select('expenseSex','Sexo / grupo',['Todos','Macho','Fêmea','Misto']) + input('lossQuantity','Quantidade perdida (somente se for perda)','number') + select('lossAnimalType','Tipo dos animais perdidos',['Todos',...animalGroups]) + select('lossSex','Sexo dos animais perdidos',['Todos','Macho','Fêmea','Misto']) + input('party','Fornecedor / beneficiário (opcional)') + input('value','Valor (R$)','number') + input('description','Descrição','text','',true) + `<p class="quote-note full"><strong>Perda de animais:</strong> escolha essa categoria, informe lote, quantidade, tipo e sexo. No valor, informe o total das cabeças perdidas; ele entra uma única vez como custo dos animais que restarem.</p>`; }
  else { fields.innerHTML = input('lot','Identificação do lote') + input('date','Data','date') + (sale ? '' : select('entryCategory','Categoria do lançamento',['Animal'])) + select('animalType','Tipo de animais',animalGroups) + input('breed','Raça / cruzamento') + select('sex','Sexo',['Macho','Fêmea','Misto']) + input('quantity','Quantidade','number') + input('avgWeight','Peso médio (kg)','number') + input('freight',sale ? 'Frete da venda (R$)' : 'Custo de frete (R$)','number') + input('value','Valor por cabeça (R$)','number') + input('party',sale ? 'Comprador' : 'Vendedor') + input('city','Cidade') + input('state','Estado') + `<label class="full">Observações<textarea name="notes"></textarea></label>`; }
  fields.querySelector('[name=date]').value = today;
  if (expense) fields.querySelector('[name=dueDate]').value = today;
  if (expense) {
    const category = fields.querySelector('[name=category]');
    const valueLabel = fields.querySelector('[name=value]').closest('label');
    const allocation = ['expenseAnimalType','expenseSex'].map(name => fields.querySelector(`[name="${name}"]`).closest('label'));
    const lossFields = ['lossQuantity','lossAnimalType','lossSex'].map(name => fields.querySelector(`[name="${name}"]`).closest('label'));
    const updateLossFields = () => {
      const loss = lotId(category.value) === 'perda de animais';
      allocation.forEach(label => label.hidden = loss);
      lossFields.forEach(label => label.hidden = !loss);
      valueLabel.firstChild.textContent = loss ? 'Valor total da perda (R$)' : 'Valor (R$)';
    };
    category.addEventListener('change', updateLossFields);
    updateLossFields();
  }
  dialog.dataset.type = type; dialog.showModal();
}

render();

// Sincronização segura entre aparelhos via Cloudflare Pages Functions + D1.
const cloudTokenKey = 'querencia-cloud-token';
let cloudToken = localStorage.getItem(cloudTokenKey) || sessionStorage.getItem(cloudTokenKey) || '';

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!options.raw && !headers['content-type']) headers['content-type'] = 'application/json';
  if (cloudToken) headers.authorization = `Bearer ${cloudToken}`;
  const response = await fetch(`/api${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Não foi possível sincronizar os dados.');
  return body;
}

function hasLocalRecords() {
  return data.expenses.length || data.purchases.length || data.sales.length;
}

// Anexos ficam no aparelho que os recebeu. Enviar fotos em Base64 junto de todo
// o banco a cada lançamento fazia o D1 receber vários megabytes e interrompia a
// sincronização dos lançamentos financeiros.
function cloudRecord(row) {
  const record = { ...row };
  if (Array.isArray(row.attachments)) {
    record.attachments = row.attachments.map(file => ({
      key: file.key || '', name: file.name || 'anexo', type: file.type || '', size: Number(file.size || 0), shared: Boolean(file.key || file.shared), localOnly: Boolean(!file.key && (file.url || file.localOnly))
    }));
  }
  return record;
}

function cloudState(source = data) {
  return {
    expenses: (source.expenses || []).map(cloudRecord),
    purchases: (source.purchases || []).map(cloudRecord),
    sales: (source.sales || []).map(cloudRecord),
    meta: source.meta || {}
  };
}

function rowKey(type, row) {
  return row.id || [type, row.date || '', row.dueDate || '', row.lot || '', row.description || '', row.party || row.seller || row.buyer || '', Number(row.value || 0), Number(row.quantity || 0), Number(row.freight || 0)].join('|');
}

// Chave de compatibilidade para registros antigos, criados antes do ID próprio.
// O lote não entra nela, justamente para reconhecer a mesma despesa quando o
// usuário apenas informa ou altera o lote durante uma edição.
function legacyRowKey(type, row) {
  return [type, row.date || '', row.dueDate || '', row.description || '', row.category || '', row.party || row.seller || row.buyer || '', Number(row.value || 0), Number(row.quantity || 0), Number(row.freight || 0)].join('|');
}

function preferRecord(current, incoming) {
  const currentTime = Number(current.updatedAt || 0), incomingTime = Number(incoming.updatedAt || 0);
  if (incomingTime > currentTime) return { ...current, ...incoming, id: incoming.id || current.id };
  if (incomingTime < currentTime) return { ...incoming, ...current, id: current.id || incoming.id };
  if (!lotText(current.lot) && lotText(incoming.lot)) return { ...current, ...incoming, id: incoming.id || current.id };
  return { ...incoming, ...current, id: current.id || incoming.id };
}

function mergeRows(type, remoteRows, localRows) {
  // Agrupa antes de comparar. A versão anterior procurava cada lançamento na
  // lista inteira; com muitos registros duplicados isso travava o navegador.
  const groups = new Map();
  [...(remoteRows || []), ...(localRows || [])].forEach(row => {
    const legacy = legacyRowKey(type, row);
    if (!groups.has(legacy)) groups.set(legacy, []);
    groups.get(legacy).push(row);
  });
  const result = [];
  groups.forEach(rows => {
    const identified = new Map();
    const legacyRows = [];
    rows.forEach(row => {
      if (!row.id) { legacyRows.push(row); return; }
      identified.set(row.id, identified.has(row.id) ? preferRecord(identified.get(row.id), row) : row);
    });
    if (identified.size === 1 && legacyRows.length) {
      let chosen = [...identified.values()][0];
      legacyRows.forEach(row => { chosen = preferRecord(row, chosen); });
      result.push(chosen);
      return;
    }
    if (!identified.size) {
      const withLot = legacyRows.filter(row => lotText(row.lot));
      const withoutLot = legacyRows.filter(row => !lotText(row.lot));
      // Um lançamento sem lote e outro igual com lote é a duplicação gerada
      // pela edição; mantém a versão vinculada ao lote.
      if (withLot.length && withoutLot.length) {
        let chosen = withLot.reduce(preferRecord);
        withoutLot.forEach(row => { chosen = preferRecord(row, chosen); });
        result.push(chosen);
        return;
      }
      // Registros exatamente iguais também são cópias de sincronização.
      const exact = new Map();
      legacyRows.forEach(row => {
        const key = rowKey(type, row);
        exact.set(key, exact.has(key) ? preferRecord(exact.get(key), row) : row);
      });
      result.push(...exact.values());
      return;
    }
    result.push(...identified.values(), ...legacyRows);
  });
  return result;
}

function mergeCloudWithLocal(remote) {
  return {
    expenses: mergeRows('expense', remote.expenses, data.expenses),
    purchases: mergeRows('purchase', remote.purchases, data.purchases),
    sales: mergeRows('sale', remote.sales, data.sales),
    quotes: data.quotes || [],
    meta: { ...(remote.meta || {}), ...(data.meta || {}) }
  };
}

function needsCloudWrite(remote, merged) {
  return JSON.stringify(cloudState(remote)) !== JSON.stringify(cloudState(merged)) ||
    JSON.stringify(remote) !== JSON.stringify(cloudState(remote));
}

function setSyncStatus(text) {
  const status = document.querySelector('.side-note strong');
  if (status) status.textContent = text;
}

async function loadCloudData(migrate = false) {
  const response = await api('/state');
  if (response.state) {
    const remote = { expenses: response.state.expenses || [], purchases: response.state.purchases || [], sales: response.state.sales || [], meta: response.state.meta || {} };
    // Depois que o banco compartilhado existe, ele é a fonte oficial. Mesclar
    // uma cópia antiga do navegador com o estado remoto fazia lançamentos já
    // excluídos reaparecerem na tela e voltarem para o banco no próximo ciclo.
    data = remote;
    saveLocalState(data);
  } else if (migrate && hasLocalRecords()) {
    await api('/state', { method: 'PUT', body: JSON.stringify({ state: cloudState(data) }) });
  }
  if (ensureCapitalInterestProvisions()) await api('/state', { method: 'PUT', body: JSON.stringify({ state: cloudState(data) }) });
  setSyncStatus('Dados compartilhados');
  render();
}

async function saveCloud() {
  if (!cloudToken) return false;
  setSyncStatus('Sincronizando...');
  try {
    await api('/state', { method: 'PUT', body: JSON.stringify({ state: cloudState(data) }) });
    setSyncStatus('Dados compartilhados');
    return true;
  } catch (error) {
    console.error(error);
    setSyncStatus('Falha ao sincronizar');
    return false;
  }
}

function save() {
  saveLocalState(data);
  return saveCloud();
}

async function removeRecord(type, index) {
  const map = { expense:'expenses', purchase:'purchases', sale:'sales', quote:'quotes' };
  const rows = data[map[type]];
  const row = rows?.[index];
  if (!row) return false;
  rows.splice(index, 1);
  saveLocalState(data);
  const synced = await saveCloud();
  if (!synced) {
    rows.splice(index, 0, row);
    saveLocalState(data);
    return false;
  }
  void removeSharedAttachments(row.attachments);
  return true;
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
    try { storage.setItem(cloudTokenKey, cloudToken); }
    catch (storageError) { sessionStorage.setItem(cloudTokenKey, cloudToken); }
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

window.addEventListener('online', () => { if (cloudToken) void saveCloud(); });

// Visão operacional de compras: cada lote é uma ficha única, com todas as
// compras de animais e custos vinculados reunidos no mesmo lugar.
function expenseForLot(lot) {
  return data.expenses.filter(row => lotId(row.lot) === lot.id && !row.systemProvision);
}

function lotCostBreakdown(lot) {
  const purchases = data.purchases.filter(row => lotId(row.lot) === lot.id);
  const expenses = expenseForLot(lot);
  const animalsBought = purchases.reduce((sum, row) => sum + number(row.quantity), 0);
  // O valor informado na compra é o preço por cabeça. O preço médio do lote é
  // a média das compras; depois ele é aplicado à quantidade total adquirida.
  const animalValue = purchases.length ? purchases.reduce((sum, row) => sum + number(row.value), 0) / purchases.length : 0;
  const animalPurchaseTotal = animalValue * animalsBought;
  const purchaseFreight = purchases.reduce((sum, row) => sum + number(row.freight), 0);
  const paidExpenses = expenses.filter(isExpensePaid);
  const expenseFreight = paidExpenses.filter(row => lotId(row.category) === 'frete').reduce((sum, row) => sum + number(row.value), 0);
  const otherExpenses = paidExpenses.filter(row => lotId(row.category) !== 'frete').reduce((sum, row) => sum + number(row.value), 0);
  const payable = expenses.filter(row => !isExpensePaid(row)).reduce((sum, row) => sum + number(row.value), 0);
  return { purchases, expenses, animalsBought, animalValue, animalPurchaseTotal, purchaseFreight, expenseFreight, otherExpenses, payable };
}

function lotSummaryRow(lot) {
  const groups = [...lot.groups.values()];
  const heads = groups.reduce((sum, group) => sum + group.live, 0);
  const bought = groups.reduce((sum, group) => sum + group.bought, 0);
  const inventory = groups.reduce((sum, group) => sum + group.cost, 0);
  const detail = lotCostBreakdown(lot);
  return `<tr><td><strong>${esc(lot.name)}</strong><br><small>${groups.map(group => esc(group.label)).join(' · ')}</small></td><td>${bought}</td><td>${heads}</td><td>${money(detail.animalValue)} / cabeça</td><td>${money(detail.purchaseFreight + detail.expenseFreight)}</td><td>${money(detail.otherExpenses)}</td><td><strong>${money(inventory)}</strong></td><td>${heads ? money(inventory / heads) : '—'}</td><td><button class="btn secondary" data-lot-detail="${esc(lot.id)}">Visualizar</button></td></tr>`;
}

function recordsView(kind) {
  if (kind === 'compras') {
    const lots = lotAnalytics();
    const totalInvested = lots.reduce((sum, lot) => sum + [...lot.groups.values()].reduce((sub, group) => sub + group.cost, 0), 0);
    const totalHeads = lots.reduce((sum, lot) => sum + [...lot.groups.values()].reduce((sub, group) => sub + group.live, 0), 0);
    return `<div class="content"><div class="section-title"><div><h2>Compras por lote</h2><p>Cada lote reúne a compra efetiva de animais, fretes e todas as despesas vinculadas.</p></div><div class="sheet-actions">${button('purchase','Nova compra de animal')} ${button('expense','Lançar frete ou despesa')}</div></div><div class="summary-strip"><div>Lotes ativos<strong>${lots.filter(lot => [...lot.groups.values()].some(group => group.live)).length}</strong></div><div>Animais em estoque<strong>${totalHeads}</strong></div><div>Investido em estoque<strong>${money(totalInvested)}</strong></div><div>Custo médio geral<strong>${totalHeads ? money(totalInvested / totalHeads) : '—'} / cabeça</strong></div></div><div class="quote-note"><strong>Classificação dos lançamentos:</strong> em compras, informe o <strong>valor por cabeça</strong>. O sistema calcula a média das compras do lote, soma fretes e despesas e divide pelo total de animais comprados. No botão “Lançar frete ou despesa”, informe o mesmo lote e escolha <strong>Frete</strong> ou a categoria correspondente.</div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Lote</th><th>Comprados</th><th>Estoque</th><th>Preço médio / cabeça</th><th>Frete</th><th>Despesas</th><th>Custo em estoque</th><th>Custo médio</th><th></th></tr></thead><tbody>${lots.length ? lots.map(lotSummaryRow).join('') : `<tr><td class="empty" colspan="9">Ainda não há compras. Cadastre a primeira compra de animal para criar um lote.</td></tr>`}</tbody></table></div></div></div>`;
  }
  const expense = kind === 'gastos';
  const cfg = expense
    ? { title:'Investimentos e gastos', desc:'Lance frete, despesas e perdas informando o lote relacionado.', type:'expense', rows:data.expenses, cols:['Lançamento','Status','Categoria','Descrição','Lote','Valor'], values:r=>[dateBR(r.date),expenseStatusBadge(r),r.category,r.description,r.lot || '—',money(r.value)] }
    : { title:'Vendas de gado', desc:'Informe o valor por cabeça; o sistema calcula a receita bruta e confronta com o custo das cabeças vendidas.', type:'sale', rows:data.sales, cols:['Lote','Data','Animais','Sexo','Qtd.','Preço / cabeça','Receita bruta','Resultado'], values:r=>[r.lot,dateBR(r.date),r.animalType,r.sex,r.quantity,money(r.value),money(saleGross(r)),lotPerformance(r)] };
  const saleRevenue = data.sales.reduce((sum, row) => sum + saleGross(row), 0);
  const summary = expense ? `<div class="summary-strip"><div>Total de lançamentos<strong>${cfg.rows.length}</strong></div><div>Pago / já saiu do caixa<strong class="green">${money(total(paidExpenses()))}</strong></div><div>A pagar / provisões<strong class="red">${money(total(payableExpenses()))}</strong></div></div>` : `<div class="summary-strip"><div>Total de lançamentos<strong>${cfg.rows.length}</strong></div><div>Receita bruta acumulada<strong>${money(saleRevenue)}</strong></div></div>`;
  return `<div class="content"><div class="section-title"><div><h2>${cfg.title}</h2><p>${cfg.desc}</p></div><div class="sheet-actions">${button(cfg.type)}</div></div>${summary}<div class="panel"><div class="table-wrap"><table><thead><tr>${cfg.cols.map(c=>`<th>${c}</th>`).join('')}<th></th></tr></thead><tbody>${cfg.rows.length ? cfg.rows.map((row,index)=>`<tr>${cfg.values(row).map(value=>`<td>${value||'—'}</td>`).join('')}<td>${expense ? `<button class="btn ${isExpensePaid(row)?'danger':'primary'}" data-payment-toggle="${index}">${isExpensePaid(row)?'Marcar a pagar':'Marcar pago'}</button> ` : ''}<button class="btn secondary" data-edit="${cfg.type}" data-index="${index}">Editar</button> <button class="btn danger" data-delete="${cfg.type}" data-index="${index}">Excluir</button></td></tr>`).join('') : `<tr><td class="empty" colspan="${cfg.cols.length+1}">Ainda não há lançamentos.</td></tr>`}</tbody></table></div></div></div>`;
}

function printLotReport(id) {
  const lot = lotAnalytics().find(item => item.id === id);
  if (!lot) return;
  const info = lotCostBreakdown(lot);
  const groups = [...lot.groups.values()];
  const heads = groups.reduce((sum, group) => sum + group.live, 0);
  const inventory = groups.reduce((sum, group) => sum + group.cost, 0);
  const result = lot.revenue - lot.soldCost;
  const movements = [
    ...info.purchases.map(row => ({ date:row.date, kind:'Compra de animal', category:'Animal', description:`${row.animalType || 'Animal'} · ${row.sex || 'Misto'}${row.party ? ` · ${row.party}` : ''}`, quantity:row.quantity, value:number(row.value) * number(row.quantity), freight:number(row.freight) })),
    ...info.expenses.map(row => ({ date:row.date, kind:'Despesa do lote', category:row.category || 'Despesa', description:`${row.description || '—'}${row.party ? ` · ${row.party}` : ''}`, quantity:row.lossQuantity || '—', value:number(row.value), freight:0 })),
    ...data.sales.filter(row => lotId(row.lot) === lot.id).map(row => ({ date:row.date, kind:'Venda de animal', category:'Venda', description:`${row.animalType || 'Animal'} · ${row.sex || 'Misto'}${row.party ? ` · ${row.party}` : ''}`, quantity:row.quantity, value:saleGross(row), freight:number(row.freight), total:saleNet(row) }))
  ].sort((a,b) => dateValue(a).localeCompare(dateValue(b)));
  const popup = window.open('', '_blank');
  if (!popup) return alert('Permita a abertura de janela para gerar o relatório em PDF.');
  const logo = `${window.location.origin}/assets/logo-querencia-de-boiadeiro.jpeg`;
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório — Lote ${esc(lot.name)}</title><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#18251f;font-size:11px;margin:0}.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #c79a42;padding-bottom:12px;margin-bottom:18px}.head img{width:92px;height:92px;object-fit:contain}.head h1{font-size:23px;margin:0 0 5px}.head p{margin:0;color:#6c7972}.date{font-size:10px;color:#6c7972;text-align:right}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0 18px}.summary div{border:1px solid #d9e4dc;border-radius:6px;padding:9px}.summary span{display:block;font-size:9px;color:#6c7972;text-transform:uppercase;font-weight:bold}.summary strong{display:block;font-size:15px;margin-top:4px;color:#164534}h2{font-size:14px;margin:18px 0 8px;color:#164534}table{width:100%;border-collapse:collapse}th{background:#164534;color:#fff;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.3px;padding:8px}td{border-bottom:1px solid #dfe6e0;padding:8px 6px;vertical-align:top}.number{text-align:right;white-space:nowrap}.footer{border-top:1px solid #dfe6e0;margin-top:22px;padding-top:8px;color:#6c7972;font-size:9px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header class="head"><img src="${logo}" alt="Querência de Boiadeiro"><div><h1>Relatório financeiro — Lote ${esc(lot.name)}</h1><p>Querência de Boiadeiro Agropecuária</p></div><div class="date">Emitido em<br><strong>${new Date().toLocaleDateString('pt-BR')}</strong></div></header><section class="summary"><div><span>Preço médio de compra</span><strong>${money(info.animalValue)} / cabeça</strong></div><div><span>Fretes</span><strong>${money(info.purchaseFreight + info.expenseFreight)}</strong></div><div><span>Outras despesas pagas</span><strong>${money(info.otherExpenses)}</strong></div><div><span>Animais em estoque</span><strong>${heads}</strong></div><div><span>Custo médio atual</span><strong>${heads ? money(inventory / heads) : '—'} / cabeça</strong></div><div><span>Custo em estoque</span><strong>${money(inventory)}</strong></div><div><span>Vendas líquidas</span><strong>${money(lot.revenue)}</strong></div><div><span>Resultado das vendas</span><strong>${money(result)}</strong></div><div><span>Despesas a pagar</span><strong>${money(info.payable)}</strong></div></section><h2>Movimentações do lote</h2><table><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição / fornecedor</th><th>Qtd.</th><th class="number">Animal / valor</th><th class="number">Frete</th><th class="number">Total</th></tr></thead><tbody>${movements.map(item => `<tr><td>${dateBR(item.date)}</td><td>${esc(item.kind)}</td><td>${esc(item.category)}</td><td>${esc(item.description)}</td><td>${item.quantity || '—'}</td><td class="number">${money(item.value)}</td><td class="number">${money(item.freight)}</td><td class="number"><strong>${money(item.total ?? (item.value + item.freight))}</strong></td></tr>`).join('') || '<tr><td colspan="8">Nenhuma movimentação vinculada a este lote.</td></tr>'}</tbody></table><h2>Composição do estoque</h2><table><thead><tr><th>Categoria / sexo</th><th>Comprados</th><th>Perdas</th><th>Vendidos</th><th>Em estoque</th><th class="number">Custo em estoque</th><th class="number">Custo médio</th></tr></thead><tbody>${groups.map(group => `<tr><td>${esc(group.label)}</td><td>${group.bought}</td><td>${group.lost}</td><td>${group.sold}</td><td>${group.live}</td><td class="number">${money(group.cost)}</td><td class="number">${group.live ? money(group.cost / group.live) : '—'}</td></tr>`).join('')}</tbody></table><footer class="footer">Relatório gerado pelo Sistema de Gestão Pecuária — Querência de Boiadeiro Agropecuária.</footer></body></html>`);
  popup.document.close();
  setTimeout(() => popup.print(), 500);
}

function lotDetail(id) {
  const lot = lotAnalytics().find(item => item.id === id);
  if (!lot) return;
  const info = lotCostBreakdown(lot);
  const groups = [...lot.groups.values()];
  const inventory = groups.reduce((sum, group) => sum + group.cost, 0);
  const heads = groups.reduce((sum, group) => sum + group.live, 0);
  const movementRows = [
    ...info.purchases.map(row => ({ source:'Compra de animal', category:'Animal', row, type:'purchase', index:data.purchases.indexOf(row), value:number(row.value) * number(row.quantity), freight:number(row.freight) })),
    ...info.expenses.map(row => ({ source:'Custo do lote', category:row.category || 'Despesa', row, type:'expense', index:data.expenses.indexOf(row), value:number(row.value), freight:0 }))
  ].sort((a,b) => dateValue(a.row).localeCompare(dateValue(b.row)) || a.category.localeCompare(b.category, 'pt-BR'));
  let dialog = document.querySelector('#lotDetailDialog');
  if (!dialog) { dialog = document.createElement('dialog'); dialog.id = 'lotDetailDialog'; document.body.append(dialog); }
  dialog.innerHTML = `<div class="modal-head"><div><p class="eyebrow">FICHA FINANCEIRA DO LOTE</p><h2>${esc(lot.name)}</h2></div><div class="sheet-actions"><button class="btn primary" data-print-lot="${esc(lot.id)}">Imprimir relatório / PDF</button><button class="icon-btn" data-close-lot aria-label="Fechar">×</button></div></div><div class="lot-detail-body"><div class="summary-strip"><div>Compra de animais (média)<strong>${money(info.animalValue)} / cabeça</strong></div><div>Fretes<strong>${money(info.purchaseFreight + info.expenseFreight)}</strong></div><div>Outras despesas<strong>${money(info.otherExpenses)}</strong></div><div>Custo em estoque<strong>${money(inventory)}</strong></div><div>Custo médio<strong>${heads ? money(inventory / heads) : '—'} / cabeça</strong></div></div>${info.payable ? `<p class="quote-note"><strong>A pagar:</strong> ${money(info.payable)} ainda não compõe o custo pago do lote.</p>` : ''}<div class="table-wrap"><table><thead><tr><th>Data</th><th>Categoria</th><th>Descrição / animais</th><th>Qtd.</th><th>Animal</th><th>Frete</th><th>Total</th><th></th></tr></thead><tbody>${movementRows.map(item => `<tr><td>${dateBR(item.row.date)}</td><td><span class="pill ${item.category === 'Frete' ? 'gold' : ''}">${esc(item.category)}</span></td><td>${esc(item.row.description || `${item.row.animalType || 'Animal'} · ${item.row.sex || ''}`)}</td><td>${item.row.quantity || '—'}</td><td>${money(item.value)}</td><td>${money(item.freight)}</td><td><strong>${money(item.value + item.freight)}</strong></td><td><div class="sheet-actions"><button class="btn secondary" data-edit="${item.type}" data-index="${item.index}" data-close-lot>Editar</button><button class="btn danger" data-delete-lot="${item.type}" data-index="${item.index}">Excluir</button></div></td></tr>`).join('') || `<tr><td class="empty" colspan="8">Sem movimentos vinculados.</td></tr>`}</tbody></table></div></div>`;
  dialog.querySelectorAll('[data-close-lot]').forEach(button => button.onclick = () => dialog.close());
  dialog.querySelectorAll('[data-print-lot]').forEach(button => button.onclick = () => printLotReport(button.dataset.printLot));
  dialog.querySelectorAll('[data-delete-lot]').forEach(button => button.onclick = async () => {
    if (!confirm('Excluir este lançamento do lote? Esta ação não pode ser desfeita.')) return;
    const removed = await removeRecord(button.dataset.deleteLot, Number(button.dataset.index));
    if (!removed) return alert('Não foi possível confirmar a exclusão no banco. O lançamento foi mantido. Tente novamente quando a conexão estiver estável.');
    dialog.close();
    render();
  });
  dialog.showModal();
}

function openEdit(type, index) {
  const map = { expense:'expenses', purchase:'purchases', sale:'sales', quote:'quotes' };
  const row = data[map[type]]?.[index];
  if (!row) return;
  openForm(type);
  const form = document.querySelector('#recordForm');
  Object.entries(row).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (field && typeof value !== 'object') field.value = value ?? '';
  });
  form.elements.namedItem('category')?.dispatchEvent(new Event('change'));
  const dialog = document.querySelector('#recordDialog');
  dialog.dataset.editIndex = String(index);
  document.querySelector('#modalTitle').textContent = 'Editar lançamento';
}

function bindPage() {
  document.querySelectorAll('[data-new]').forEach(button => button.onclick = () => openForm(button.dataset.new));
  document.querySelectorAll('[data-view-link]').forEach(button => button.onclick = () => { currentView = button.dataset.viewLink; render(); });
  document.querySelectorAll('[data-lot-detail]').forEach(button => button.onclick = () => lotDetail(button.dataset.lotDetail));
  document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => openEdit(button.dataset.edit, Number(button.dataset.index)));
  document.querySelectorAll('[data-delete]').forEach(button => button.onclick = async () => { if(!confirm('Excluir este lançamento?')) return; const removed = await removeRecord(button.dataset.delete, Number(button.dataset.index)); if(!removed) return alert('Não foi possível confirmar a exclusão no banco. O lançamento foi mantido.'); render(); });
  document.querySelectorAll('[data-payment-toggle]').forEach(button => button.onclick = () => { const row=data.expenses[Number(button.dataset.paymentToggle)]; row.paymentStatus=isExpensePaid(row)?'A pagar':'Pago'; save(); render(); });
  document.querySelector('[data-expense-scope]')?.addEventListener('change', event => { expenseReportFilters.scope = event.target.value; render(); });
  document.querySelectorAll('[data-expense-category]').forEach(input => input.addEventListener('change', () => { expenseReportFilters.categories = [...document.querySelectorAll('[data-expense-category]:checked')].map(option => option.value); render(); }));
  document.querySelector('[data-clear-expense-filter]')?.addEventListener('click', () => { expenseReportFilters = { scope:'all', categories:[] }; render(); });
  document.querySelector('[data-print-expense-report]')?.addEventListener('click', printExpenseReport);
}

// Este listener em captura substitui o salvamento original e permite atualizar
// um lançamento existente sem criar uma segunda linha.
document.querySelector('#recordForm').addEventListener('submit', async event => {
  event.preventDefault(); event.stopImmediatePropagation();
  const form = event.currentTarget, dialog = document.querySelector('#recordDialog');
  try {
    const row = Object.fromEntries(new FormData(form).entries());
    ['value','freight','quantity','avgWeight','price','commission','lossQuantity'].forEach(name => row[name] = parseNum(row[name]));
    const map={expense:'expenses',purchase:'purchases',sale:'sales',quote:'quotes'}, type=dialog.dataset.type, rows=data[map[type]], editIndex=dialog.dataset.editIndex;
    if (editIndex !== undefined) {
      const previous = rows[Number(editIndex)];
      row.attachments = previous.attachments || [];
      row.id = previous.id || `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
      row.updatedAt = Date.now();
      rows[Number(editIndex)] = row;
      delete dialog.dataset.editIndex;
    } else {
      row.attachments = [];
      row.id = `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
      row.updatedAt = Date.now();
      rows.unshift(row);
    }
    save(); dialog.close(); render();
  } catch (error) { alert(error.message || 'Não foi possível salvar o lançamento.'); }
}, true);
})();
