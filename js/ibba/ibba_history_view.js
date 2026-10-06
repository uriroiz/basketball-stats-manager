(function(){
  'use strict';
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const source=url=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='ibasketball.co.il'?u.href:null;}catch(_){return null;}};
  class IBBAHistoryView {
    constructor(service){this.service=service;this.version=0;this.pendingRefs=new Set();this.reset(window.appConfig.seasonKey);}
    reset(key,refresh=false){this.version++;this.key=key;this.selected=null;this.query='';this.page=1;this.request=null;this.broadcastRefs=[];this.broadcastReady=false;this.message='';this.data={seasonKey:key,state:'idle',records:[],statuses:[]};if(refresh)window.IBBASeasons.seasons.filter(s=>s.key<key).forEach(s=>this.service.invalidateSeason(s.key));this.render();}
    mount(panel){this.panel=panel;if(!panel)return;this.render();return this.load();}
    load(refresh=false){
      if(this.request&&!refresh)return this.request;if(this.data.state==='ready'&&!refresh)return Promise.resolve();
      const version=++this.version;this.data={...this.data,state:'loading',...(refresh?{records:[],statuses:[]}: {})};this.render();
      const request=this.service.loadHistory(this.key,{refresh}).then(data=>{if(version===this.version){this.data=data;this.render();}}).catch(error=>{if(version===this.version){this.data={seasonKey:this.key,state:'error',records:[],statuses:[{label:'היסטוריה',state:'error',error:error.message}]};this.render();}}).finally(()=>{if(this.request===request)this.request=null;});this.request=request;return request;
    }
    setBroadcastSelection(refs,{ready=false}={}){this.broadcastRefs=[...new Set((refs||[]).map(r=>this.service.identity(r)).filter(Boolean))];this.broadcastReady=ready;this.render();}
    context({selectedRefs}={}){const refs=selectedRefs?.map(r=>this.service.identity(r));const records=refs?this.data.records.filter(r=>refs.includes(this.service.identity(r.playerRef))):this.selected?this.service.getPlayerHistory(this.selected,this.data.records):this.data.records;return {...this.data,records};}
    matchingPlayers(){let players=this.service.groupRecords(this.data.records);if(this.selected)return players.filter(p=>p.playerRef===this.service.identity(this.selected));if(this.query.trim()){const query=this.query.trim().toLowerCase();return players.filter(p=>`${p.name} ${p.teams.join(' ')}`.toLowerCase().includes(query));}return players.filter(p=>this.broadcastRefs.includes(p.playerRef));}
    visiblePlayers(){const players=this.matchingPlayers();this.page=Math.max(1,Math.min(this.page,Math.ceil(players.length/25)||1));return players.slice((this.page-1)*25,this.page*25);}
    async openPlayer(id){const loading=this.load(),version=this.version;await Promise.all([loading,this.service.resolvePlayer(id)]);if(version!==this.version)return;this.selected={playerId:id};this.query='';this.page=1;this.render();}
    details(player){return `<details><summary class="cursor-pointer py-2 text-blue-700">פירוט עונות (${player.records.length})</summary><div class="overflow-x-auto" tabindex="0" aria-label="נתוני עונות של ${escape(player.name)}"><table class="w-full whitespace-nowrap text-sm"><thead><tr>${['עונה','קבוצה בעונה','משחקים','דקות','נקודות','ריבאונדים','אסיסטים'].map(h=>`<th scope="col" class="p-3 text-right border-b">${h}</th>`).join('')}</tr></thead><tbody>${player.records.map(r=>`<tr>${[r.seasonLabel,r.team,r.games,r.minutes,r.points,r.rebounds,r.assists].map(v=>`<td class="p-3 border-b">${escape(v??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><details class="my-2"><summary class="cursor-pointer">מקורות ופרופיל</summary>${[...new Set(player.records.flatMap(r=>[r.playerUrl,r.sourceUrl]).filter(Boolean))].map(url=>source(url)?`<a href="${escape(source(url))}" target="_blank" rel="noopener" class="block underline py-2">${url.includes('/player/')?'פרופיל השחקן':'נתוני העונה'}</a>`:'').join('')}</details></details>`;}
    render(){
      if(!this.panel)return;
      const active=typeof document!=='undefined'&&this.panel.contains?.(document.activeElement)?document.activeElement:null;
      const focusedRef=active?.dataset?.historyRef;
      const focusedClass=['history-search','history-prev','history-next','history-clear','history-retry'].find(name=>String(active?.className||'').split(' ').includes(name));
      const caret=active?.selectionStart;
      const players=this.visiblePlayers(),total=this.matchingPlayers().length,pages=Math.ceil(total/25)||1;
      const loading=['loading','idle'].includes(this.data.state),prep=this.panel.id==='playerHistoryPrep'&&window.IBBASeasons.canPrepareSeason(this.key);
      this.panel.innerHTML=`<div class="card p-4 my-4 min-w-0" dir="rtl"><h3 class="font-bold text-lg">היסטוריית שחקנים בליגה</h3><p class="text-sm text-gray-600 my-2">עונות וקבוצות מהעבר. בחרו שחקנים כדי להוסיף סיפורים אישיים לדוח.</p><div class="flex flex-wrap gap-3 items-center my-3"><label class="min-w-0">חיפוש שחקן או קבוצה <input class="history-search border rounded p-2 max-w-full" value="${escape(this.query)}" type="search"></label><button type="button" class="history-clear border rounded p-2">${this.selected?'חזרה לחיפוש':'הצג שחקנים שנבחרו'}</button><button type="button" class="history-retry border rounded p-2">רענן היסטוריה</button></div><div role="status" aria-live="polite">${escape(this.message)||(loading?'טוען היסטוריה…':`${total} שחקנים${total?` · עמוד ${this.page} מתוך ${pages}`:''}`)}</div>${(this.data.statuses||[]).filter(s=>s.state==='error').map(s=>`<p class="text-amber-800 my-2">${escape(s.label)}: ${escape(s.error)}. נסו רענון היסטוריה.</p>`).join('')}${prep&&!this.broadcastReady?'<p class="text-sm my-2">אפשר להוסיף שחקנים לאחר בחירת משחק וטעינת הדוח.</p>':''}${!loading&&!players.length?`<p class="py-3">${!this.query&&!this.selected?'חפשו שחקן או קבוצה מהעבר. שחקנים שנבחרו יופיעו כאן.':'לא נמצאה היסטוריה מאומתת בעונות שנבדקו'}</p>`:''}${players.length?`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr>${['שחקן','עונות','קבוצות בעבר','פירוט','פעולה'].map(h=>`<th scope="col" class="p-3 text-right border-b">${h}</th>`).join('')}</tr></thead><tbody>${players.map(p=>`<tr><td class="p-3 border-b align-top font-medium">${escape(p.name)}</td><td class="p-3 border-b align-top whitespace-nowrap">${escape(p.seasons.join(', '))}</td><td class="p-3 border-b align-top">${escape(p.teams.join(', '))}</td><td class="p-3 border-b align-top">${this.details(p)}</td><td class="p-3 border-b align-top">${prep?`<button type="button" data-history-ref="${escape(p.playerRef)}" class="border rounded p-2 whitespace-nowrap" ${!this.broadcastReady?'disabled aria-disabled="true"':''}>${this.broadcastRefs.includes(p.playerRef)?'הסר מהדוח':'הוסף לדוח'}</button>`:'—'}</td></tr>`).join('')}</tbody></table></div>`:''}${pages>1?`<nav aria-label="עמודי היסטוריית שחקנים" class="flex gap-3 my-3"><button type="button" class="history-prev border rounded p-2" ${this.page===1?'disabled':''}>הקודם</button><span class="py-2">${this.page} / ${pages}</span><button type="button" class="history-next border rounded p-2" ${this.page===pages?'disabled':''}>הבא</button></nav>`:''}</div>`;
      this.panel.querySelector('.history-search')?.addEventListener('input',event=>{this.query=event.target.value;this.selected=null;this.page=1;this.message='';const caret=event.target.selectionStart;this.render();const input=this.panel.querySelector('.history-search');input?.focus();if(caret!=null)try{input.setSelectionRange(caret,caret);}catch(_){};});
      this.panel.querySelector('.history-clear')?.addEventListener('click',()=>{this.selected=null;this.query='';this.page=1;this.message='';this.render();this.panel.querySelector('.history-search')?.focus();});
      this.panel.querySelector('.history-retry')?.addEventListener('click',()=>this.load(true));
      for(const [selector,step]of [['.history-prev',-1],['.history-next',1]])this.panel.querySelector(selector)?.addEventListener('click',()=>{this.page+=step;this.render();this.panel.querySelector(step<0?'.history-prev':'.history-next')?.focus();});
      this.panel.querySelectorAll('[data-history-ref]').forEach(button=>{
        const ref=button.dataset.historyRef;
        if(this.pendingRefs.has(ref)){button.textContent='בודק פרופיל…';button.disabled=true;button.setAttribute('aria-busy','true');}
        button.addEventListener('click',async()=>{if(!this.broadcastReady||this.pendingRefs.has(ref))return;const version=this.version;
          try{if(this.broadcastRefs.includes(ref))window.removePlayerFromBroadcast?.(ref);
            else{this.pendingRefs.add(ref);this.message='בודק פרופיל שחקן…';this.render();await window.addPlayerToBroadcast?.(ref);}
          }catch(error){if(version===this.version)this.message=`לא ניתן להוסיף את השחקן: ${error.message}`;}
          finally{this.pendingRefs.delete(ref);if(version===this.version)this.render();}
        });
      });
      if(active){const target=focusedRef?Array.from(this.panel.querySelectorAll('[data-history-ref]')).find(button=>button.dataset.historyRef===focusedRef):focusedClass?this.panel.querySelector('.'+focusedClass):null;
        const focus=target&&!target.disabled?target:this.panel.querySelector('.history-search');focus?.focus();if(focusedClass==='history-search'&&caret!=null)try{focus.setSelectionRange(caret,caret);}catch(_){}
      }
    }
  }
  window.IBBAHistoryView=IBBAHistoryView;window.historyView=new IBBAHistoryView(new window.IBBAPlayerHistory());
})();
