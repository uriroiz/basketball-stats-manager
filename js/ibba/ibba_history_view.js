(function () {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  class IBBAHistoryView {
    constructor(service) {this.service=service;this.version=0;this.reset(window.appConfig.seasonKey);}
    reset(key,refresh=false) {
      this.version++;this.key=key;this.selected=null;this.query='';this.request=null;
      this.data={seasonKey:key,state:'idle',records:[],statuses:[]};
      if(refresh)window.IBBASeasons.seasons.filter(s=>s.key<key).forEach(s=>this.service.invalidateSeason(s.key));
      this.render();
    }
    mount(panel) {this.panel=panel;if(!panel)return;this.render();return this.load();}
    load(refresh=false) {
      if(this.request&&!refresh)return this.request;
      if(this.data.state==='ready'&&!refresh)return Promise.resolve();
      const version=++this.version;
      this.data={...this.data,state:'loading'};this.render();
      const request=this.service.loadHistory(this.key,{refresh}).then(data=>{
        if(version!==this.version)return;
        this.data=data;this.render();
      }).finally(()=>{if(this.request===request)this.request=null;});
      this.request=request;return request;
    }
    context() {
      const records=this.selected ? this.service.getPlayerHistory(this.selected,this.data.records) : this.data.records;
      return {...this.data,records:records.filter(r=>`${r.name} ${r.team}`.toLowerCase().includes(this.query.toLowerCase()))};
    }
    async openPlayer(id) {
      const loading=this.load();const version=this.version;
      await Promise.all([loading,this.service.resolvePlayer(id)]);
      if(version!==this.version)return;
      this.selected={playerId:id};this.query='';this.render();
    }
    render() {
      if(!this.panel)return;
      const loading=this.data.state==='loading'||this.data.state==='idle';
      const records=this.context().records.filter(r=>`${r.name} ${r.team}`.toLowerCase().includes(this.query.toLowerCase()));
      const options=new Map();
      for(const r of this.data.records)options.set(this.service.identity(r.playerRef),r.name);
      const selected=this.service.identity(this.selected);
      this.panel.innerHTML=`<div class="card p-4 my-4" dir="rtl">
        <h3 class="font-bold text-lg">היסטוריית שחקנים בליגה</h3>
        <p class="text-sm text-gray-600 my-2">נתונים רשמיים מעונות קודמות. הקבוצות המוצגות הן הקבוצות באותה עונה; מידע זה אינו מאשר השתייכות לסגל הנוכחי.</p>
        <div class="flex flex-wrap gap-3 items-center my-3">
          <label>חיפוש שחקן או קבוצה <input class="history-search border rounded p-2" value="${escape(this.query)}" type="search"></label>
          <label>שחקן <select class="history-player border rounded p-2"><option value="">כל השחקנים ההיסטוריים</option>${Array.from(options,([ref,name])=>`<option value="${escape(ref)}" ${ref===selected?'selected':''}>${escape(name)}</option>`).join('')}</select></label>
          <button type="button" class="history-retry border rounded p-2">רענן היסטוריה</button>
        </div>
        <div role="status" aria-live="polite">${loading?'טוען היסטוריה…':`${records.length} רשומות עונתיות`}</div>
        ${this.data.statuses.filter(s=>s.state==='error').map(s=>`<p class="text-amber-800 my-2">${escape(s.label)}: ${escape(s.error)}. ניתן לנסות רענון היסטוריה.</p>`).join('')}
        ${!loading&&!records.length?'<p class="py-3">לא נמצאה היסטוריה מאומתת בעונות שנבדקו</p>':''}
        <div class="overflow-x-auto"><table class="w-full text-sm whitespace-nowrap"><caption class="text-right py-2">עונות קודמות לפי איגוד הכדורסל · ${escape(window.IBBASeasons.getSeason(this.key).label)} נבחרה</caption>
        <thead><tr>${['שחקן','עונה','קבוצה בעונה','משחקים','דקות','נקודות','ריבאונדים','אסיסטים','מקור'].map(h=>`<th scope="col" class="p-3 text-right border-b">${h}</th>`).join('')}</tr></thead>
        <tbody>${records.map(r=>`<tr>${[r.name,r.seasonLabel,r.team,r.games,r.minutes,r.points,r.rebounds,r.assists].map(v=>`<td class="p-3 border-b">${escape(v??'—')}</td>`).join('')}<td class="p-3 border-b"><a class="text-blue-700 underline" href="${escape(r.sourceUrl)}" target="_blank" rel="noopener">איגוד הכדורסל</a></td></tr>`).join('')}</tbody></table></div>
        ${this.selected&&!loading?`<div class="mt-4"><h4 class="font-semibold">הקשר היסטורי לשידור</h4>${window.IBBAPlayerHistory.insights(records).map(t=>`<p class="my-2">${escape(t)}</p>`).join('')}</div>`:''}
      </div>`;
      this.panel.querySelector('.history-search').addEventListener('input',event=>{
        this.query=event.target.value;
        // Retain keyboard focus and caret when replacing the filtered table.
        const caret=event.target.selectionStart;this.render();const input=this.panel.querySelector('.history-search');input.focus();
        if(caret!=null)try{input.setSelectionRange(caret,caret);}catch(_){}
      });
      this.panel.querySelector('.history-player').addEventListener('change',event=>{this.selected=event.target.value||null;this.render();});
      this.panel.querySelector('.history-retry').addEventListener('click',()=>this.load(true));
    }
  }
  window.IBBAHistoryView=IBBAHistoryView;
  window.historyView=new IBBAHistoryView(new window.IBBAPlayerHistory());
})();
