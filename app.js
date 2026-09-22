(() => {
const key = 'querencia-boiadeiro-v2';
const seed = { expenses: [], purchases: [], sales: [], quotes: [], meta: { capitalInterestProvisioned: false } };
let data = JSON.parse(localStorage.getItem(key) || JSON.stringify(seed));
let currentView = 'dashboard';
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
  const p = total(data.purchases), s = total(data.sales), paid = total(paidExpenses()), payable = total(payableExpenses()), monthDue = total(dueThisMonth());
  const next = schedule().find(item => item.due >= new Date());
  const cashResult = s - p - paid;
  const openingCash = 500000;
  const cashBalance = openingCash + cashResult;
  return `<div class="content"><div class="hero"><div><p class="eyebrow">OPERAÇÃO EM UM SÓ LUGAR</p><h2>Bem-vindo, JF.</h2><p>Controle compras, vendas, custos, provisões e documentos da fazenda.</p></div>${button('purchase','Registrar compra')}</div><section class="cash-scoreboard" aria-label="Placar do caixa"><div class="cash-score-main"><span>Saldo em caixa</span><strong class="${cashBalance>=0?'':'red'}">${money(cashBalance)}</strong><small>Capital inicial + vendas − compras e gastos pagos</small></div><div class="cash-score-item"><span>Capital inicial</span><strong>${money(openingCash)}</strong></div><div class="cash-score-item outgoing"><span>Compras de gado</span><strong>− ${money(p)}</strong><small>${data.purchases.length} lote(s) pago(s)</small></div><div class="cash-score-item outgoing"><span>Gastos pagos</span><strong>− ${money(paid)}</strong><small>Provisões não entram aqui</small></div><div class="cash-score-item incoming"><span>Vendas recebidas</span><strong>+ ${money(s)}</strong><small>${data.sales.length} venda(s) lançada(s)</small></div></section><div class="cards"><div class="card"><div class="card-label">Compras de gado</div><div class="card-value">${money(p)}</div><div class="card-foot">${data.purchases.length} lote(s) registrado(s)</div></div><div class="card"><div class="card-label">Vendas de gado</div><div class="card-value green">${money(s)}</div><div class="card-foot">${data.sales.length} lote(s) registrado(s)</div></div><div class="card"><div class="card-label">Gastos pagos</div><div class="card-value red">${money(paid)}</div><div class="card-foot">Já abatidos do caixa</div></div><div class="card"><div class="card-label">Resultado operacional</div><div class="card-value ${cashResult>=0?'green':'red'}">${money(cashResult)}</div><div class="card-foot">Vendas − compras − gastos pagos</div></div></div><div class="grid-2"><div class="panel"><div class="panel-head"><div><h3>Próximo compromisso do capital de giro</h3><small>R$ 500.000 · 1,3% ao mês</small></div><button class="btn secondary" data-view-link="capital">Ver cronograma</button></div><div class="timeline">${next?`<div class="timeline-row"><div><strong>${dateBR(next.due.toISOString().slice(0,10))}</strong><br><small>Mês ${next.month}</small></div><div><strong>${next.phase}</strong><br><small>Pagamento previsto</small></div><div class="amount">${money(next.payment)}</div></div>`:'<p class="empty">Cronograma concluído.</p>'}</div></div><div class="panel"><div class="panel-head"><div><h3>Provisões de pagamentos</h3><small>Valores pendentes não abatidos do caixa.</small></div><button class="btn secondary" data-view-link="gastos">Ver lançamentos</button></div><div class="timeline"><div class="timeline-row"><div><strong class="red">${money(payable)}</strong><br><small>Total a pagar</small></div><div><strong>${money(monthDue)}</strong><br><small>Vencimento neste mês</small></div><div class="amount">${payableExpenses().length} pendente(s)</div></div></div></div></div></div>`;
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
const allOption = value => !value || ['todos', 'todo o lote', 'misto'].includes(lotId(value));
const animalGroups = ['Bezerro','Garrote','Novilho','Vaca','Boi magro','Boi gordo','Matriz','Touro','Outro'];
const groupId = row => `${lotId(row.animalType || row.lossAnimalType || row.expenseAnimalType)}|${lotId(row.sex || row.lossSex || row.expenseSex)}`;
const groupName = row => `${row.animalType || row.lossAnimalType || row.expenseAnimalType || 'Animais'} · ${row.sex || row.lossSex || row.expenseSex || 'Misto'}`;
const dateValue = row => String(row.date || row.dueDate || today);

function selectedGroups(groups, row) {
  const type = lotId(row.expenseAnimalType || row.lossAnimalType || row.animalType);
  const sex = lotId(row.expenseSex || row.lossSex || row.sex);
  const exact = [...groups.values()].filter(group => (!type || allOption(type) || group.type === type) && (!sex || allOption(sex) || group.sex === sex));
  return exact.length ? exact : [...groups.values()];
}

function lotAnalytics() {
  const lots = new Map();
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
      const cost = number(event.row.value) + number(event.row.freight);
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
      for (const group of groups) {
        const removed = Math.min(group.live, remaining);
        group.live -= removed; group.lost += removed; remaining -= removed;
        if (!remaining) break;
      }
      if (remaining > 0) lot.warnings.push(`Perda informada maior que o estoque: ${number(event.row.lossQuantity || event.row.quantity)} cabeça(s).`);
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
    const revenue = number(event.row.value) - number(event.row.freight);
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
  const cfg = expense
    ? { title:'Investimentos e gastos', desc:'Lance todo custo do lote: frete, viagem, insumo, medicamento ou perdas.', type:'expense', rows:data.expenses, cols:['Lançamento','Vencimento','Status','Tipo','Categoria','Descrição','Lote / alocação','Perda','Fornecedor','Valor'], values:r=>[dateBR(r.date),dateBR(r.dueDate || r.date),expenseStatusBadge(r),r.type,r.category,r.description,`${r.lot || '—'}${r.expenseAnimalType && !allOption(r.expenseAnimalType) ? ` · ${r.expenseAnimalType} ${r.expenseSex || ''}` : ''}`,number(r.lossQuantity) ? `${r.lossQuantity} ${r.lossAnimalType || 'animal(is)'}` : '—',r.party,money(r.value)] }
    : kind === 'compras'
      ? { title:'Compras de gado', desc:'Cada compra pode entrar no mesmo lote; o relatório consolida o custo médio.', type:'purchase', rows:data.purchases, cols:['Lote','Data','Animais','Sexo','Qtd.','Peso médio','Valor pago'], values:r=>[r.lot,dateBR(r.date),r.animalType,r.sex,r.quantity,`${r.avgWeight||'—'} kg`,money(number(r.value)+number(r.freight))] }
      : { title:'Vendas de gado', desc:'Vendas parciais são confrontadas com o custo médio da categoria dentro do lote.', type:'sale', rows:data.sales, cols:['Lote','Data','Animais','Sexo','Qtd.','Peso médio','Valor recebido','Resultado'], values:r=>[r.lot,dateBR(r.date),r.animalType,r.sex,r.quantity,`${r.avgWeight||'—'} kg`,money(r.value),lotPerformance(r)] };
  const summary = expense ? `<div class="summary-strip"><div>Total de lançamentos<strong>${cfg.rows.length}</strong></div><div>Pago / já saiu do caixa<strong class="green">${money(total(paidExpenses()))}</strong></div><div>A pagar / provisões<strong class="red">${money(total(payableExpenses()))}</strong></div><div>Vence neste mês<strong>${money(total(dueThisMonth()))}</strong></div></div>` : `<div class="summary-strip"><div>Total de lançamentos<strong>${cfg.rows.length}</strong></div><div>Valor acumulado<strong>${money(total(cfg.rows))}</strong></div></div>`;
  return `<div class="content"><div class="section-title"><div><h2>${cfg.title}</h2><p>${cfg.desc}</p></div><div class="sheet-actions">${button(cfg.type)}</div></div>${summary}<div class="panel"><div class="table-wrap"><table><thead><tr>${cfg.cols.map(c=>`<th>${c}</th>`).join('')}<th></th></tr></thead><tbody>${cfg.rows.length ? cfg.rows.map((row,index)=>`<tr>${cfg.values(row).map(value=>`<td>${value||'—'}</td>`).join('')}<td>${expense ? `<button class="btn ${isExpensePaid(row)?'danger':'primary'}" data-payment-toggle="${index}">${isExpensePaid(row)?'Marcar a pagar':'Marcar pago'}</button> ` : ''}<button class="btn danger" data-delete="${cfg.type}" data-index="${index}">Excluir</button></td></tr>`).join('') : `<tr><td class="empty" colspan="${cfg.cols.length+1}">Ainda não há lançamentos. Use o botão para começar.</td></tr>`}</tbody></table></div></div></div>`;
}

function openForm(type) {
  const dialog = document.querySelector('#recordDialog'), fields = document.querySelector('#formFields');
  const expense = type === 'expense', sale = type === 'sale', quote = type === 'quote';
  document.querySelector('#modalTitle').textContent = quote ? 'Nova cotação de animais' : expense ? 'Adicionar gasto ou investimento' : sale ? 'Registrar venda de gado' : 'Registrar compra de gado';
  document.querySelector('#modalEyebrow').textContent = quote ? 'COTAÇÃO DE MERCADO' : expense ? 'INVESTIMENTOS E GASTOS' : sale ? 'VENDA DE GADO' : 'COMPRA DE GADO';
  if (quote) { fields.innerHTML = input('date','Data','date') + select('operation','Operação',['Compra','Venda']) + select('category','Categoria',['Bezerro(a)','Desmama','Garrote','Novilho(a)','Boi magro','Boi gordo','Vaca','Matriz','Touro','Outro']) + input('breed','Raça / cruzamento') + select('sex','Sexo',['Macho','Fêmea','Misto']) + input('quantity','Quantidade','number') + input('avgWeight','Peso médio (kg)','number') + input('city','Praça / cidade') + input('state','Estado') + select('priceBasis','Base de preço',['@','kg vivo','cabeça','lote']) + input('price','Preço unitário (R$)','number') + input('paymentTerms','Condição de pagamento') + `<label class="full">Observações<textarea name="notes"></textarea></label>`; }
  else if (expense) { fields.innerHTML = input('date','Data do lançamento','date') + input('dueDate','Vencimento / previsão de pagamento','date') + select('paymentStatus','Situação do pagamento',['Pago','A pagar']) + select('type','Tipo',['Gasto','Investimento','Despesa']) + select('category','Categoria',['Frete','Despesa de viagem','Alimentação','Sanidade','Medicamento','Mão de obra','Insumo','Infraestrutura','Financeiro','Perda de animais','Outro']) + input('lot','Lote relacionado') + select('expenseAnimalType','Aplicar custo a',['Todo o lote',...animalGroups]) + select('expenseSex','Sexo / grupo',['Todos','Macho','Fêmea','Misto']) + input('lossQuantity','Quantidade perdida (somente se for perda)','number') + select('lossAnimalType','Tipo dos animais perdidos',['Todos',...animalGroups]) + select('lossSex','Sexo dos animais perdidos',['Todos','Macho','Fêmea','Misto']) + input('party','Fornecedor / beneficiário') + input('value','Valor (R$)','number') + input('description','Descrição','text','',true) + `<p class="quote-note full"><strong>Perda de animais:</strong> escolha essa categoria, informe o lote e a quantidade. Deixe o valor em R$ como zero se não houver outro custo; o sistema recalcula o custo médio dos animais restantes.</p>`; }
  else { fields.innerHTML = input('lot','Identificação do lote') + input('date','Data','date') + (sale ? '' : select('entryCategory','Categoria do lançamento',['Animal'])) + select('animalType','Tipo de animais',animalGroups) + input('breed','Raça / cruzamento') + select('sex','Sexo',['Macho','Fêmea','Misto']) + input('quantity','Quantidade','number') + input('avgWeight','Peso médio (kg)','number') + input('freight','Custo de frete (R$)','number') + input('value',sale ? 'Valor recebido (R$)' : 'Valor pago (R$)','number') + input('party',sale ? 'Comprador' : 'Vendedor') + input('city','Cidade') + input('state','Estado') + `<label class="full">Observações<textarea name="notes"></textarea></label>`; }
  fields.querySelector('[name=date]').value = today;
  if (expense) fields.querySelector('[name=dueDate]').value = today;
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
  const merged = [];
  [...(remoteRows || []), ...(localRows || [])].forEach(row => {
    const legacy = legacyRowKey(type, row);
    const existingIndex = merged.findIndex(existing =>
      (row.id && existing.id && row.id === existing.id) ||
      (legacyRowKey(type, existing) === legacy && (row.id || existing.id || lotText(row.lot) !== lotText(existing.lot)))
    );
    if (existingIndex >= 0) merged[existingIndex] = preferRecord(merged[existingIndex], row);
    else merged.push(row);
  });
  return merged;
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
    const merged = mergeCloudWithLocal(remote);
    const mustWrite = needsCloudWrite(remote, merged);
    data = merged;
    saveLocalState(data);
    if (mustWrite) await api('/state', { method: 'PUT', body: JSON.stringify({ state: cloudState(data) }) });
  } else if (migrate && hasLocalRecords()) {
    await api('/state', { method: 'PUT', body: JSON.stringify({ state: cloudState(data) }) });
  }
  if (ensureCapitalInterestProvisions()) await api('/state', { method: 'PUT', body: JSON.stringify({ state: cloudState(data) }) });
  setSyncStatus('Dados compartilhados');
  render();
}

async function saveCloud() {
  if (!cloudToken) return;
  setSyncStatus('Sincronizando...');
  try {
    await api('/state', { method: 'PUT', body: JSON.stringify({ state: cloudState(data) }) });
    setSyncStatus('Dados compartilhados');
  } catch (error) {
    console.error(error);
    setSyncStatus('Falha ao sincronizar');
  }
}

function save() {
  saveLocalState(data);
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

window.addEventListener('online', () => { if (cloudToken) void saveCloud(); });

// Visão operacional de compras: cada lote é uma ficha única, com todas as
// compras de animais e custos vinculados reunidos no mesmo lugar.
function expenseForLot(lot) {
  return data.expenses.filter(row => lotId(row.lot) === lot.id && !row.systemProvision);
}

function lotCostBreakdown(lot) {
  const purchases = data.purchases.filter(row => lotId(row.lot) === lot.id);
  const expenses = expenseForLot(lot);
  const animalValue = purchases.reduce((sum, row) => sum + number(row.value), 0);
  const purchaseFreight = purchases.reduce((sum, row) => sum + number(row.freight), 0);
  const paidExpenses = expenses.filter(isExpensePaid);
  const expenseFreight = paidExpenses.filter(row => lotId(row.category) === 'frete').reduce((sum, row) => sum + number(row.value), 0);
  const otherExpenses = paidExpenses.filter(row => lotId(row.category) !== 'frete' && lotId(row.category) !== 'perda de animais').reduce((sum, row) => sum + number(row.value), 0);
  const payable = expenses.filter(row => !isExpensePaid(row)).reduce((sum, row) => sum + number(row.value), 0);
  return { purchases, expenses, animalValue, purchaseFreight, expenseFreight, otherExpenses, payable };
}

function lotSummaryRow(lot) {
  const groups = [...lot.groups.values()];
  const heads = groups.reduce((sum, group) => sum + group.live, 0);
  const bought = groups.reduce((sum, group) => sum + group.bought, 0);
  const inventory = groups.reduce((sum, group) => sum + group.cost, 0);
  const detail = lotCostBreakdown(lot);
  return `<tr><td><strong>Lote ${esc(lot.name)}</strong><br><small>${groups.map(group => esc(group.label)).join(' · ')}</small></td><td>${bought}</td><td>${heads}</td><td>${money(detail.animalValue)}</td><td>${money(detail.purchaseFreight + detail.expenseFreight)}</td><td>${money(detail.otherExpenses)}</td><td><strong>${money(inventory)}</strong></td><td>${heads ? money(inventory / heads) : '—'}</td><td><button class="btn secondary" data-lot-detail="${esc(lot.id)}">Visualizar</button></td></tr>`;
}

function recordsView(kind) {
  if (kind === 'compras') {
    const lots = lotAnalytics();
    const totalInvested = lots.reduce((sum, lot) => sum + [...lot.groups.values()].reduce((sub, group) => sub + group.cost, 0), 0);
    const totalHeads = lots.reduce((sum, lot) => sum + [...lot.groups.values()].reduce((sub, group) => sub + group.live, 0), 0);
    return `<div class="content"><div class="section-title"><div><h2>Compras por lote</h2><p>Cada lote reúne a compra efetiva de animais, fretes e todas as despesas vinculadas.</p></div><div class="sheet-actions">${button('purchase','Nova compra de animal')} ${button('expense','Lançar frete ou despesa')}</div></div><div class="summary-strip"><div>Lotes ativos<strong>${lots.filter(lot => [...lot.groups.values()].some(group => group.live)).length}</strong></div><div>Animais em estoque<strong>${totalHeads}</strong></div><div>Investido em estoque<strong>${money(totalInvested)}</strong></div><div>Custo médio geral<strong>${totalHeads ? money(totalInvested / totalHeads) : '—'} / cabeça</strong></div></div><div class="quote-note"><strong>Classificação dos lançamentos:</strong> compras de gado são <strong>Animal</strong>; no botão “Lançar frete ou despesa”, informe o mesmo lote e escolha <strong>Frete</strong> ou a categoria correspondente. Tudo entra no resumo do lote.</div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Lote</th><th>Comprados</th><th>Estoque</th><th>Animal</th><th>Frete</th><th>Despesas</th><th>Custo em estoque</th><th>Custo médio</th><th></th></tr></thead><tbody>${lots.length ? lots.map(lotSummaryRow).join('') : `<tr><td class="empty" colspan="9">Ainda não há compras. Cadastre a primeira compra de animal para criar um lote.</td></tr>`}</tbody></table></div></div></div>`;
  }
  const expense = kind === 'gastos';
  const cfg = expense
    ? { title:'Investimentos e gastos', desc:'Lance frete, despesas e perdas informando o lote relacionado.', type:'expense', rows:data.expenses, cols:['Lançamento','Status','Categoria','Descrição','Lote','Valor'], values:r=>[dateBR(r.date),expenseStatusBadge(r),r.category,r.description,r.lot || '—',money(r.value)] }
    : { title:'Vendas de gado', desc:'Vendas parciais são confrontadas com o custo médio da categoria dentro do lote.', type:'sale', rows:data.sales, cols:['Lote','Data','Animais','Sexo','Qtd.','Valor recebido','Resultado'], values:r=>[r.lot,dateBR(r.date),r.animalType,r.sex,r.quantity,money(r.value),lotPerformance(r)] };
  const summary = expense ? `<div class="summary-strip"><div>Total de lançamentos<strong>${cfg.rows.length}</strong></div><div>Pago / já saiu do caixa<strong class="green">${money(total(paidExpenses()))}</strong></div><div>A pagar / provisões<strong class="red">${money(total(payableExpenses()))}</strong></div></div>` : `<div class="summary-strip"><div>Total de lançamentos<strong>${cfg.rows.length}</strong></div><div>Valor acumulado<strong>${money(total(cfg.rows))}</strong></div></div>`;
  return `<div class="content"><div class="section-title"><div><h2>${cfg.title}</h2><p>${cfg.desc}</p></div><div class="sheet-actions">${button(cfg.type)}</div></div>${summary}<div class="panel"><div class="table-wrap"><table><thead><tr>${cfg.cols.map(c=>`<th>${c}</th>`).join('')}<th></th></tr></thead><tbody>${cfg.rows.length ? cfg.rows.map((row,index)=>`<tr>${cfg.values(row).map(value=>`<td>${value||'—'}</td>`).join('')}<td>${expense ? `<button class="btn ${isExpensePaid(row)?'danger':'primary'}" data-payment-toggle="${index}">${isExpensePaid(row)?'Marcar a pagar':'Marcar pago'}</button> ` : ''}<button class="btn secondary" data-edit="${cfg.type}" data-index="${index}">Editar</button> <button class="btn danger" data-delete="${cfg.type}" data-index="${index}">Excluir</button></td></tr>`).join('') : `<tr><td class="empty" colspan="${cfg.cols.length+1}">Ainda não há lançamentos.</td></tr>`}</tbody></table></div></div></div>`;
}

function lotDetail(id) {
  const lot = lotAnalytics().find(item => item.id === id);
  if (!lot) return;
  const info = lotCostBreakdown(lot);
  const groups = [...lot.groups.values()];
  const inventory = groups.reduce((sum, group) => sum + group.cost, 0);
  const heads = groups.reduce((sum, group) => sum + group.live, 0);
  const movementRows = [
    ...info.purchases.map(row => ({ source:'Compra de animal', category:'Animal', row, type:'purchase', index:data.purchases.indexOf(row), value:number(row.value), freight:number(row.freight) })),
    ...info.expenses.map(row => ({ source:'Custo do lote', category:row.category || 'Despesa', row, type:'expense', index:data.expenses.indexOf(row), value:number(row.value), freight:0 }))
  ].sort((a,b) => dateValue(b.row).localeCompare(dateValue(a.row)));
  let dialog = document.querySelector('#lotDetailDialog');
  if (!dialog) { dialog = document.createElement('dialog'); dialog.id = 'lotDetailDialog'; document.body.append(dialog); }
  dialog.innerHTML = `<div class="modal-head"><div><p class="eyebrow">FICHA FINANCEIRA DO LOTE</p><h2>Lote ${esc(lot.name)}</h2></div><button class="icon-btn" data-close-lot aria-label="Fechar">×</button></div><div class="lot-detail-body"><div class="summary-strip"><div>Compra de animais<strong>${money(info.animalValue)}</strong></div><div>Fretes<strong>${money(info.purchaseFreight + info.expenseFreight)}</strong></div><div>Outras despesas<strong>${money(info.otherExpenses)}</strong></div><div>Custo em estoque<strong>${money(inventory)}</strong></div><div>Custo médio<strong>${heads ? money(inventory / heads) : '—'} / cabeça</strong></div></div>${info.payable ? `<p class="quote-note"><strong>A pagar:</strong> ${money(info.payable)} ainda não compõe o custo pago do lote.</p>` : ''}<div class="table-wrap"><table><thead><tr><th>Data</th><th>Categoria</th><th>Descrição / animais</th><th>Qtd.</th><th>Animal</th><th>Frete</th><th>Total</th><th></th></tr></thead><tbody>${movementRows.map(item => `<tr><td>${dateBR(item.row.date)}</td><td><span class="pill ${item.category === 'Frete' ? 'gold' : ''}">${esc(item.category)}</span></td><td>${esc(item.row.description || `${item.row.animalType || 'Animal'} · ${item.row.sex || ''}`)}</td><td>${item.row.quantity || '—'}</td><td>${money(item.value)}</td><td>${money(item.freight)}</td><td><strong>${money(item.value + item.freight)}</strong></td><td><button class="btn secondary" data-edit="${item.type}" data-index="${item.index}" data-close-lot>Editar</button></td></tr>`).join('') || `<tr><td class="empty" colspan="8">Sem movimentos vinculados.</td></tr>`}</tbody></table></div></div>`;
  dialog.querySelectorAll('[data-close-lot]').forEach(button => button.onclick = () => dialog.close());
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
  const dialog = document.querySelector('#recordDialog');
  dialog.dataset.editIndex = String(index);
  document.querySelector('#modalTitle').textContent = 'Editar lançamento';
}

function bindPage() {
  document.querySelectorAll('[data-new]').forEach(button => button.onclick = () => openForm(button.dataset.new));
  document.querySelectorAll('[data-view-link]').forEach(button => button.onclick = () => { currentView = button.dataset.viewLink; render(); });
  document.querySelectorAll('[data-lot-detail]').forEach(button => button.onclick = () => lotDetail(button.dataset.lotDetail));
  document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => openEdit(button.dataset.edit, Number(button.dataset.index)));
  document.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => { const map={expense:'expenses',purchase:'purchases',sale:'sales',quote:'quotes'}, rows=data[map[button.dataset.delete]], index=Number(button.dataset.index), row=rows[index]; if(!confirm('Excluir este lançamento?')) return; rows.splice(index,1); void removeSharedAttachments(row?.attachments); save(); render(); });
  document.querySelectorAll('[data-payment-toggle]').forEach(button => button.onclick = () => { const row=data.expenses[Number(button.dataset.paymentToggle)]; row.paymentStatus=isExpensePaid(row)?'A pagar':'Pago'; save(); render(); });
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
