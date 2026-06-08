/* =========================================================
   ConnectWorks Operations Hub — Phase 1 (Schedule + Routes)
   Static SPA on Supabase (Auth + DB). Private (authenticated).
   ========================================================= */
(function () {
  'use strict';
  var CFG = window.CW_CONFIG || {};
  var app = document.getElementById('app');
  function fatal(m){ app.innerHTML='<div class="center-msg"><h2>Error</h2><p>'+m+'</p><p><button class="btn" onclick="location.reload()">Reload</button></p></div>'; }
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) { fatal('Missing Supabase settings in <code>/js/cw-config.js</code>.'); return; }
  if (!window.supabase || !window.supabase.createClient) { fatal('Supabase library did not load. Reload.'); return; }
  var sb; try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); } catch(e){ fatal('Init error: '+(e.message||e)); return; }

  /* ----- option lists ----- */
  var LEAD_STATUS=['New','Contacted','Site Visit Scheduled','Quote Sent','Follow Up Needed','Approved','Lost','Installation Scheduled','Completed'];
  var BUSINESS_TYPES=['Restaurant / Coffee Shop','Warehouse','Retail Store','Auto Shop','Office','Commercial Buildout','Property Manager','Other Commercial Property'];
  var SERVICES=['Video Surveillance','Access Control','Structured Cabling','Fiber Optics','Network & Wireless','Intercom & Communication','Commercial Audio & Video','Multiple Services / Not Sure Yet'];
  var PROJECT_TYPES=['New Installation','Upgrade Existing System','New Buildout / Remodel','Repair / Service'];
  var TIMELINES=['As soon as possible','This month','1–3 months','Planning ahead'];
  var BUDGETS=['Under $1,000','$1,000–$3,000','$3,000–$5,000','$5,000–$10,000','$10,000+','Not sure yet'];
  var SOURCES=['Website','Yelp','Referral','Meta Ads','Manual','Other'];
  var VISIT_TYPES=['Site Assessment','Installation','Emergency Service','Warranty Visit','Follow-up Visit','Material Pickup','Other'];
  var VISIT_STATUS=['Scheduled','In Progress','Completed','Rescheduled','Cancelled'];
  var PRIORITY=['High','Medium','Low'];

  /* ----- helpers ----- */
  function $(s,c){return (c||document).querySelector(s);}
  function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function ic(n,sz){sz=sz||20;return '<svg class="ic" viewBox="0 0 24 24" style="width:'+sz+'px;height:'+sz+'px"><use href="#i-'+(n||'check')+'"/></svg>';}
  function toast(m,err){var t=document.createElement('div');t.className='toast'+(err?' toast--err':'');t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove();},2800);}
  function today(){var d=new Date();return d.toISOString().slice(0,10);}
  function digits(v){return String(v||'').replace(/\D/g,'');}
  function addrOf(o){return [o.address,[o.city,o.state].filter(Boolean).join(', '),o.zip_code].filter(Boolean).join(' ').trim();}
  function mapsSearch(addr){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(addr);}
  function statusBadge(s){var k=String(s||'').toLowerCase();var cls='b-default';
    if(k.indexOf('new')>=0)cls='b-new';else if(k.indexOf('contact')>=0)cls='b-contacted';
    else if(k.indexOf('site visit')>=0)cls='b-visit';else if(k.indexOf('quote')>=0)cls='b-quote';
    else if(k.indexOf('follow')>=0)cls='b-follow';else if(k.indexOf('approved')>=0)cls='b-approved';
    else if(k.indexOf('lost')>=0||k.indexOf('declin')>=0||k.indexOf('cancel')>=0)cls='b-lost';
    else if(k.indexOf('install')>=0)cls='b-install';else if(k.indexOf('complete')>=0)cls='b-completed';
    return '<span class="b '+cls+'">'+esc(s||'—')+'</span>';}
  function prioBadge(p){var k=String(p||'Medium').toLowerCase();return '<span class="b b-'+k+'">'+esc(p||'Medium')+'</span>';}
  function logAct(et,id,action,desc){ try{ sb.from('activity_log').insert({entity_type:et,entity_id:id||null,action:action,description:desc||null,created_by:(state.session&&state.session.user&&state.session.user.email)||null}); }catch(e){} }

  function modal(title,inner,wide){
    var w=document.createElement('div');w.className='modal';
    w.innerHTML='<div class="modal__box" style="'+(wide?'max-width:680px':'')+'"><div class="modal__head"><h3 style="margin:0">'+esc(title)+'</h3><button class="btn btn--ghost" data-x>✕</button></div>'+inner+'</div>';
    document.body.appendChild(w);
    function close(){w.remove();}
    w.addEventListener('click',function(e){if(e.target===w)close();});
    w.querySelector('[data-x]').addEventListener('click',close);
    w.close=close;return w;
  }

  /* ----- generic form ----- */
  function formHtml(fields,row){
    return '<form id="opf">'+fields.map(function(f){
      var v=row[f.n], id='of-'+f.n, lbl=f.l||f.n;
      var inner;
      if(f.t==='textarea') inner='<textarea id="'+id+'">'+esc(v)+'</textarea>';
      else if(f.t==='number') inner='<input type="number" id="'+id+'" value="'+esc(v)+'">';
      else if(f.t==='date') inner='<input type="date" id="'+id+'" value="'+esc(v||'')+'">';
      else if(f.t==='time') inner='<input type="time" id="'+id+'" value="'+esc(v||'')+'">';
      else if(f.t==='bool') return '<div class="field"><div class="switch"><input type="checkbox" id="'+id+'" '+(v?'checked':'')+'><label for="'+id+'" style="margin:0">'+esc(lbl)+'</label></div></div>';
      else if(f.t==='select') inner='<select id="'+id+'"><option value="">Select…</option>'+f.options.map(function(o){return '<option '+(String(o)===String(v)?'selected':'')+'>'+esc(o)+'</option>';}).join('')+'</select>';
      else inner='<input type="text" id="'+id+'" value="'+esc(v)+'">';
      return '<div class="field"><label for="'+id+'">'+esc(lbl)+(f.req?' *':'')+'</label>'+inner+'</div>';
    }).join('')
    +'<div class="form-actions"><button class="btn btn--primary" type="submit">'+ic('check',18)+' Save</button><button class="btn" type="button" data-cancel>Cancel</button><span class="status" id="opfStatus"></span></div></form>';
  }
  function readForm(fields,scope){
    var o={};
    fields.forEach(function(f){var el=$('#of-'+f.n,scope);if(!el)return;
      if(f.t==='bool')o[f.n]=el.checked;
      else if(f.t==='number')o[f.n]=el.value===''?null:Number(el.value);
      else o[f.n]=el.value===''?null:el.value;});
    return o;
  }

  /* ----- auth + shell ----- */
  var state={view:'dashboard',session:null};
  route();
  (async function(){try{var r=await sb.auth.getSession();if(r&&r.data&&r.data.session){state.session=r.data.session;route();}}catch(e){}})();
  sb.auth.onAuthStateChange(function(_e,s){state.session=s;route();});
  function route(){try{state.session?renderApp():renderLogin();}catch(e){fatal('Render error: '+(e.message||e));}}

  function renderLogin(){
    app.innerHTML='<div class="login-wrap"><form class="login-card" id="lf">'
      +'<div class="login-brand"><img src="/assets/logo-connectworks.png" alt=""><strong>Operations Hub</strong></div>'
      +'<h1>Sign in</h1><p>ConnectWorks internal operations.</p>'
      +'<div class="field"><label>Email</label><input type="email" id="le" required></div>'
      +'<div class="field"><label>Password</label><input type="password" id="lp" required></div>'
      +'<button class="btn btn--primary" style="width:100%;justify-content:center" type="submit">Sign in</button>'
      +'<p class="status status--err" id="lerr" style="margin-top:12px"></p></form></div>';
    $('#lf').addEventListener('submit',async function(e){e.preventDefault();var b=e.target.querySelector('button');b.disabled=true;b.textContent='Signing in…';
      var r=await sb.auth.signInWithPassword({email:$('#le').value.trim(),password:$('#lp').value});
      if(r.error){$('#lerr').textContent=r.error.message;b.disabled=false;b.textContent='Sign in';}});
  }

  var NAV=[
    {k:'dashboard',l:'Dashboard',i:'sliders'},{k:'leads',l:'Leads',i:'mail'},
    {k:'calendar',l:'Calendar / Visits',i:'clock'},{k:'route',l:'Route Planner',i:'pin'},
    {k:'settings',l:'Settings',i:'tools'}
  ];
  var SOON=[{l:'Quotes',i:'doc'},{l:'Follow-ups',i:'chat'},{l:'Projects',i:'wrench'},{l:'Materials',i:'clipboard'}];

  function renderApp(){
    var nav=NAV.map(function(n){return '<button class="navitem'+(state.view===n.k?' navitem--on':'')+'" data-go="'+n.k+'">'+ic(n.i,18)+' <span>'+n.l+'</span></button>';}).join('');
    nav+='<div class="grp">Phase 2 (soon)</div>'+SOON.map(function(n){return '<button class="navitem" data-soon="1" style="opacity:.5">'+ic(n.i,18)+' <span>'+n.l+'</span></button>';}).join('');
    app.innerHTML='<div class="app"><aside class="sidebar"><div class="brand"><img src="/assets/logo-connectworks.png" alt=""> Ops Hub</div><div class="grp">Operations</div>'+nav
      +'</aside><div class="main"><div class="topbar"><h2 id="pt"></h2><div class="right">'
      +'<a class="btn" href="/admin" target="_blank">'+ic('sliders',18)+' Website CMS</a>'
      +'<button class="btn btn--ghost" id="lo">Logout</button></div></div><div class="content" id="c"></div></div></div>';
    $$('[data-go]').forEach(function(b){b.addEventListener('click',function(){state.view=b.getAttribute('data-go');renderApp();});});
    $$('[data-soon]').forEach(function(b){b.addEventListener('click',function(){toast('That module arrives in Phase 2 (Quotes & PDF).');});});
    $('#lo').addEventListener('click',function(){sb.auth.signOut();});
    var labels={dashboard:'Dashboard',leads:'Leads',calendar:'Calendar / Visits',route:'Route Planner',settings:'Settings'};
    $('#pt').textContent=labels[state.view];
    ({dashboard:renderDashboard,leads:renderLeads,calendar:renderCalendar,route:renderRoute,settings:renderSettings}[state.view])();
  }

  /* ===================== DASHBOARD ===================== */
  async function renderDashboard(){
    var c=$('#c');c.innerHTML='<div class="center-msg">Loading…</div>';
    var lr=await sb.from('leads').select('*').order('created_at',{ascending:false});
    var vr=await sb.from('visits').select('*').order('scheduled_date',{ascending:true}).order('start_time',{ascending:true});
    var leads=lr.data||[], visits=vr.data||[];
    var t=today(); var weekEnd=new Date();weekEnd.setDate(weekEnd.getDate()+7);var we=weekEnd.toISOString().slice(0,10);
    function low(s){return String(s||'').toLowerCase();}
    var newLeads=leads.filter(function(l){return low(l.status).indexOf('new')>=0;}).length;
    var attention=leads.filter(function(l){var s=low(l.status);return s.indexOf('new')>=0||s.indexOf('contact')>=0||s.indexOf('follow')>=0;});
    var todayVisits=visits.filter(function(v){return v.scheduled_date===t && low(v.status)!=='cancelled';});
    var weekVisits=visits.filter(function(v){return v.scheduled_date>=t && v.scheduled_date<=we && low(v.status)!=='cancelled';});
    var installs=visits.filter(function(v){return v.visit_type==='Installation' && low(v.status)==='scheduled';}).length;

    function metric(num,lbl,cls){return '<div class="metric '+(cls||'')+'"><div class="num">'+num+'</div><div class="lbl">'+lbl+'</div></div>';}
    var first=todayVisits[0], next=todayVisits[1];
    var route='<div class="panel"><h3>'+ic('pin',18)+' Today\'s Route</h3>'
      +'<div class="mini"><span>Visits today</span><strong>'+todayVisits.length+'</strong></div>'
      +'<div class="mini"><span>First stop</span><span>'+(first?esc((first.business_name||first.client_name||'')+' — '+(first.city||'')):'—')+'</span></div>'
      +'<div class="mini"><span>Next stop</span><span>'+(next?esc((next.business_name||next.client_name||'')+' — '+(next.city||'')):'—')+'</span></div>'
      +'<button class="btn btn--primary" style="margin-top:12px" id="goRoute">'+ic('pin',16)+' Optimize Today\'s Route</button></div>';

    var attn='<div class="panel"><h3>Leads Needing Attention ('+attention.length+')</h3>'
      +(attention.slice(0,6).map(function(l){return '<div class="mini"><a href="#" data-lead="'+l.id+'">'+esc(l.business||l.name||'Lead')+'</a>'+statusBadge(l.status)+'</div>';}).join('')||'<div class="muted">All caught up 🎉</div>')+'</div>';
    var up='<div class="panel"><h3>Upcoming Visits</h3>'
      +(weekVisits.slice(0,6).map(function(v){return '<div class="mini"><span>'+esc((v.scheduled_date||'')+' '+(v.start_time||''))+' · '+esc(v.business_name||v.client_name||'')+'</span>'+prioBadge(v.priority)+'</div>';}).join('')||'<div class="muted">No visits scheduled.</div>')+'</div>';

    c.innerHTML='<div class="metrics">'
      +metric(newLeads,'New leads','blue')+metric(todayVisits.length,'Visits today')+metric(weekVisits.length,'Visits this week')
      +metric(attention.length,'Leads needing attention','alert')+metric(installs,'Installations scheduled','ok')
      +'</div>'+route+'<div class="cols2">'+attn+up+'</div>'
      +'<p class="muted" style="margin-top:8px">Quotes, follow-ups, projects & materials metrics arrive in Phase 2.</p>';
    $('#goRoute').addEventListener('click',function(){state.view='route';renderApp();});
    $$('[data-lead]',c).forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();state.view='leads';renderApp();setTimeout(function(){openLead(leads.filter(function(x){return x.id===a.getAttribute('data-lead');})[0]);},60);});});
  }

  /* ===================== LEADS ===================== */
  var leadFields=[
    {n:'name',l:'Full name',req:true},{n:'business',l:'Business name'},{n:'phone'},{n:'email'},
    {n:'business_type',l:'Business type',t:'select',options:BUSINESS_TYPES},{n:'service',l:'Service needed',t:'select',options:SERVICES},
    {n:'project_type',l:'Project type',t:'select',options:PROJECT_TYPES},{n:'timeline',t:'select',options:TIMELINES},
    {n:'budget',l:'Estimated budget',t:'select',options:BUDGETS},{n:'source',t:'select',options:SOURCES},
    {n:'status',t:'select',options:LEAD_STATUS},{n:'address'},{n:'city'},{n:'state'},{n:'zip_code',l:'ZIP'},
    {n:'message',l:'Project details',t:'textarea'},{n:'notes',t:'textarea'}
  ];
  var leadCache=[];
  async function renderLeads(){
    var c=$('#c');c.innerHTML='<div class="center-msg">Loading…</div>';
    var r=await sb.from('leads').select('*').order('created_at',{ascending:false});
    if(r.error){c.innerHTML='<div class="panel status status--err">'+esc(r.error.message)+'</div>';return;}
    leadCache=r.data||[];
    c.innerHTML='<div class="toolbar"><input type="search" id="lq" placeholder="Search name, business, phone, email…">'
      +sel('fStatus','All statuses',LEAD_STATUS)+sel('fService','All services',SERVICES)+sel('fType','All business types',BUSINESS_TYPES)+sel('fSource','All sources',SOURCES)
      +'<span class="spacer"></span><button class="btn btn--primary" id="newLead">'+ic('check',18)+' New lead</button></div><div id="leadTable"></div>';
    ['lq','fStatus','fService','fType','fSource'].forEach(function(id){var el=$('#'+id);el.addEventListener(id==='lq'?'input':'change',drawLeads);});
    $('#newLead').addEventListener('click',function(){openLead({status:'New',source:'Manual',state:'CA'});});
    drawLeads();
  }
  function sel(id,ph,opts){return '<select id="'+id+'"><option value="">'+ph+'</option>'+opts.map(function(o){return '<option>'+esc(o)+'</option>';}).join('')+'</select>';}
  function drawLeads(){
    var q=($('#lq').value||'').toLowerCase(),fs=$('#fStatus').value,fsv=$('#fService').value,ft=$('#fType').value,fsr=$('#fSource').value;
    var rows=leadCache.filter(function(l){
      if(fs&&String(l.status)!==fs)return false; if(fsv&&l.service!==fsv)return false; if(ft&&l.business_type!==ft)return false; if(fsr&&l.source!==fsr)return false;
      if(q){var hay=(l.name+' '+l.business+' '+l.phone+' '+l.email).toLowerCase();if(hay.indexOf(q)<0)return false;}
      return true;
    });
    var tr=rows.map(function(l){return '<tr>'
      +'<td><strong>'+esc(l.business||l.name||'—')+'</strong><br><span class="muted">'+esc(l.name||'')+'</span></td>'
      +'<td>'+esc(l.phone||'')+'<br><span class="muted">'+esc(l.email||'')+'</span></td>'
      +'<td>'+esc(l.service||'')+'</td><td>'+statusBadge(l.status)+'</td>'
      +'<td><div class="linkbtns">'+(l.phone?'<a class="btn" href="tel:+1'+digits(l.phone)+'">'+ic('phone',14)+'</a>':'')
      +(l.email?'<a class="btn" href="mailto:'+esc(l.email)+'">'+ic('mail',14)+'</a>':'')
      +(addrOf(l)?'<a class="btn" target="_blank" href="'+mapsSearch(addrOf(l))+'">'+ic('pin',14)+'</a>':'')
      +'<button class="btn" data-edit="'+l.id+'">Open</button></div></td></tr>';}).join('')
      ||'<tr><td colspan="5" class="muted">No leads match.</td></tr>';
    $('#leadTable').innerHTML='<table><thead><tr><th>Business / Name</th><th>Phone / Email</th><th>Service</th><th>Status</th><th></th></tr></thead><tbody>'+tr+'</tbody></table>';
    $$('#leadTable [data-edit]').forEach(function(b){b.addEventListener('click',function(){openLead(leadCache.filter(function(x){return x.id===b.getAttribute('data-edit');})[0]);});});
  }
  function openLead(row){
    row=row||{};
    var actions=row.id?'<div class="linkbtns" style="margin-bottom:14px">'
      +'<button class="btn btn--primary" data-visit>'+ic('clock',14)+' Schedule Site Visit</button>'
      +(row.phone?'<a class="btn" href="tel:+1'+digits(row.phone)+'">'+ic('phone',14)+' Call</a>':'')
      +(row.email?'<a class="btn" href="mailto:'+esc(row.email)+'">'+ic('mail',14)+' Email</a>':'')
      +(addrOf(row)?'<a class="btn" target="_blank" href="'+mapsSearch(addrOf(row))+'">'+ic('pin',14)+' Maps</a>':'')
      +'<button class="btn" data-quote>'+ic('doc',14)+' Create Quote</button></div>':'';
    var m=modal(row.id?'Lead — '+(row.business||row.name||''):'New lead', actions+formHtml(leadFields,row), true);
    wireSave(m,leadFields,row,'leads',function(){renderLeads();});
    var dv=m.querySelector('[data-visit]'); if(dv) dv.addEventListener('click',function(){m.close();openVisit(visitFromLead(row),row);});
    var dq=m.querySelector('[data-quote]'); if(dq) dq.addEventListener('click',function(){toast('Quote Builder arrives in Phase 2.');});
  }
  function visitFromLead(l){return {lead_id:l.id,client_name:l.name,business_name:l.business,phone:l.phone,email:l.email,address:l.address,city:l.city,state:l.state||'CA',zip_code:l.zip_code,service_needed:l.service,visit_type:'Site Assessment',status:'Scheduled',priority:'Medium',estimated_duration:60,scheduled_date:today()};}

  /* ===================== CALENDAR / VISITS ===================== */
  var visitFields=[
    {n:'client_name',l:'Client name',req:true},{n:'business_name'},{n:'phone'},{n:'email'},
    {n:'address'},{n:'city'},{n:'state'},{n:'zip_code',l:'ZIP'},
    {n:'visit_type',l:'Visit type',t:'select',options:VISIT_TYPES},{n:'service_needed',l:'Service',t:'select',options:SERVICES},
    {n:'assigned_to',l:'Assigned to'},{n:'scheduled_date',l:'Date',t:'date'},{n:'start_time',l:'Start time',t:'time'},
    {n:'estimated_duration',l:'Duration (min)',t:'number'},{n:'fixed_time',l:'Fixed time (don\'t auto-move)',t:'bool'},
    {n:'priority',t:'select',options:PRIORITY},{n:'status',t:'select',options:VISIT_STATUS},
    {n:'notes',t:'textarea'},{n:'internal_notes',l:'Internal notes',t:'textarea'}
  ];
  var calMode='week';
  async function renderCalendar(){
    var c=$('#c');c.innerHTML='<div class="center-msg">Loading…</div>';
    var r=await sb.from('visits').select('*').order('scheduled_date',{ascending:true}).order('start_time',{ascending:true});
    var visits=r.data||[];
    var t=today();var end=new Date();end.setDate(end.getDate()+(calMode==='day'?0:13));var ed=end.toISOString().slice(0,10);
    var shown=visits.filter(function(v){return v.scheduled_date && v.scheduled_date>=t && v.scheduled_date<=ed;});
    var groups={};shown.forEach(function(v){(groups[v.scheduled_date]=groups[v.scheduled_date]||[]).push(v);});
    var keys=Object.keys(groups).sort();
    var html='<div class="toolbar"><button class="btn'+(calMode==='day'?' btn--primary':'')+'" id="md">Today</button><button class="btn'+(calMode==='week'?' btn--primary':'')+'" id="mw">Next 14 days</button><span class="spacer"></span><button class="btn btn--primary" id="newVisit">'+ic('check',18)+' New visit</button></div>';
    html+=keys.map(function(d){return '<div class="daygroup"><h4>'+ic('clock',16)+' '+esc(d)+' ('+groups[d].length+')</h4>'
      +groups[d].map(visitCard).join('')+'</div>';}).join('')||'<div class="panel muted">No upcoming visits. Create one or schedule from a lead.</div>';
    c.innerHTML=html;
    $('#md').addEventListener('click',function(){calMode='day';renderCalendar();});
    $('#mw').addEventListener('click',function(){calMode='week';renderCalendar();});
    $('#newVisit').addEventListener('click',function(){openVisit({status:'Scheduled',priority:'Medium',state:'CA',estimated_duration:60,scheduled_date:today()});});
    $$('[data-vedit]',c).forEach(function(b){b.addEventListener('click',function(){openVisit(visits.filter(function(x){return x.id===b.getAttribute('data-vedit');})[0]);});});
    $$('[data-vdone]',c).forEach(function(b){b.addEventListener('click',async function(){await sb.from('visits').update({status:'Completed'}).eq('id',b.getAttribute('data-vdone'));logAct('visit',b.getAttribute('data-vdone'),'Visit completed');toast('Marked completed. Tip: create a quote next (Phase 2).');renderCalendar();});});
  }
  function visitCard(v){
    var a=addrOf(v);
    return '<div class="visit-card'+(v.priority==='High'?' high':'')+'"><div class="vc-time">'+esc(v.start_time||'—')+'</div><div class="vc-main">'
      +'<strong>'+esc(v.business_name||v.client_name||'Visit')+'</strong> '+statusBadge(v.status)+' '+prioBadge(v.priority)+(v.fixed_time?' <span class="fixedflag">'+ic('clock',12)+' fixed</span>':'')
      +'<br><span class="muted">'+esc(v.visit_type||'')+(v.service_needed?' · '+esc(v.service_needed):'')+(a?' · '+esc(a):'')+'</span>'
      +'<div class="linkbtns" style="margin-top:8px">'+(a?'<a class="btn" target="_blank" href="'+mapsSearch(a)+'">'+ic('pin',14)+' Maps</a>':'')
      +(v.phone?'<a class="btn" href="tel:+1'+digits(v.phone)+'">'+ic('phone',14)+'</a>':'')
      +'<button class="btn" data-vedit="'+v.id+'">Edit</button><button class="btn" data-vdone="'+v.id+'">Mark done</button></div></div></div>';
  }
  function openVisit(row,lead){
    row=row||{};
    var m=modal(row.id?'Visit — '+(row.business_name||row.client_name||''):'New visit', formHtml(visitFields,row), true);
    wireSave(m,visitFields,row,'visits',function(){ if(lead&&lead.id){sb.from('leads').update({status:'Site Visit Scheduled'}).eq('id',lead.id);} state.view='calendar'; renderApp(); }, function(saved){ logAct('visit',saved&&saved.id,'Visit scheduled',(row.business_name||row.client_name||'')); });
  }

  /* ===================== ROUTE PLANNER ===================== */
  var routeState={date:today(),start:'base',startCustom:'',end:'base',endCustom:'',order:[]};
  async function renderRoute(){
    var c=$('#c');c.innerHTML='<div class="center-msg">Loading…</div>';
    var set=(await sb.from('ops_settings').select('*').eq('id',1).maybeSingle()).data||{};
    var r=await sb.from('visits').select('*').eq('scheduled_date',routeState.date).neq('status','Cancelled');
    var visits=(r.data||[]).sort(function(a,b){return (a.route_order||999)-(b.route_order||999)||String(a.start_time||'').localeCompare(String(b.start_time||''));});
    var withAddr=visits.filter(function(v){return addrOf(v);}), noAddr=visits.filter(function(v){return !addrOf(v);});
    routeState.order=withAddr.map(function(v){return v.id;});
    routeState._visits=withAddr;
    var baseAddr=[set.base_address,set.base_city,set.base_state,set.base_zip_code].filter(Boolean).join(' ');

    var startSel='<select id="rStart"><option value="base" '+(routeState.start==='base'?'selected':'')+'>Base'+(baseAddr?' ('+esc(baseAddr)+')':'')+'</option><option value="custom" '+(routeState.start==='custom'?'selected':'')+'>Custom address…</option></select>';
    var endSel='<select id="rEnd"><option value="base" '+(routeState.end==='base'?'selected':'')+'>Back to base</option><option value="last" '+(routeState.end==='last'?'selected':'')+'>End at last stop</option><option value="custom" '+(routeState.end==='custom'?'selected':'')+'>Custom address…</option></select>';

    var c2='<div class="warn">Google Maps API not configured — running in <strong>basic mode</strong>: order stops manually and open the full multi-stop route in Google Maps.</div>';
    var summary='<div class="route-summary">'
      +'<div class="metric"><div class="num">'+withAddr.length+'</div><div class="lbl">Stops</div></div>'
      +'<div class="metric"><div class="num">'+withAddr.reduce(function(s,v){return s+(v.estimated_duration||0);},0)+' min</div><div class="lbl">On-site time</div></div>'
      +'<div class="metric"><div class="num">—</div><div class="lbl">Drive time (open in Maps)</div></div></div>';

    var list=withAddr.map(function(v,i){return routeStopHtml(v,i);}).join('')||'<div class="panel muted">No visits with an address for this day.</div>';
    var noList=noAddr.length?'<div class="warn">'+noAddr.length+' visit(s) have no address and were excluded:<br>'+noAddr.map(function(v){return '• '+esc(v.business_name||v.client_name||'Visit');}).join('<br>')+'</div>':'';

    c.innerHTML='<div class="toolbar"><label>Date <input type="date" id="rDate" value="'+routeState.date+'"></label>'
      +'<label>Start '+startSel+'</label><label>End '+endSel+'</label></div>'
      +'<div id="rCustomWrap"></div>'+c2+summary
      +'<div class="toolbar"><button class="btn btn--primary" id="rMaps">'+ic('pin',16)+' Open Route in Google Maps</button>'
      +'<button class="btn" id="rSave">'+ic('check',16)+' Save Route Order</button>'
      +'<button class="btn" id="rPrint">Print Daily Route</button><button class="btn" id="rReset">Reset Order</button></div>'
      +'<div id="rList">'+list+'</div>'+noList;

    $('#rDate').addEventListener('change',function(){routeState.date=this.value;renderRoute();});
    $('#rStart').addEventListener('change',function(){routeState.start=this.value;drawCustom();});
    $('#rEnd').addEventListener('change',function(){routeState.end=this.value;drawCustom();});
    function drawCustom(){var h='';if(routeState.start==='custom')h+='<div class="field"><label>Custom start address</label><input type="text" id="rSC" value="'+esc(routeState.startCustom)+'"></div>';if(routeState.end==='custom')h+='<div class="field"><label>Custom end address</label><input type="text" id="rEC" value="'+esc(routeState.endCustom)+'"></div>';$('#rCustomWrap').innerHTML=h;var sc=$('#rSC');if(sc)sc.addEventListener('input',function(){routeState.startCustom=this.value;});var ec=$('#rEC');if(ec)ec.addEventListener('input',function(){routeState.endCustom=this.value;});}
    drawCustom();
    bindStopMoves();
    $('#rMaps').addEventListener('click',function(){var u=buildMapsUrl(baseAddr);if(!u){toast('Add at least one stop with an address.',true);return;}window.open(u,'_blank');});
    $('#rSave').addEventListener('click',function(){saveRoute(baseAddr);});
    $('#rReset').addEventListener('click',function(){routeState._visits.sort(function(a,b){return String(a.start_time||'').localeCompare(String(b.start_time||''));});redrawStops();});
    $('#rPrint').addEventListener('click',function(){printRoute(baseAddr,set);});
  }
  function routeStopHtml(v,i){var a=addrOf(v);return '<div class="route-stop'+(v.priority==='High'?' high':'')+'" data-id="'+v.id+'"><div class="ord">'+(i+1)+'</div>'
    +'<div class="rs-main"><strong>'+esc(v.business_name||v.client_name||'Visit')+'</strong> '+prioBadge(v.priority)+(v.fixed_time?' <span class="fixedflag">fixed '+esc(v.start_time||'')+'</span>':'')
    +'<br><small>'+esc(a)+(v.estimated_duration?' · '+v.estimated_duration+' min':'')+'</small></div>'
    +'<div class="rs-move"><button data-up="'+v.id+'">▲</button><button data-down="'+v.id+'">▼</button></div></div>';}
  function redrawStops(){$('#rList').innerHTML=routeState._visits.map(function(v,i){return routeStopHtml(v,i);}).join('');bindStopMoves();}
  function bindStopMoves(){
    $$('#rList [data-up]').forEach(function(b){b.addEventListener('click',function(){moveStop(b.getAttribute('data-up'),-1);});});
    $$('#rList [data-down]').forEach(function(b){b.addEventListener('click',function(){moveStop(b.getAttribute('data-down'),1);});});
  }
  function moveStop(id,dir){var a=routeState._visits;var i=a.findIndex(function(v){return v.id===id;});var j=i+dir;if(i<0||j<0||j>=a.length)return;var t=a[i];a[i]=a[j];a[j]=t;redrawStops();}
  function buildMapsUrl(baseAddr){
    var stops=routeState._visits.map(function(v){return addrOf(v);}).filter(Boolean);if(!stops.length)return '';
    var start=routeState.start==='custom'?routeState.startCustom:(baseAddr||stops[0]);
    var end;
    if(routeState.end==='base')end=baseAddr||start; else if(routeState.end==='last')end=stops[stops.length-1]; else end=routeState.endCustom||baseAddr||start;
    var wpStops=stops.slice(); // if end is last, drop it from waypoints
    if(routeState.end==='last')wpStops=stops.slice(0,-1);
    var enc=encodeURIComponent;
    var u='https://www.google.com/maps/dir/?api=1&travelmode=driving&origin='+enc(start||stops[0])+'&destination='+enc(end);
    if(wpStops.length)u+='&waypoints='+wpStops.map(enc).join('%7C');
    return u;
  }
  async function saveRoute(baseAddr){
    var url=buildMapsUrl(baseAddr);
    for(var i=0;i<routeState._visits.length;i++){await sb.from('visits').update({route_order:i+1}).eq('id',routeState._visits[i].id);}
    var start=routeState.start==='custom'?routeState.startCustom:baseAddr;
    await sb.from('daily_routes').upsert({route_date:routeState.date,start_address:start,end_address:(routeState.end==='custom'?routeState.endCustom:baseAddr),google_maps_url:url,optimized:false,total_on_site_time:routeState._visits.reduce(function(s,v){return s+(v.estimated_duration||0);},0)},{onConflict:'route_date'});
    logAct('route',null,'Route saved',routeState.date);
    toast('Route order saved ✓');
  }
  function printRoute(baseAddr,set){
    var rows=routeState._visits.map(function(v,i){var a=addrOf(v);return '<tr><td>'+(i+1)+'</td><td><b>'+esc(v.business_name||v.client_name||'')+'</b><br>'+esc(v.client_name||'')+'</td><td>'+esc(a)+'<br><a href="'+mapsSearch(a)+'">Maps</a></td><td>'+esc(v.phone||'')+'</td><td>'+esc(v.service_needed||'')+'<br>'+esc(v.visit_type||'')+'</td><td>'+esc(v.priority||'')+'</td><td>'+esc(v.start_time||'')+'<br>'+(v.estimated_duration||'')+' min</td><td>'+esc(v.internal_notes||v.notes||'')+'</td></tr>';}).join('');
    var w=window.open('','_blank');
    w.document.write('<html><head><title>Daily Route '+routeState.date+'</title><style>body{font-family:Arial;padding:20px;color:#0b0f19}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}th{background:#f1f5f9}a{color:#0b57d0}</style></head><body>'
      +'<h1>ConnectWorks — Daily Route · '+routeState.date+'</h1><p>Start: '+esc(routeState.start==='custom'?routeState.startCustom:(baseAddr||'Base'))+' · Full route: <a href="'+buildMapsUrl(baseAddr)+'">Open in Google Maps</a></p>'
      +'<table><thead><tr><th>#</th><th>Client</th><th>Address</th><th>Phone</th><th>Service / Type</th><th>Priority</th><th>Time</th><th>Notes</th></tr></thead><tbody>'+rows+'</tbody></table></body></html>');
    w.document.close();w.focus();setTimeout(function(){w.print();},400);
  }

  /* ===================== SETTINGS ===================== */
  var setFields=[
    {n:'company_name',l:'Company name'},{n:'phone'},{n:'email'},{n:'website'},{n:'service_area'},
    {n:'base_address',l:'Base address (for routes)'},{n:'base_city'},{n:'base_state'},{n:'base_zip_code',l:'Base ZIP'},
    {n:'default_quote_validity_days',l:'Quote validity (days)',t:'number'},{n:'default_deposit_percentage',l:'Default deposit %',t:'number'},
    {n:'default_warranty_text',l:'Default warranty text',t:'textarea'},{n:'default_terms_text',l:'Default terms text',t:'textarea'}
  ];
  async function renderSettings(){
    var c=$('#c');c.innerHTML='<div class="center-msg">Loading…</div>';
    var r=await sb.from('ops_settings').select('*').eq('id',1).maybeSingle();
    var row=r.data||{id:1};
    var tm=(await sb.from('team_members').select('*').order('created_at',{ascending:true})).data||[];
    c.innerHTML='<div class="panel"><h3>Company & Routes</h3>'+formHtml(setFields,row)+'</div>'
      +'<div class="panel"><div class="list-head"><h3>Team Members</h3><button class="btn btn--primary" id="newTm">'+ic('check',16)+' Add</button></div>'
      +'<table><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th></th></tr></thead><tbody>'
      +(tm.map(function(t){return '<tr><td>'+esc(t.name)+'</td><td>'+esc(t.role||'')+'</td><td>'+esc(t.phone||'')+'</td><td class="row-actions"><button class="btn" data-tme="'+t.id+'">Edit</button><button class="btn btn--danger" data-tmd="'+t.id+'">Del</button></td></tr>';}).join('')||'<tr><td colspan="4" class="muted">No team members.</td></tr>')
      +'</tbody></table></div>';
    var scope=$('#c');
    var row2=row;
    var form=$('#opf',scope);
    $('[data-cancel]',scope).style.display='none';
    form.addEventListener('submit',async function(e){e.preventDefault();var st=$('#opfStatus');st.textContent='Saving…';var payload=readForm(setFields,scope);payload.id=1;var res=await sb.from('ops_settings').upsert(payload);if(res.error){st.className='status status--err';st.textContent=res.error.message;}else{st.className='status status--ok';st.textContent='Saved ✓';toast('Settings saved');}});
    $('#newTm').addEventListener('click',function(){openTeam({active:true});});
    $$('[data-tme]',scope).forEach(function(b){b.addEventListener('click',function(){openTeam(tm.filter(function(x){return x.id===b.getAttribute('data-tme');})[0]);});});
    $$('[data-tmd]',scope).forEach(function(b){b.addEventListener('click',async function(){if(!confirm('Delete team member?'))return;await sb.from('team_members').delete().eq('id',b.getAttribute('data-tmd'));renderSettings();});});
  }
  var tmFields=[{n:'name',req:true},{n:'role'},{n:'phone'},{n:'email'},{n:'active',l:'Active',t:'bool'}];
  function openTeam(row){var m=modal(row.id?'Edit team member':'Add team member',formHtml(tmFields,row));wireSave(m,tmFields,row,'team_members',function(){renderSettings();});}

  /* ----- shared save wiring for modals ----- */
  function wireSave(m,fields,row,table,after,onSaved){
    var form=m.querySelector('#opf');
    m.querySelector('[data-cancel]').addEventListener('click',function(){m.close();});
    form.addEventListener('submit',async function(e){e.preventDefault();
      var st=m.querySelector('#opfStatus');st.className='status';st.textContent='Saving…';
      var payload=readForm(fields,m);
      var res;
      if(row.id)res=await sb.from(table).update(payload).eq('id',row.id).select().maybeSingle();
      else res=await sb.from(table).insert(payload).select().maybeSingle();
      if(res.error){st.className='status status--err';st.textContent=res.error.message;toast(res.error.message,true);}
      else{st.className='status status--ok';st.textContent='Saved ✓';if(onSaved)onSaved(res.data);toast('Saved');m.close();after();}
    });
  }
})();
