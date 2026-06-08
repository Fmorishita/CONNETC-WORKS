/* =========================================================
   ConnectWorks Operations Hub — full app
   Phase 1: Dashboard · Leads · Calendar/Visits · Route Planner · Settings
   Phase 2: Quotes (+PDF) · Follow-ups · Projects · Materials · Advanced route
   Static SPA on Supabase (Auth + DB). Private (authenticated only).
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
  var QUOTE_STATUS=['Draft','Sent','Approved','Declined','Expired'];
  var UNITS=['Each','Hour','Foot','Set','Lot','Job'];
  var FOLLOWUP_TYPE=['First Follow-up','Second Follow-up','Final Follow-up'];
  var FOLLOWUP_STATUS=['Pending','Done','Snoozed'];
  var PROJECT_STATUS=['Not Started','Scheduled','In Progress','On Hold','Completed'];
  var MATERIAL_STATUS=['Needed','Ordered','Received','Installed'];

  /* ----- helpers ----- */
  function $(s,c){return (c||document).querySelector(s);}
  function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function ic(n,sz){sz=sz||20;return '<svg class="ic" viewBox="0 0 24 24" style="width:'+sz+'px;height:'+sz+'px"><use href="#i-'+(n||'check')+'"/></svg>';}
  function toast(m,err){var t=document.createElement('div');t.className='toast'+(err?' toast--err':'');t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove();},2800);}
  function today(){return new Date().toISOString().slice(0,10);}
  function addDays(n){var d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
  function digits(v){return String(v||'').replace(/\D/g,'');}
  function money(n){return '$'+(Number(n||0)).toFixed(2);}
  function num(v){var n=parseFloat(v);return isNaN(n)?0:n;}
  function addrOf(o){return [o.address,[o.city,o.state].filter(Boolean).join(', '),o.zip_code].filter(Boolean).join(' ').trim();}
  function mapsSearch(addr){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(addr);}
  function statusBadge(s){var k=String(s||'').toLowerCase();var cls='b-default';
    if(k.indexOf('new')>=0)cls='b-new';else if(k.indexOf('contact')>=0)cls='b-contacted';
    else if(k.indexOf('site visit')>=0)cls='b-visit';else if(k.indexOf('quote')>=0||k==='sent'||k==='draft')cls='b-quote';
    else if(k.indexOf('follow')>=0||k==='pending'||k==='snoozed')cls='b-follow';else if(k.indexOf('approved')>=0||k==='done'||k==='received'||k==='completed')cls='b-approved';
    else if(k.indexOf('lost')>=0||k.indexOf('declin')>=0||k.indexOf('cancel')>=0||k==='expired')cls='b-lost';
    else if(k.indexOf('install')>=0||k==='ordered'||k==='in progress'||k==='scheduled')cls='b-install';else if(k.indexOf('complete')>=0)cls='b-completed';
    return '<span class="b '+cls+'">'+esc(s||'—')+'</span>';}
  function prioBadge(p){var k=String(p||'Medium').toLowerCase();return '<span class="b b-'+k+'">'+esc(p||'Medium')+'</span>';}
  function logAct(et,id,action,desc){ try{ sb.from('activity_log').insert({entity_type:et,entity_id:id||null,action:action,description:desc||null,created_by:(state.session&&state.session.user&&state.session.user.email)||null}); }catch(e){} }

  function modal(title,inner,wide){
    var w=document.createElement('div');w.className='modal';
    w.innerHTML='<div class="modal__box" style="'+(wide?'max-width:760px':'')+'"><div class="modal__head"><h3 style="margin:0">'+esc(title)+'</h3><button class="btn btn--ghost" data-x>✕</button></div>'+inner+'</div>';
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
  function sel(id,ph,opts){return '<select id="'+id+'"><option value="">'+ph+'</option>'+opts.map(function(o){return '<option>'+esc(o)+'</option>';}).join('')+'</select>';}

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
    {k:'quotes',l:'Quotes',i:'doc'},{k:'followups',l:'Follow-ups',i:'chat'},
    {k:'projects',l:'Projects',i:'wrench'},{k:'materials',l:'Materials',i:'clipboard'},
    {k:'settings',l:'Settings',i:'tools'}
  ];
  var LABELS={dashboard:'Dashboard',leads:'Leads',calendar:'Calendar / Visits',route:'Route Planner',quotes:'Quotes',followups:'Follow-ups',projects:'Projects',materials:'Materials',settings:'Settings'};

  function renderApp(){
    var nav=NAV.map(function(n){return '<button class="navitem'+(state.view===n.k?' navitem--on':'')+'" data-go="'+n.k+'">'+ic(n.i,18)+' <span>'+n.l+'</span></button>';}).join('');
    app.innerHTML='<div class="app"><aside class="sidebar"><div class="brand"><img src="/assets/logo-connectworks.png" alt=""> Ops Hub</div><div class="grp">Operations</div>'+nav
      +'</aside><div class="main"><div class="topbar"><h2 id="pt"></h2><div class="right">'
      +'<a class="btn" href="/admin" target="_blank">'+ic('sliders',18)+' Website CMS</a>'
      +'<button class="btn btn--ghost" id="lo">Logout</button></div></div><div class="content" id="c"></div></div></div>';
    $$('[data-go]').forEach(function(b){b.addEventListener('click',function(){state.view=b.getAttribute('data-go');renderApp();});});
    $('#lo').addEventListener('click',function(){sb.auth.signOut();});
    $('#pt').textContent=LABELS[state.view];
    ({dashboard:renderDashboard,leads:renderLeads,calendar:renderCalendar,route:renderRoute,quotes:renderQuotes,followups:renderFollowups,projects:renderProjects,materials:renderMaterials,settings:renderSettings}[state.view])();
  }

  function settingsCache(){return state._settings||{};}
  async function loadSettings(){var r=await sb.from('ops_settings').select('*').eq('id',1).maybeSingle();state._settings=r.data||{};return state._settings;}

  /* ===================== DASHBOARD ===================== */
  async function renderDashboard(){
    var c=$('#c');c.innerHTML='<div class="center-msg">Loading…</div>';
    var leads=(await sb.from('leads').select('*').order('created_at',{ascending:false})).data||[];
    var visits=(await sb.from('visits').select('*').order('scheduled_date',{ascending:true})).data||[];
    var quotes=(await sb.from('quotes').select('*').order('created_at',{ascending:false})).data||[];
    var fups=(await sb.from('follow_ups').select('*').order('follow_up_date',{ascending:true})).data||[];
    var projects=(await sb.from('projects').select('*')).data||[];
    var materials=(await sb.from('project_materials').select('*')).data||[];
    var t=today(), we=addDays(7); function low(s){return String(s||'').toLowerCase();}
    var newLeads=leads.filter(function(l){return low(l.status).indexOf('new')>=0;}).length;
    var attention=leads.filter(function(l){var s=low(l.status);return s.indexOf('new')>=0||s.indexOf('contact')>=0||s.indexOf('follow')>=0;});
    var todayVisits=visits.filter(function(v){return v.scheduled_date===t && low(v.status)!=='cancelled';});
    var weekVisits=visits.filter(function(v){return v.scheduled_date>=t && v.scheduled_date<=we && low(v.status)!=='cancelled';});
    var quotesSent=quotes.filter(function(q){return q.status==='Sent';});
    var approvedValue=quotes.filter(function(q){return q.status==='Approved';}).reduce(function(s,q){return s+num(q.total);},0);
    var fupsDue=fups.filter(function(f){return f.status==='Pending' && f.follow_up_date && f.follow_up_date<=t;});
    var activeProjects=projects.filter(function(p){return p.status!=='Completed';}).length;
    var matNeeded=materials.filter(function(m){return m.status==='Needed';}).length;

    function metric(num,lbl,cls){return '<div class="metric '+(cls||'')+'"><div class="num">'+num+'</div><div class="lbl">'+lbl+'</div></div>';}
    var first=todayVisits[0], next=todayVisits[1];
    var route='<div class="panel"><h3>'+ic('pin',18)+' Today\'s Route</h3>'
      +'<div class="mini"><span>Visits today</span><strong>'+todayVisits.length+'</strong></div>'
      +'<div class="mini"><span>First stop</span><span>'+(first?esc((first.business_name||first.client_name||'')+' — '+(first.city||'')):'—')+'</span></div>'
      +'<div class="mini"><span>Next stop</span><span>'+(next?esc((next.business_name||next.client_name||'')+' — '+(next.city||'')):'—')+'</span></div>'
      +'<button class="btn btn--primary" style="margin-top:12px" id="goRoute">'+ic('pin',16)+' Plan Today\'s Route</button></div>';
    var attn='<div class="panel"><h3>Leads Needing Attention ('+attention.length+')</h3>'
      +(attention.slice(0,6).map(function(l){return '<div class="mini"><a href="#" data-lead="'+l.id+'">'+esc(l.business||l.name||'Lead')+'</a>'+statusBadge(l.status)+'</div>';}).join('')||'<div class="muted">All caught up 🎉</div>')+'</div>';
    var fupPanel='<div class="panel"><h3>Follow-ups Due ('+fupsDue.length+')</h3>'
      +(fupsDue.slice(0,6).map(function(f){return '<div class="mini"><a href="#" data-fup="'+f.id+'">'+esc(f.client_name||f.business_name||'Follow-up')+'</a><span>'+esc(f.follow_up_date)+'</span></div>';}).join('')||'<div class="muted">Nothing due.</div>')+'</div>';

    c.innerHTML='<div class="metrics">'
      +metric(newLeads,'New leads','blue')+metric(todayVisits.length,'Visits today')+metric(weekVisits.length,'Visits this week')
      +metric(attention.length,'Leads needing attention','alert')+metric(quotesSent.length,'Quotes sent','blue')
      +metric(money(approvedValue),'Approved $','ok')+metric(fupsDue.length,'Follow-ups due','alert')
      +metric(activeProjects,'Active projects')+metric(matNeeded,'Materials needed','alert')
      +'</div>'+route+'<div class="cols2">'+attn+fupPanel+'</div>';
    $('#goRoute').addEventListener('click',function(){state.view='route';renderApp();});
    $$('[data-lead]',c).forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();state.view='leads';renderApp();setTimeout(function(){openLead(leads.filter(function(x){return x.id===a.getAttribute('data-lead');})[0]);},60);});});
    $$('[data-fup]',c).forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();state.view='followups';renderApp();});});
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
      +'<button class="btn" data-quote>'+ic('doc',14)+' Create Quote</button>'
      +(row.phone?'<a class="btn" href="tel:+1'+digits(row.phone)+'">'+ic('phone',14)+' Call</a>':'')
      +(row.email?'<a class="btn" href="mailto:'+esc(row.email)+'">'+ic('mail',14)+' Email</a>':'')
      +(addrOf(row)?'<a class="btn" target="_blank" href="'+mapsSearch(addrOf(row))+'">'+ic('pin',14)+' Maps</a>':'')+'</div>':'';
    var m=modal(row.id?'Lead — '+(row.business||row.name||''):'New lead', actions+formHtml(leadFields,row), true);
    wireSave(m,leadFields,row,'leads',function(){renderLeads();});
    var dv=m.querySelector('[data-visit]'); if(dv) dv.addEventListener('click',function(){m.close();openVisit(visitFromLead(row),row);});
    var dq=m.querySelector('[data-quote]'); if(dq) dq.addEventListener('click',function(){m.close();state.view='quotes';renderApp();setTimeout(function(){openQuote(quoteFromLead(row),row);},60);});
  }
  function visitFromLead(l){return {lead_id:l.id,client_name:l.name,business_name:l.business,phone:l.phone,email:l.email,address:l.address,city:l.city,state:l.state||'CA',zip_code:l.zip_code,service_needed:l.service,visit_type:'Site Assessment',status:'Scheduled',priority:'Medium',estimated_duration:60,scheduled_date:today()};}
  function quoteFromLead(l){return {lead_id:l.id,client_name:l.name,business_name:l.business,client_email:l.email,client_phone:l.phone,project_address:addrOf(l),service_category:l.service,status:'Draft'};}

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
    var visits=(await sb.from('visits').select('*').order('scheduled_date',{ascending:true}).order('start_time',{ascending:true})).data||[];
    var t=today(), ed=addDays(calMode==='day'?0:13);
    var shown=visits.filter(function(v){return v.scheduled_date && v.scheduled_date>=t && v.scheduled_date<=ed;});
    var groups={};shown.forEach(function(v){(groups[v.scheduled_date]=groups[v.scheduled_date]||[]).push(v);});
    var keys=Object.keys(groups).sort();
    var html='<div class="toolbar"><button class="btn'+(calMode==='day'?' btn--primary':'')+'" id="md">Today</button><button class="btn'+(calMode==='week'?' btn--primary':'')+'" id="mw">Next 14 days</button><span class="spacer"></span><button class="btn btn--primary" id="newVisit">'+ic('check',18)+' New visit</button></div>';
    html+=keys.map(function(d){return '<div class="daygroup"><h4>'+ic('clock',16)+' '+esc(d)+' ('+groups[d].length+')</h4>'+groups[d].map(visitCard).join('')+'</div>';}).join('')||'<div class="panel muted">No upcoming visits. Create one or schedule from a lead.</div>';
    c.innerHTML=html;
    $('#md').addEventListener('click',function(){calMode='day';renderCalendar();});
    $('#mw').addEventListener('click',function(){calMode='week';renderCalendar();});
    $('#newVisit').addEventListener('click',function(){openVisit({status:'Scheduled',priority:'Medium',state:'CA',estimated_duration:60,scheduled_date:today()});});
    $$('[data-vedit]',c).forEach(function(b){b.addEventListener('click',function(){openVisit(visits.filter(function(x){return x.id===b.getAttribute('data-vedit');})[0]);});});
    $$('[data-vdone]',c).forEach(function(b){b.addEventListener('click',async function(){var id=b.getAttribute('data-vdone');await sb.from('visits').update({status:'Completed'}).eq('id',id);logAct('visit',id,'Visit completed');toast('Marked completed.');renderCalendar();});});
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

  /* ===================== ROUTE PLANNER (basic + advanced) ===================== */
  var routeState={date:today(),start:'base',startCustom:'',end:'base',endCustom:'',_visits:[]};
  var mapsReady=false;
  function loadMaps(){return new Promise(function(res,rej){
    if(window.google&&window.google.maps)return res();
    if(!CFG.GOOGLE_MAPS_API_KEY)return rej(new Error('no-key'));
    window.__cwMapsCb=function(){mapsReady=true;res();};
    var s=document.createElement('script');
    s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(CFG.GOOGLE_MAPS_API_KEY)+'&callback=__cwMapsCb';
    s.async=true;s.onerror=function(){rej(new Error('Maps failed to load — check the key & referrer restrictions.'));};
    document.head.appendChild(s);
  });}
  async function renderRoute(){
    var c=$('#c');c.innerHTML='<div class="center-msg">Loading…</div>';
    var set=await loadSettings();
    var visits=((await sb.from('visits').select('*').eq('scheduled_date',routeState.date).neq('status','Cancelled')).data||[])
      .sort(function(a,b){return (a.route_order||999)-(b.route_order||999)||String(a.start_time||'').localeCompare(String(b.start_time||''));});
    var withAddr=visits.filter(function(v){return addrOf(v);}), noAddr=visits.filter(function(v){return !addrOf(v);});
    routeState._visits=withAddr;
    var baseAddr=[set.base_address,set.base_city,set.base_state,set.base_zip_code].filter(Boolean).join(' ');
    var hasKey=!!CFG.GOOGLE_MAPS_API_KEY;

    var startSel='<select id="rStart"><option value="base" '+(routeState.start==='base'?'selected':'')+'>Base'+(baseAddr?' ('+esc(baseAddr)+')':'')+'</option><option value="custom" '+(routeState.start==='custom'?'selected':'')+'>Custom address…</option></select>';
    var endSel='<select id="rEnd"><option value="base" '+(routeState.end==='base'?'selected':'')+'>Back to base</option><option value="last" '+(routeState.end==='last'?'selected':'')+'>End at last stop</option><option value="custom" '+(routeState.end==='custom'?'selected':'')+'>Custom address…</option></select>';
    var banner=hasKey?'':'<div class="warn">Google Maps API not configured — running in <strong>basic mode</strong>: order stops manually and open the full multi-stop route in Google Maps. Add a key in <code>js/cw-config.js</code> to enable the embedded map + automatic optimization.</div>';
    var summary='<div class="route-summary">'
      +'<div class="metric"><div class="num">'+withAddr.length+'</div><div class="lbl">Stops</div></div>'
      +'<div class="metric"><div class="num">'+withAddr.reduce(function(s,v){return s+(v.estimated_duration||0);},0)+' min</div><div class="lbl">On-site time</div></div>'
      +'<div class="metric"><div class="num" id="rDrive">—</div><div class="lbl">Drive time</div></div>'
      +'<div class="metric"><div class="num" id="rDist">—</div><div class="lbl">Distance</div></div></div>';
    var list=withAddr.map(function(v,i){return routeStopHtml(v,i);}).join('')||'<div class="panel muted">No visits with an address for this day.</div>';
    var noList=noAddr.length?'<div class="warn">'+noAddr.length+' visit(s) have no address and were excluded:<br>'+noAddr.map(function(v){return '• '+esc(v.business_name||v.client_name||'Visit');}).join('<br>')+'</div>':'';

    c.innerHTML='<div class="toolbar"><label>Date <input type="date" id="rDate" value="'+routeState.date+'"></label>'
      +'<label>Start '+startSel+'</label><label>End '+endSel+'</label></div>'
      +'<div id="rCustomWrap"></div>'+banner+summary
      +'<div class="toolbar">'+(hasKey?'<button class="btn btn--primary" id="rOpt">'+ic('sparkle',16)+' Optimize Automatically</button>':'')
      +'<button class="btn'+(hasKey?'':' btn--primary')+'" id="rMaps">'+ic('pin',16)+' Open in Google Maps</button>'
      +'<button class="btn" id="rSave">'+ic('check',16)+' Save Route Order</button>'
      +'<button class="btn" id="rPrint">Print Daily Route</button><button class="btn" id="rReset">Reset Order</button></div>'
      +(hasKey?'<div id="map"></div>':'')
      +'<div id="rList">'+list+'</div>'+noList;

    $('#rDate').addEventListener('change',function(){routeState.date=this.value;renderRoute();});
    $('#rStart').addEventListener('change',function(){routeState.start=this.value;drawCustom();});
    $('#rEnd').addEventListener('change',function(){routeState.end=this.value;drawCustom();});
    function drawCustom(){var h='';if(routeState.start==='custom')h+='<div class="field"><label>Custom start address</label><input type="text" id="rSC" value="'+esc(routeState.startCustom)+'"></div>';if(routeState.end==='custom')h+='<div class="field"><label>Custom end address</label><input type="text" id="rEC" value="'+esc(routeState.endCustom)+'"></div>';$('#rCustomWrap').innerHTML=h;var sc=$('#rSC');if(sc)sc.addEventListener('input',function(){routeState.startCustom=this.value;});var ec=$('#rEC');if(ec)ec.addEventListener('input',function(){routeState.endCustom=this.value;});}
    drawCustom();bindStopMoves();
    $('#rMaps').addEventListener('click',function(){var u=buildMapsUrl(baseAddr);if(!u){toast('Add at least one stop with an address.',true);return;}window.open(u,'_blank');});
    $('#rSave').addEventListener('click',function(){saveRoute(baseAddr);});
    $('#rReset').addEventListener('click',function(){routeState._visits.sort(function(a,b){return String(a.start_time||'').localeCompare(String(b.start_time||''));});redrawStops();});
    $('#rPrint').addEventListener('click',function(){printRoute(baseAddr,set);});
    if(hasKey){var ob=$('#rOpt');ob.addEventListener('click',function(){optimizeRoute(baseAddr,set);});drawMap(baseAddr);}
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
  function routeEndpoints(baseAddr){
    var stops=routeState._visits.map(function(v){return addrOf(v);}).filter(Boolean);
    var start=routeState.start==='custom'?routeState.startCustom:(baseAddr||stops[0]);
    var end=routeState.end==='base'?(baseAddr||start):(routeState.end==='last'?stops[stops.length-1]:(routeState.endCustom||baseAddr||start));
    return {stops:stops,start:start,end:end};
  }
  function buildMapsUrl(baseAddr){
    var e=routeEndpoints(baseAddr);if(!e.stops.length)return '';
    var wp=e.stops.slice();if(routeState.end==='last')wp=e.stops.slice(0,-1);
    var enc=encodeURIComponent;
    var u='https://www.google.com/maps/dir/?api=1&travelmode=driving&origin='+enc(e.start||e.stops[0])+'&destination='+enc(e.end);
    if(wp.length)u+='&waypoints='+wp.map(enc).join('%7C');
    return u;
  }
  async function saveRoute(baseAddr){
    var url=buildMapsUrl(baseAddr);
    for(var i=0;i<routeState._visits.length;i++){await sb.from('visits').update({route_order:i+1}).eq('id',routeState._visits[i].id);}
    var e=routeEndpoints(baseAddr);
    await sb.from('daily_routes').upsert({route_date:routeState.date,start_address:e.start,end_address:e.end,google_maps_url:url,optimized:!!routeState._optimized,total_on_site_time:routeState._visits.reduce(function(s,v){return s+(v.estimated_duration||0);},0),total_drive_time:routeState._driveMin||null,total_distance:routeState._distMi||null},{onConflict:'route_date'});
    logAct('route',null,'Route saved',routeState.date);toast('Route order saved ✓');
  }
  function printRoute(baseAddr,set){
    var rows=routeState._visits.map(function(v,i){var a=addrOf(v);return '<tr><td>'+(i+1)+'</td><td><b>'+esc(v.business_name||v.client_name||'')+'</b><br>'+esc(v.client_name||'')+'</td><td>'+esc(a)+'<br><a href="'+mapsSearch(a)+'">Maps</a></td><td>'+esc(v.phone||'')+'</td><td>'+esc(v.service_needed||'')+'<br>'+esc(v.visit_type||'')+'</td><td>'+esc(v.priority||'')+'</td><td>'+esc(v.start_time||'')+'<br>'+(v.estimated_duration||'')+' min</td><td>'+esc(v.internal_notes||v.notes||'')+'</td></tr>';}).join('');
    var w=window.open('','_blank');
    w.document.write('<html><head><title>Daily Route '+routeState.date+'</title><style>body{font-family:Arial;padding:20px;color:#0b0f19}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}th{background:#f1f5f9}a{color:#0b57d0}</style></head><body>'
      +'<h1>ConnectWorks — Daily Route · '+routeState.date+'</h1><p>Start: '+esc(routeEndpoints(baseAddr).start||'Base')+' · Full route: <a href="'+buildMapsUrl(baseAddr)+'">Open in Google Maps</a></p>'
      +'<table><thead><tr><th>#</th><th>Client</th><th>Address</th><th>Phone</th><th>Service / Type</th><th>Priority</th><th>Time</th><th>Notes</th></tr></thead><tbody>'+rows+'</tbody></table></body></html>');
    w.document.close();w.focus();setTimeout(function(){w.print();},400);
  }
  async function drawMap(baseAddr){
    try{await loadMaps();}catch(e){var mp=$('#map');if(mp)mp.innerHTML='<div class="warn" style="margin:0">'+esc(e.message)+'</div>';return;}
    var mp=$('#map');if(!mp)return;
    var e=routeEndpoints(baseAddr);
    var map=new google.maps.Map(mp,{zoom:10,center:{lat:32.7157,lng:-117.1611},mapTypeControl:false,streetViewControl:false});
    routeState._map=map;
    if(e.stops.length){renderDirections(map,baseAddr,false);}
  }
  function renderDirections(map,baseAddr,optimize){
    var e=routeEndpoints(baseAddr);if(!e.stops.length)return;
    var ds=new google.maps.DirectionsService();
    var dr=routeState._dr||(routeState._dr=new google.maps.DirectionsRenderer({suppressMarkers:false}));
    dr.setMap(map);
    var wp=e.stops.map(function(s){return {location:s,stopover:true};});
    if(routeState.end==='last')wp=wp.slice(0,-1);
    ds.route({origin:e.start||e.stops[0],destination:e.end,waypoints:wp,optimizeWaypoints:!!optimize,travelMode:google.maps.TravelMode.DRIVING},function(res,status){
      if(status!=='OK'){toast('Google Maps: '+status,true);return;}
      dr.setDirections(res);
      var legs=res.routes[0].legs, sec=0, met=0;
      legs.forEach(function(l){sec+=l.duration.value;met+=l.distance.value;});
      routeState._driveMin=Math.round(sec/60);routeState._distMi=+(met/1609.34).toFixed(1);
      var dEl=$('#rDrive'),sEl=$('#rDist');if(dEl)dEl.textContent=routeState._driveMin+' min';if(sEl)sEl.textContent=routeState._distMi+' mi';
      if(optimize){
        var order=res.routes[0].waypoint_order;
        var base=routeState.end==='last'?routeState._visits.slice(0,-1):routeState._visits.slice();
        var lastStop=routeState.end==='last'?routeState._visits[routeState._visits.length-1]:null;
        var reordered=order.map(function(i){return base[i];});
        if(lastStop)reordered.push(lastStop);
        routeState._visits=reordered;routeState._optimized=true;redrawStops();toast('Route optimized by drive time ✓');
      }
    });
  }
  async function optimizeRoute(baseAddr,set){
    if(routeState._visits.length<2){toast('Need at least 2 stops to optimize.',true);return;}
    try{await loadMaps();}catch(e){toast(e.message,true);return;}
    if(!routeState._map)await drawMap(baseAddr);
    renderDirections(routeState._map,baseAddr,true);
  }

  /* ===================== QUOTES (+ PDF) ===================== */
  var quoteCache=[];
  async function renderQuotes(){
    var c=$('#c');c.innerHTML='<div class="center-msg">Loading…</div>';
    var r=await sb.from('quotes').select('*').order('created_at',{ascending:false});
    if(r.error){c.innerHTML='<div class="panel status status--err">'+esc(r.error.message)+'</div>';return;}
    quoteCache=r.data||[];
    c.innerHTML='<div class="toolbar"><input type="search" id="qq" placeholder="Search client, business, number…">'+sel('qfStatus','All statuses',QUOTE_STATUS)
      +'<span class="spacer"></span><button class="btn btn--primary" id="newQuote">'+ic('doc',18)+' New quote</button></div><div id="qTable"></div>';
    $('#qq').addEventListener('input',drawQuotes);$('#qfStatus').addEventListener('change',drawQuotes);
    $('#newQuote').addEventListener('click',function(){openQuote({status:'Draft'});});
    drawQuotes();
  }
  function drawQuotes(){
    var q=($('#qq').value||'').toLowerCase(),fs=$('#qfStatus').value;
    var rows=quoteCache.filter(function(x){if(fs&&x.status!==fs)return false;if(q){var hay=(x.client_name+' '+x.business_name+' '+x.quote_number+' '+x.quote_title).toLowerCase();if(hay.indexOf(q)<0)return false;}return true;});
    var tr=rows.map(function(x){return '<tr>'
      +'<td><strong>'+esc(x.quote_number||'—')+'</strong><br><span class="muted">'+esc(x.quote_title||'')+'</span></td>'
      +'<td>'+esc(x.business_name||x.client_name||'')+'</td><td>'+money(x.total)+'</td><td>'+statusBadge(x.status)+'</td>'
      +'<td><div class="linkbtns"><button class="btn" data-qpdf="'+x.id+'">PDF</button><button class="btn" data-qedit="'+x.id+'">Open</button></div></td></tr>';}).join('')
      ||'<tr><td colspan="5" class="muted">No quotes yet. Create one from a lead or with “New quote”.</td></tr>';
    $('#qTable').innerHTML='<table><thead><tr><th>Quote</th><th>Client</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>'+tr+'</tbody></table>';
    $$('#qTable [data-qedit]').forEach(function(b){b.addEventListener('click',function(){openQuote(quoteCache.filter(function(x){return x.id===b.getAttribute('data-qedit');})[0]);});});
    $$('#qTable [data-qpdf]').forEach(function(b){b.addEventListener('click',function(){printQuoteById(b.getAttribute('data-qpdf'));});});
  }
  function genQuoteNumber(){var d=new Date();function p(n){return String(n).padStart(2,'0');}return 'Q-'+d.getFullYear().toString().slice(2)+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes());}
  async function openQuote(row,lead){
    row=row||{};
    var set=await loadSettings();
    var templates=((await sb.from('quote_templates').select('*').eq('active',true)).data)||[];
    var items=[];
    if(row.id){items=((await sb.from('quote_line_items').select('*').eq('quote_id',row.id).order('sort_order',{ascending:true})).data)||[];}
    var pct=set.default_deposit_percentage||50;
    var validUntil=row.valid_until||addDays(set.default_quote_validity_days||15);
    var warranty=row.warranty_text||set.default_warranty_text||'';
    var terms=row.terms_text||set.default_terms_text||'';

    var tplSel='<div class="field"><label>Start from template (optional)</label><select id="qTpl"><option value="">— None —</option>'+templates.map(function(t,i){return '<option value="'+i+'">'+esc(t.template_name)+'</option>';}).join('')+'</select></div>';
    function fld(id,lbl,val,type){return '<div class="field"><label>'+lbl+'</label><input type="'+(type||'text')+'" id="'+id+'" value="'+esc(val==null?'':val)+'"></div>';}
    function selF(id,lbl,opts,val){return '<div class="field"><label>'+lbl+'</label><select id="'+id+'"><option value="">Select…</option>'+opts.map(function(o){return '<option '+(String(o)===String(val)?'selected':'')+'>'+esc(o)+'</option>';}).join('')+'</select></div>';}
    var header='<div class="grid2">'+fld('q-client_name','Client name',row.client_name)+fld('q-business_name','Business',row.business_name)
      +fld('q-client_email','Email',row.client_email)+fld('q-client_phone','Phone',row.client_phone)
      +fld('q-project_address','Project address',row.project_address)+selF('q-service_category','Service category',SERVICES,row.service_category)
      +fld('q-quote_title','Quote title',row.quote_title)+selF('q-status','Status',QUOTE_STATUS,row.status||'Draft')
      +fld('q-estimated_start_date','Estimated start',row.estimated_start_date,'date')+fld('q-estimated_duration','Estimated duration',row.estimated_duration)
      +fld('q-valid_until','Valid until',validUntil,'date')+'</div>'
      +'<div class="field"><label>Description / scope</label><textarea id="q-quote_description">'+esc(row.quote_description||'')+'</textarea></div>';
    var liHead='<div class="li-head"><h4 style="margin:0">Line items</h4><button class="btn" type="button" id="qAddLine">'+ic('check',14)+' Add line</button></div>';
    var liTable='<table class="li-table"><thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit price</th><th>Total</th><th></th></tr></thead><tbody id="qLines"></tbody></table>';
    var totals='<div class="totals"><div><span>Subtotal</span><strong id="qSub">$0.00</strong></div>'
      +'<div><span>Discount</span><input type="number" id="q-discount" value="'+num(row.discount)+'" step="0.01"></div>'
      +'<div><span>Tax</span><input type="number" id="q-tax" value="'+num(row.tax)+'" step="0.01"></div>'
      +'<div class="grand"><span>Total</span><strong id="qTot">$0.00</strong></div>'
      +'<div><span>Deposit ('+pct+'%)</span><strong id="qDep">$0.00</strong></div></div>';
    var legal='<div class="field"><label>Warranty</label><textarea id="q-warranty_text">'+esc(warranty)+'</textarea></div>'
      +'<div class="field"><label>Terms</label><textarea id="q-terms_text">'+esc(terms)+'</textarea></div>';
    var actions=row.id?'<div class="linkbtns" style="margin-bottom:12px"><button class="btn" type="button" data-pdf>'+ic('doc',14)+' Generate PDF</button>'
      +'<button class="btn" type="button" data-sent>Mark Sent + Follow-up</button>'
      +'<button class="btn" type="button" data-appr>Mark Approved → Project</button></div>':'';

    var html=actions+tplSel+header+liHead+liTable+totals+legal
      +'<div class="form-actions"><button class="btn btn--primary" id="qSave">'+ic('check',18)+' Save quote</button><button class="btn" data-cancel>Cancel</button><span class="status" id="qStatus"></span></div>';
    var m=modal(row.id?'Quote — '+(row.quote_number||''):'New quote',html,true);
    m.dataset.dep=pct;
    var tbody=$('#qLines',m);
    function addRow(it){it=it||{};var tr=document.createElement('tr');tr.className='li';
      tr.innerHTML='<td><input class="li-name" value="'+esc(it.item_name||'')+'"></td><td><input class="li-desc" value="'+esc(it.description||'')+'"></td>'
      +'<td><input type="number" class="li-qty" value="'+(it.quantity!=null?it.quantity:1)+'" step="0.01"></td>'
      +'<td><select class="li-unit">'+UNITS.map(function(u){return '<option '+(u===(it.unit||'Each')?'selected':'')+'>'+u+'</option>';}).join('')+'</select></td>'
      +'<td><input type="number" class="li-price" value="'+num(it.unit_price)+'" step="0.01"></td>'
      +'<td class="li-total">$0.00</td><td><button type="button" class="btn btn--danger" data-rm>✕</button></td>';
      tbody.appendChild(tr);recalc();}
    function recalc(){
      var sub=0;$$('.li',m).forEach(function(tr){var q=num($('.li-qty',tr).value),p=num($('.li-price',tr).value),t=q*p;$('.li-total',tr).textContent=money(t);sub+=t;});
      var disc=num($('#q-discount',m).value),tax=num($('#q-tax',m).value),tot=sub-disc+tax,dep=tot*(num(m.dataset.dep)/100);
      $('#qSub',m).textContent=money(sub);$('#qTot',m).textContent=money(tot);$('#qDep',m).textContent=money(dep);
    }
    if(items.length)items.forEach(addRow);else addRow();
    $('#qAddLine',m).addEventListener('click',function(){addRow();});
    m.addEventListener('input',function(e){if(e.target.matches('.li-qty,.li-price,#q-discount,#q-tax'))recalc();});
    m.addEventListener('click',function(e){if(e.target.closest('[data-rm]')){e.target.closest('tr').remove();recalc();}});
    $('[data-cancel]',m).addEventListener('click',function(){m.close();});

    function readQuote(){
      function v(id){var el=$('#'+id,m);return el?(el.value===''?null:el.value):null;}
      var sub=0,lines=[];$$('.li',m).forEach(function(tr,i){var name=$('.li-name',tr).value;if(!name&&!num($('.li-price',tr).value))return;var q=num($('.li-qty',tr).value),p=num($('.li-price',tr).value),t=q*p;sub+=t;
        lines.push({item_name:name,description:$('.li-desc',tr).value||null,quantity:q,unit:$('.li-unit',tr).value,unit_price:p,total:t,sort_order:i});});
      var disc=num(v('q-discount')),tax=num(v('q-tax')),tot=sub-disc+tax,dep=tot*(num(m.dataset.dep)/100);
      var data={client_name:v('q-client_name'),business_name:v('q-business_name'),client_email:v('q-client_email'),client_phone:v('q-client_phone'),
        project_address:v('q-project_address'),service_category:v('q-service_category'),quote_title:v('q-quote_title'),quote_description:v('q-quote_description'),
        status:v('q-status')||'Draft',estimated_start_date:v('q-estimated_start_date'),estimated_duration:v('q-estimated_duration'),valid_until:v('q-valid_until'),
        warranty_text:v('q-warranty_text'),terms_text:v('q-terms_text'),subtotal:sub,discount:disc,tax:tax,total:tot,deposit_required:dep};
      if(row.lead_id)data.lead_id=row.lead_id;
      return {data:data,lines:lines};
    }
    async function save(){
      var st=$('#qStatus',m);st.className='status';st.textContent='Saving…';
      var pkg=readQuote();
      if(!pkg.data.quote_number)pkg.data.quote_number=row.quote_number||genQuoteNumber();
      var res;
      if(row.id)res=await sb.from('quotes').update(pkg.data).eq('id',row.id).select().maybeSingle();
      else res=await sb.from('quotes').insert(pkg.data).select().maybeSingle();
      if(res.error){st.className='status status--err';st.textContent=res.error.message;toast(res.error.message,true);return null;}
      var qid=res.data.id;
      await sb.from('quote_line_items').delete().eq('quote_id',qid);
      if(pkg.lines.length){var ins=pkg.lines.map(function(l){l.quote_id=qid;return l;});await sb.from('quote_line_items').insert(ins);}
      if(lead&&lead.id)sb.from('leads').update({status:'Quote Sent'}).eq('id',lead.id);
      logAct('quote',qid,row.id?'Quote updated':'Quote created',pkg.data.quote_number);
      row.id=qid;row.quote_number=pkg.data.quote_number;
      st.className='status status--ok';st.textContent='Saved ✓';toast('Quote saved');
      return res.data;
    }
    $('#qSave',m).addEventListener('click',async function(){var s=await save();if(s){m.close();renderQuotes();}});
    var pb=m.querySelector('[data-pdf]');if(pb)pb.addEventListener('click',async function(){var s=await save();if(s)printQuoteById(s.id);});
    var sb2=m.querySelector('[data-sent]');if(sb2)sb2.addEventListener('click',async function(){var s=await save();if(!s)return;await sb.from('quotes').update({status:'Sent'}).eq('id',s.id);await createFollowupFromQuote(s,'First Follow-up',3);toast('Marked Sent + follow-up in 3 days.');m.close();renderQuotes();});
    var ab=m.querySelector('[data-appr]');if(ab)ab.addEventListener('click',async function(){var s=await save();if(!s)return;await sb.from('quotes').update({status:'Approved'}).eq('id',s.id);m.close();state.view='projects';renderApp();setTimeout(function(){openProject(projectFromQuote(s));},60);});
  }
  async function createFollowupFromQuote(q,type,days){
    var msg='Hi '+(q.client_name||'there')+', just following up on the quote we sent'+(q.quote_title?' for '+q.quote_title:'')+'. Happy to answer any questions or adjust anything to fit your needs. Let me know if you’d like to move forward. — ConnectWorks';
    await sb.from('follow_ups').insert({quote_id:q.id,lead_id:q.lead_id||null,client_name:q.client_name,business_name:q.business_name,follow_up_date:addDays(days),follow_up_type:type,status:'Pending',suggested_message:msg});
    logAct('follow_up',q.id,'Follow-up scheduled',type);
  }
  async function printQuoteById(id){
    var q=(await sb.from('quotes').select('*').eq('id',id).maybeSingle()).data;
    var items=((await sb.from('quote_line_items').select('*').eq('quote_id',id).order('sort_order',{ascending:true})).data)||[];
    var set=await loadSettings();printQuote(q,items,set);
  }
  function printQuote(q,items,set){
    var origin=location.origin;
    var rows=items.map(function(it){return '<tr><td>'+esc(it.item_name||'')+(it.description?'<br><span style="color:#667">'+esc(it.description)+'</span>':'')+'</td><td style="text-align:center">'+(it.quantity||1)+' '+esc(it.unit||'')+'</td><td style="text-align:right">'+money(it.unit_price)+'</td><td style="text-align:right">'+money(it.total)+'</td></tr>';}).join('');
    var w=window.open('','_blank');
    w.document.write('<html><head><title>'+esc(q.quote_number||'Quote')+'</title><style>'
      +'*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#0b0f19;margin:0;padding:32px}'
      +'.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0b57d0;padding-bottom:14px;margin-bottom:18px}'
      +'.hd img{height:54px}.co{text-align:right;font-size:12px;color:#445}'
      +'h1{font-size:20px;margin:0 0 4px}.meta{font-size:12px;color:#667}'
      +'.box{background:#f7f9fc;border:1px solid #e3e8ef;border-radius:8px;padding:12px;font-size:13px;margin:14px 0}'
      +'table{width:100%;border-collapse:collapse;margin:14px 0;font-size:13px}th,td{border-bottom:1px solid #e3e8ef;padding:9px;text-align:left;vertical-align:top}th{background:#0b57d0;color:#fff}'
      +'.tot{width:280px;margin-left:auto;font-size:13px}.tot div{display:flex;justify-content:space-between;padding:5px 0}.tot .g{font-size:16px;font-weight:700;border-top:2px solid #0b57d0;margin-top:6px;padding-top:8px}'
      +'.legal{font-size:11px;color:#556;margin-top:18px;white-space:pre-wrap}.sign{margin-top:34px;display:flex;gap:40px}.sign div{flex:1;border-top:1px solid #889;padding-top:6px;font-size:12px;color:#667}'
      +'@media print{body{padding:0}}</style></head><body>'
      +'<div class="hd"><img src="'+origin+'/assets/logo-connectworks.png" alt="ConnectWorks"><div class="co"><strong>'+esc(set.company_name||'ConnectWorks')+'</strong><br>'+esc(set.phone||'')+'<br>'+esc(set.email||'')+'<br>'+esc(set.website||'')+'<br>'+esc(set.service_area||'')+'</div></div>'
      +'<h1>Quote '+esc(q.quote_number||'')+'</h1><div class="meta">Date: '+esc(today())+(q.valid_until?' · Valid until: '+esc(q.valid_until):'')+' · Status: '+esc(q.status||'')+'</div>'
      +'<div class="box"><strong>Bill to:</strong> '+esc(q.business_name||q.client_name||'')+(q.client_name&&q.business_name?' ('+esc(q.client_name)+')':'')+'<br>'
      +(q.project_address?esc(q.project_address)+'<br>':'')+(q.client_phone?esc(q.client_phone)+' · ':'')+esc(q.client_email||'')+'</div>'
      +(q.quote_title?'<h2 style="font-size:15px;margin:8px 0">'+esc(q.quote_title)+'</h2>':'')
      +(q.quote_description?'<p style="font-size:13px;color:#445">'+esc(q.quote_description)+'</p>':'')
      +'<table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead><tbody>'+rows+'</tbody></table>'
      +'<div class="tot"><div><span>Subtotal</span><span>'+money(q.subtotal)+'</span></div>'
      +(num(q.discount)?'<div><span>Discount</span><span>-'+money(q.discount)+'</span></div>':'')
      +(num(q.tax)?'<div><span>Tax</span><span>'+money(q.tax)+'</span></div>':'')
      +'<div class="g"><span>Total</span><span>'+money(q.total)+'</span></div>'
      +(num(q.deposit_required)?'<div><span>Deposit to start</span><span>'+money(q.deposit_required)+'</span></div>':'')+'</div>'
      +(q.warranty_text?'<div class="legal"><strong>Warranty:</strong> '+esc(q.warranty_text)+'</div>':'')
      +(q.terms_text?'<div class="legal"><strong>Terms:</strong> '+esc(q.terms_text)+'</div>':'')
      +'<div class="sign"><div>Client signature / date</div><div>ConnectWorks</div></div>'
      +'<p style="text-align:center;color:#889;font-size:11px;margin-top:24px">Thank you for the opportunity to earn your business.</p>'
      +'</body></html>');
    w.document.close();w.focus();setTimeout(function(){w.print();},500);
  }

  /* ===================== FOLLOW-UPS ===================== */
  var fupFields=[
    {n:'client_name',l:'Client name'},{n:'business_name'},{n:'follow_up_date',l:'Date',t:'date'},
    {n:'follow_up_type',l:'Type',t:'select',options:FOLLOWUP_TYPE},{n:'status',t:'select',options:FOLLOWUP_STATUS},
    {n:'notes',t:'textarea'},{n:'suggested_message',l:'Suggested message',t:'textarea'}
  ];
  async function renderFollowups(){
    var c=$('#c');c.innerHTML='<div class="center-msg">Loading…</div>';
    var rows=((await sb.from('follow_ups').select('*').order('follow_up_date',{ascending:true})).data)||[];
    var tr=rows.map(function(f){var due=f.status==='Pending'&&f.follow_up_date&&f.follow_up_date<=today();return '<tr'+(due?' style="background:#fff7ed"':'')+'>'
      +'<td>'+esc(f.follow_up_date||'')+'</td><td>'+esc(f.business_name||f.client_name||'')+'</td><td>'+esc(f.follow_up_type||'')+'</td><td>'+statusBadge(f.status)+'</td>'
      +'<td><div class="linkbtns"><button class="btn" data-fedit="'+f.id+'">Open</button>'+(f.status==='Pending'?'<button class="btn btn--primary" data-fdone="'+f.id+'">Done</button>':'')+'</div></td></tr>';}).join('')
      ||'<tr><td colspan="5" class="muted">No follow-ups. They’re created when you mark a quote “Sent”.</td></tr>';
    c.innerHTML='<div class="toolbar"><span class="spacer"></span><button class="btn btn--primary" id="newFup">'+ic('chat',18)+' New follow-up</button></div>'
      +'<table><thead><tr><th>Date</th><th>Client</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>'+tr+'</tbody></table>';
    $('#newFup').addEventListener('click',function(){openFollowup({status:'Pending',follow_up_type:'First Follow-up',follow_up_date:addDays(3)});});
    $$('[data-fedit]',c).forEach(function(b){b.addEventListener('click',function(){openFollowup(rows.filter(function(x){return x.id===b.getAttribute('data-fedit');})[0]);});});
    $$('[data-fdone]',c).forEach(function(b){b.addEventListener('click',async function(){await sb.from('follow_ups').update({status:'Done'}).eq('id',b.getAttribute('data-fdone'));toast('Follow-up done ✓');renderFollowups();});});
  }
  function openFollowup(row){var m=modal(row.id?'Follow-up':'New follow-up',formHtml(fupFields,row),true);wireSave(m,fupFields,row,'follow_ups',function(){renderFollowups();});}

  /* ===================== PROJECTS ===================== */
  var projFields=[
    {n:'client_name',l:'Client name'},{n:'business_name'},{n:'project_address',l:'Address'},
    {n:'service_category',l:'Service category',t:'select',options:SERVICES},{n:'project_scope',l:'Scope',t:'textarea'},
    {n:'start_date',l:'Start date',t:'date'},{n:'estimated_completion_date',l:'Est. completion',t:'date'},{n:'assigned_team',l:'Assigned team'},
    {n:'status',t:'select',options:PROJECT_STATUS},{n:'materials_status',l:'Materials status',t:'select',options:['Not Started','Partial','Ordered','Ready']},
    {n:'notes',t:'textarea'}
  ];
  async function renderProjects(){
    var c=$('#c');c.innerHTML='<div class="center-msg">Loading…</div>';
    var rows=((await sb.from('projects').select('*').order('created_at',{ascending:false})).data)||[];
    var tr=rows.map(function(p){return '<tr><td><strong>'+esc(p.business_name||p.client_name||'')+'</strong><br><span class="muted">'+esc(p.service_category||'')+'</span></td>'
      +'<td>'+esc(p.start_date||'')+'</td><td>'+statusBadge(p.status)+'</td><td>'+statusBadge(p.materials_status)+'</td>'
      +'<td><div class="linkbtns"><button class="btn" data-pmat="'+p.id+'">Materials</button><button class="btn" data-pedit="'+p.id+'">Open</button></div></td></tr>';}).join('')
      ||'<tr><td colspan="5" class="muted">No projects. They’re created when you approve a quote.</td></tr>';
    c.innerHTML='<div class="toolbar"><span class="spacer"></span><button class="btn btn--primary" id="newProj">'+ic('wrench',18)+' New project</button></div>'
      +'<table><thead><tr><th>Project</th><th>Start</th><th>Status</th><th>Materials</th><th></th></tr></thead><tbody>'+tr+'</tbody></table>';
    $('#newProj').addEventListener('click',function(){openProject({status:'Not Started',materials_status:'Not Started'});});
    $$('[data-pedit]',c).forEach(function(b){b.addEventListener('click',function(){openProject(rows.filter(function(x){return x.id===b.getAttribute('data-pedit');})[0]);});});
    $$('[data-pmat]',c).forEach(function(b){b.addEventListener('click',function(){var p=rows.filter(function(x){return x.id===b.getAttribute('data-pmat');})[0];state.view='materials';state._matProject=p.id;renderApp();});});
  }
  function projectFromQuote(q){return {quote_id:q.id,lead_id:q.lead_id||null,client_name:q.client_name,business_name:q.business_name,project_address:q.project_address,service_category:q.service_category,project_scope:q.quote_title,status:'Not Started',materials_status:'Not Started'};}
  function openProject(row){var m=modal(row.id?'Project':'New project',formHtml(projFields,row),true);wireSave(m,projFields,row,'projects',function(){renderProjects();},function(s){logAct('project',s&&s.id,row.id?'Project updated':'Project created',(row.business_name||row.client_name||''));});}

  /* ===================== MATERIALS ===================== */
  var matFields=[
    {n:'item_name',l:'Item',req:true},{n:'quantity',l:'Qty',t:'number'},{n:'supplier'},
    {n:'status',t:'select',options:MATERIAL_STATUS},{n:'notes',t:'textarea'}
  ];
  async function renderMaterials(){
    var c=$('#c');c.innerHTML='<div class="center-msg">Loading…</div>';
    var projects=((await sb.from('projects').select('id,client_name,business_name').order('created_at',{ascending:false})).data)||[];
    var pmap={};projects.forEach(function(p){pmap[p.id]=p.business_name||p.client_name||'Project';});
    var qy=sb.from('project_materials').select('*').order('created_at',{ascending:false});
    if(state._matProject)qy=qy.eq('project_id',state._matProject);
    var rows=((await qy).data)||[];
    var projFilter='<select id="mProj"><option value="">All projects</option>'+projects.map(function(p){return '<option value="'+p.id+'" '+(state._matProject===p.id?'selected':'')+'>'+esc(pmap[p.id])+'</option>';}).join('')+'</select>';
    var tr=rows.map(function(mt){return '<tr><td>'+esc(mt.item_name||'')+'</td><td>'+(mt.quantity||'')+'</td><td>'+esc(pmap[mt.project_id]||'—')+'</td><td>'+esc(mt.supplier||'')+'</td><td>'+statusBadge(mt.status)+'</td>'
      +'<td><div class="linkbtns"><button class="btn" data-medit="'+mt.id+'">Open</button><button class="btn btn--danger" data-mdel="'+mt.id+'">Del</button></div></td></tr>';}).join('')
      ||'<tr><td colspan="6" class="muted">No materials yet.</td></tr>';
    c.innerHTML='<div class="toolbar">'+projFilter+'<span class="spacer"></span><button class="btn btn--primary" id="newMat">'+ic('clipboard',18)+' Add material</button></div>'
      +'<table><thead><tr><th>Item</th><th>Qty</th><th>Project</th><th>Supplier</th><th>Status</th><th></th></tr></thead><tbody>'+tr+'</tbody></table>';
    $('#mProj').addEventListener('change',function(){state._matProject=this.value||null;renderMaterials();});
    $('#newMat').addEventListener('click',function(){openMaterial({status:'Needed',quantity:1,project_id:state._matProject||''},projects);});
    $$('[data-medit]',c).forEach(function(b){b.addEventListener('click',function(){openMaterial(rows.filter(function(x){return x.id===b.getAttribute('data-medit');})[0],projects);});});
    $$('[data-mdel]',c).forEach(function(b){b.addEventListener('click',async function(){if(!confirm('Delete material?'))return;await sb.from('project_materials').delete().eq('id',b.getAttribute('data-mdel'));renderMaterials();});});
  }
  function openMaterial(row,projects){
    row=row||{};
    var psel='<div class="field"><label>Project</label><select id="of-project_id"><option value="">— None —</option>'+projects.map(function(p){return '<option value="'+p.id+'" '+(row.project_id===p.id?'selected':'')+'>'+esc(p.business_name||p.client_name||'Project')+'</option>';}).join('')+'</select></div>';
    var m=modal(row.id?'Material':'Add material',psel+formHtml(matFields,row),false);
    var form=$('#opf',m);m.querySelector('[data-cancel]').addEventListener('click',function(){m.close();});
    form.addEventListener('submit',async function(e){e.preventDefault();var st=$('#opfStatus',m);st.textContent='Saving…';
      var payload=readForm(matFields,m);payload.project_id=$('#of-project_id',m).value||null;
      var res=row.id?await sb.from('project_materials').update(payload).eq('id',row.id):await sb.from('project_materials').insert(payload);
      if(res.error){st.className='status status--err';st.textContent=res.error.message;}else{toast('Saved');m.close();renderMaterials();}});
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
    var row=(await sb.from('ops_settings').select('*').eq('id',1).maybeSingle()).data||{id:1};
    var tm=((await sb.from('team_members').select('*').order('created_at',{ascending:true})).data)||[];
    c.innerHTML='<div class="panel"><h3>Company & Routes</h3>'+formHtml(setFields,row)+'</div>'
      +'<div class="panel"><div class="list-head"><h3>Team Members</h3><button class="btn btn--primary" id="newTm">'+ic('check',16)+' Add</button></div>'
      +'<table><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th></th></tr></thead><tbody>'
      +(tm.map(function(t){return '<tr><td>'+esc(t.name)+'</td><td>'+esc(t.role||'')+'</td><td>'+esc(t.phone||'')+'</td><td class="row-actions"><button class="btn" data-tme="'+t.id+'">Edit</button><button class="btn btn--danger" data-tmd="'+t.id+'">Del</button></td></tr>';}).join('')||'<tr><td colspan="4" class="muted">No team members.</td></tr>')
      +'</tbody></table></div>';
    var scope=$('#c');var form=$('#opf',scope);$('[data-cancel]',scope).style.display='none';
    form.addEventListener('submit',async function(e){e.preventDefault();var st=$('#opfStatus');st.textContent='Saving…';var payload=readForm(setFields,scope);payload.id=1;var res=await sb.from('ops_settings').upsert(payload);if(res.error){st.className='status status--err';st.textContent=res.error.message;}else{st.className='status status--ok';st.textContent='Saved ✓';state._settings=payload;toast('Settings saved');}});
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
      var payload=readForm(fields,m);var res;
      if(row.id)res=await sb.from(table).update(payload).eq('id',row.id).select().maybeSingle();
      else res=await sb.from(table).insert(payload).select().maybeSingle();
      if(res.error){st.className='status status--err';st.textContent=res.error.message;toast(res.error.message,true);}
      else{st.className='status status--ok';st.textContent='Saved ✓';if(onSaved)onSaved(res.data);toast('Saved');m.close();after();}
    });
  }
})();
