(function () {
  'use strict';
  const text = value => String(value || '').trim();
  const number = value => {
    const raw = text(value).replace(/,/g,'');
    if (!raw || !/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
    return Number(raw);
  };
  function playerRef(input) {
    if (input?.playerId != null || input?.id != null) return `post:${input.playerId ?? input.id}`;
    const href = typeof input === 'string' ? input : input?.link || input?.playerRef;
    if (!href) return null;
    if (/^(post:|profile:)/.test(href)) return href;
    try {
      const url = new URL(href,'https://ibasketball.co.il');
      if (url.hostname !== 'ibasketball.co.il') return null;
      const id = url.searchParams.get('p');
      if (/^\d+$/.test(id || '')) return `post:${id}`;
      if (url.pathname.startsWith('/player/')) return `profile:${url.pathname.replace(/\/$/,'').toLowerCase()}`;
    } catch (_) {}
    return null;
  }
  class IBBAPlayerHistory {
    constructor() { this.cache=new Map();this.pending=new Map();this.aliases=new Map(); }
    registerPlayer(player) {
      const ref=playerRef(player.link);
      if (player.id != null && ref) this.aliases.set(`post:${player.id}`,ref);
    }
    identity(ref) { const key=playerRef(ref); return this.aliases.get(key) || key; }
    getPlayerHistory(ref,records) {
      const key=this.identity(ref);
      return key ? records.filter(r=>this.identity(r.playerRef)===key).sort((a,b)=>a.seasonKey.localeCompare(b.seasonKey)) : [];
    }
    parseOfficialSummaries(doc,season) {
      const records=[];const seen=new Set();let recognized=false;
      for (const table of doc.querySelectorAll('table')) {
        if (table.classList.contains('DTFC_Cloned')) continue;
        const headers=Array.from(table.querySelectorAll('thead th'),h=>text(h.textContent).replace(/[׳’']/g,"'"));
        const column=label=>headers.indexOf(label);
        if (column('שחקן')<0 || column('משחקים')<0 || column("נק'")<0) continue;
        recognized=true;
        for (const row of Array.from(table.tBodies[0]?.rows || [])) {
          const cell=label=>row.cells[column(label)];
          const href=cell('שחקן')?.querySelector('a')?.getAttribute('href');
          const ref=playerRef(href);
          if (!ref) continue;
          const team=text(cell('קבוצה')?.textContent);
          const dedupe=`${ref}|${team}`;
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);
          records.push({seasonKey:season.key,seasonLabel:season.label,playerRef:ref,
            name:text(cell('שחקן')?.textContent),team,
            games:number(cell('משחקים')?.textContent),minutes:number(cell('דקות')?.textContent),
            points:number(cell("נק'")?.textContent),rebounds:number(cell('ריב')?.textContent),assists:number(cell("אס'")?.textContent),
            sourceUrl:season.playersPageUrl,playerUrl:new URL(href,season.playersPageUrl).href});
        }
      }
      if (!recognized) throw new Error('טבלת הסיכומים הרשמית אינה זמינה או שמבנה המקור השתנה');
      return records;
    }
    async fetchText(url) {
      const request=async target=>{
        const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
        try { const response=await fetch(target,{signal:controller.signal});
          if(!response.ok)throw new Error(`HTTP ${response.status}`);
          return await response.text();
        } finally {clearTimeout(timer);}
      };
      try {return await request(url);} catch(_) {
        return request(`${window.appConfig?.ibbaProxyUrl || '/api/ibba'}?url=${encodeURIComponent(url)}`);
      }
    }
    invalidateSeason(key) {this.cache.delete(key);this.pending.delete(key);}
    loadSummary(season,refresh) {
      if(refresh)this.invalidateSeason(season.key);
      if(this.cache.has(season.key))return Promise.resolve(this.cache.get(season.key));
      if(this.pending.has(season.key))return this.pending.get(season.key);
      const request=this.fetchText(season.playersPageUrl).then(html=>{
        const records=this.parseOfficialSummaries(new DOMParser().parseFromString(html,'text/html'),season);
        if(this.pending.get(season.key)===request)this.cache.set(season.key,records);
        return records;
      }).finally(()=>{if(this.pending.get(season.key)===request)this.pending.delete(season.key);});
      this.pending.set(season.key,request);return request;
    }
    async loadHistory(selectedSeasonKey,{refresh=false}={}) {
      const prior=window.IBBASeasons.seasons.filter(s=>s.key<selectedSeasonKey);
      const statuses=await Promise.all(prior.map(async season=>{
        try{return {seasonKey:season.key,label:season.label,state:'ready',records:await this.loadSummary(season,refresh)};}
        catch(error){return {seasonKey:season.key,label:season.label,state:'error',error:error.message,records:[]};}
      }));
      return {seasonKey:selectedSeasonKey,state:statuses.some(s=>s.state==='error')?'partial':'ready',
        statuses,records:statuses.flatMap(s=>s.records)};
    }
    async resolvePlayer(id) {
      if(this.aliases.has(`post:${id}`))return;
      try {const adapter=new window.IBBAAdapter();
        const player=await adapter.fetchJsonWithProxyFallback(`https://ibasketball.co.il/wp-json/sportspress/v2/players/${encodeURIComponent(id)}`);
        if(String(player.id)===String(id))this.registerPlayer(player);
      } catch(_) { /* An unresolved identity must never fall back to a name. */ }
    }
    async resolveReference(ref) {
      const key=this.identity(ref);if(!key)return;
      if(key.startsWith('post:'))return this.resolvePlayer(key.slice(5));
      const slug=key.slice('profile:/player/'.length);
      try {
        const adapter=new window.IBBAAdapter();
        const players=await adapter.fetchJsonWithProxyFallback(`https://ibasketball.co.il/wp-json/sportspress/v2/players?slug=${encodeURIComponent(slug)}`);
        for(const player of Array.isArray(players)?players:[])if(playerRef(player.link)===key)this.registerPlayer(player);
      }catch(_){ /* A missing official bridge leaves game appearances unverified. */ }
    }
    static insights(records) {
      const insights=records.map(r=>`${r.name}: בעונת ${r.seasonLabel} שיחק/ה ב${r.team || 'קבוצה שלא צוינה'}; ${r.games ?? '—'} משחקים${r.points == null ? '' : `, ${r.points} נקודות בממוצע`}.`);
      // Called for one verified player. Multiple team splits must not be compared as season totals.
      const seasons=Array.from(new Set(records.map(r=>r.seasonKey))).sort();
      if(seasons.length===2) {
        const older=records.filter(r=>r.seasonKey===seasons[0]);const newer=records.filter(r=>r.seasonKey===seasons[1]);
        if(older.length===1&&newer.length===1&&older[0].points!=null&&newer[0].points!=null) {
          const a=older[0],b=newer[0];
          insights.push(`${b.points} נקודות בממוצע בעונת ${b.seasonLabel} (${b.games??'—'} משחקים), לעומת ${a.points} בעונת ${a.seasonLabel} (${a.games??'—'} משחקים).`);
        }
      }
      return insights;
    }
    static exportRows(context) {
      const rows=[['=== היסטוריית שחקנים בליגה ===']];
      if(!context || context.state==='loading' || context.state==='idle')return rows.concat([['ההיסטוריה טרם נטענה']]);
      for(const status of context.statuses || [])if(status.state==='error')rows.push([`${status.label}: נתונים אינם זמינים`,status.error]);
      rows.push(['עונה','שחקן','קבוצה בעונה','משחקים','דקות','נקודות','ריבאונדים','אסיסטים','מקור']);
      for(const r of context.records)rows.push([r.seasonLabel,r.name,r.team,r.games??'—',r.minutes??'—',r.points??'—',r.rebounds??'—',r.assists??'—',r.sourceUrl]);
      if(!context.records.length)rows.push(['לא נמצאה היסטוריה מאומתת בעונות שנבדקו']);
      return rows;
    }
  }
  IBBAPlayerHistory.playerRef=playerRef;
  window.IBBAPlayerHistory=IBBAPlayerHistory;
})();

