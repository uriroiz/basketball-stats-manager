(function () {
  'use strict';
  const number=value=>{const raw=String(value??'').trim().replace(/,/g,'');return /^-?\d+(\.\d+)?$/.test(raw)?Number(raw):null;};
  class IBBATeamSummaries {
    constructor(source) {this.source=source;this.cache=new Map();this.pending=new Map();}
    static profile(href) {
      try {const url=new URL(href,'https://ibasketball.co.il');return url.protocol==='https:'&&url.hostname==='ibasketball.co.il'&&url.pathname.startsWith('/team/')?`https://ibasketball.co.il${url.pathname.toLowerCase().replace(/\/$/,'')}/`:null;}catch(_){return null;}
    }
    parseOfficialSummaries(doc,season) {
      const heading=Array.from(doc.querySelectorAll('.sp-table-caption')).find(h=>h.textContent.trim()==='סטטיסטיקה קבוצתית - רגילה');
      const table=heading?.nextElementSibling?.querySelector('table');
      if(!table)throw new Error('סיכום קבוצתי רשמי של העונה הסדירה אינו זמין');
      if(table.classList.contains('DTFC_Cloned')||table.closest('.DTFC_Cloned'))return [];
      if(!table.querySelector('th.data-g')||!table.querySelector('th.data-ptspg'))throw new Error('מבנה סיכום קבוצתי רשמי אינו מזוהה');
      const records=[],seen=new Set();
      for(const row of table.querySelectorAll('tbody tr')) {
        const cell=selector=>row.querySelector(selector)?.textContent;
        const link=row.querySelector('.data-name')?.querySelector('a')?.getAttribute('href');
        const teamRef=IBBATeamSummaries.profile(link);if(!teamRef||seen.has(teamRef))continue;seen.add(teamRef);
        records.push({seasonKey:season.key,teamRef,name:String(cell('.data-name')||'').trim(),games:number(cell('.data-g')),
          metrics:{points:number(cell('.data-ptspg')),rebounds:number(cell('.data-rebpg')),assists:number(cell('.data-astpg'))},sourceUrl:season.playersPageUrl});
      }
      return records;
    }
    load(seasonKey,{refresh=false}={}) {
      if(refresh){this.cache.delete(seasonKey);this.pending.delete(seasonKey);}
      if(this.cache.has(seasonKey))return Promise.resolve(this.cache.get(seasonKey));
      if(this.pending.has(seasonKey))return this.pending.get(seasonKey);
      const season=window.IBBASeasons.getSeason(seasonKey);
      const request=this.source.fetchText(season.playersPageUrl).then(html=>{
        const records=this.parseOfficialSummaries(new DOMParser().parseFromString(html,'text/html'),season);
        const result={seasonKey,state:'ready',records,sourceUrl:season.playersPageUrl};
        if(this.pending.get(seasonKey)===request)this.cache.set(seasonKey,result);return result;
      }).catch(error=>({seasonKey,state:'error',error:error.message,records:[]})).finally(()=>{if(this.pending.get(seasonKey)===request)this.pending.delete(seasonKey);});
      this.pending.set(seasonKey,request);return request;
    }
  }
  window.IBBATeamSummaries=IBBATeamSummaries;
})();
