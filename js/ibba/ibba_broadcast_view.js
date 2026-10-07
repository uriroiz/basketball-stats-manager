(function () {
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=key=>window.IBBASeasons.getSeason(key)?.label||key;
  const metrics={points:'נקודות למשחק',opponentPoints:'ספיגה למשחק',margin:'הפרש ממוצע',threePointsAttempted:'ניסיונות לשלוש למשחק',threePointPercentage:'קליעה לשלוש',fgPercentage:'קליעה מהשדה',ftPercentage:'קליעה מהעונשין',offensiveRebounds:'ריבאונד התקפה',defensiveRebounds:'ריבאונד הגנה',totalRebounds:'ריבאונדים',assists:'אסיסטים',turnovers:'איבודים',steals:'חטיפות',blocks:'חסימות',assistTurnoverRatio:'יחס אסיסטים לאיבודים',pointsFastBreak:'נקודות במתפרצת',pointsFromTurnovers:'נקודות מאיבודי היריבה',pointsInPaint:'נקודות בצבע',pointsSecondChance:'הזדמנות שנייה',pointsBench:'נקודות מהספסל',quarterMargin:'הפרש ברבע',minutesPlayed:'דקות',contributionPercentage:'חלק מנקודות הקבוצה'};
  class IBBABroadcastView {
    static text(value) {
      // Isolate each numeric run, including a preceding minus, from Hebrew bidi.
      return String(value??'').split(/(-?\d+(?:[.,/:–-]\d+)*%?)/g).map((part,index)=>index%2?`<bdi dir="ltr">${escape(part)}</bdi>`:escape(part)).join('');
    }
    static count(n) {return n==null?'':`${n} ${n===1?'משחק':'משחקים'}`;}
    static sourceNotices(statuses) {
      const failed=new Set((statuses||[]).filter(s=>['error','partial'].includes(s.state)).map(s=>s.seasonKey));
      return [...failed].map(key=>`${label(key)}: חלק מהנתונים לא נטענו. אפשר לרענן את הדוח כדי לנסות שוב.`);
    }
    static renderCard(story) {
      const n=story.sampleSize;
      const hasCount=n!=null&&(story.text?.includes(`(${n} `)||story.text?.includes(`${n} משחק`)||story.facts?.total!=null||story.type==='LAST_HISTORICAL_MEETING');
      return `<article class="broadcast-highlight"><p>${this.text(story.text)}</p>${n!=null&&!hasCount?`<p class="broadcast-count">${this.text(this.count(n))}</p>`:''}</article>`;
    }
    static window(story) {
      const w=story.windows?.[0],f=story.facts||{};
      if(w?.mode==='rounds')return w.fromRound===w.toRound?`מחזור ${w.fromRound}`:`מחזורים ${w.fromRound}–${w.toRound}`;
      if(f.round)return `מחזור ${f.round}`;
      if(story.roundWindow)return `מחזורים ${story.roundWindow[0]}–${story.roundWindow[1]}`;
      if(w?.count)return `${w.count} משחקים ${w.offset?'קודמים':'אחרונים'}`;
      return 'סיכום עונתי';
    }
    static groups(stories) {
      const groups=new Map();
      for(const [storyIndex,story] of stories.entries()) {
        const f=story.facts||{},numeric=f.metric&&f.value!=null&&f.referenceValue==null;
        const entity=story.playerName||story.teamName||'רקע למשחק';
        const windowLabel=this.window(story),venue=f.venue?f.venue==='home'?'בבית':'בחוץ':'';
        const scopeLabel=window.IBBAAnalysisScope?.label(story.analysisScope);
        const title=[entity,story.historicalTeam,scopeLabel||windowLabel,venue,story.referenceName?`מול ${story.referenceName}`:''].filter(Boolean).join(' · ');
        const key=JSON.stringify([numeric,story.playerRef||(story.teamIds?.length?story.teamIds:entity),story.historicalTeam,windowLabel,venue,story.referenceName,story.scope==='comparison'?'comparison':'',numeric?'':story.type,
          window.IBBAAnalysisScope?.groupKey(story.analysisScope),story.analysisScope?.phase==='unknown'?storyIndex:'']);
        if(!groups.has(key))groups.set(key,{title,numeric,rows:[],columns:[]});
        const group=groups.get(key),column=(story.seasonKeys||[]).join('|')||'current';
        if(!group.columns.includes(column))group.columns.push(column);
        if(numeric) {
          const rowKey=`${f.metric}:${f.quarter||''}`;
          let row=group.rows.find(r=>r.key===rowKey);
          if(!row){row={key:rowKey,label:`${metrics[f.metric]||f.metric}${f.quarter?` ${f.quarter}`:''}`,cells:{}};group.rows.push(row);}
          // A cell can contain different valid samples; never silently overwrite a fact.
          (row.cells[column]||= []).push(story);
          if(f.wins!=null&&f.total!=null) {
            let record=group.rows.find(r=>r.key==='record');
            if(!record){record={key:'record',label:'ניצחונות מתוך המפגשים',cells:{}};group.rows.push(record);}
            const cell=record.cells[column]||= [];
            if(!cell.some(s=>s.facts.wins===f.wins&&s.facts.total===f.total))cell.push(story);
          }
        }else group.rows.push({story,column});
      }
      for(const group of groups.values())group.columns.sort();
      return [...groups.values()];
    }
    static wrapTable(title,header,body) {
      return `<details class="broadcast-comparison" data-broadcast-table="${escape(encodeURIComponent(title))}"><summary>${this.text(title)}</summary><div class="broadcast-table-wrap" role="region" aria-label="${escape(title)}" tabindex="0"><table class="broadcast-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div></details>`;
    }
    static familySummary(stories,context) {
      const sorted=[...stories].filter(s=>s.text).sort((a,b)=>String(b.seasonKeys?.at(-1)||'').localeCompare(String(a.seasonKeys?.at(-1)||'')));
      const result=[];
      for(const team of context?.match?.teams||[]){const s=sorted.find(s=>s.teamIds?.some(id=>String(id)===String(team.teamId)));if(s&&!result.includes(s))result.push(s);}
      return result.length?result.slice(0,2):sorted.slice(0,1);
    }
    static actions(story) {
      if(!window.IBBABroadcastWorkspaceView || !story.storyKey)return '';
      const key=escape(encodeURIComponent(story.storyKey));
      return `<button type="button" class="workspace-table-add" data-compact="true" data-workspace-action="add" data-story-key="${key}" aria-label="${escape(`הוסף לדף שלי: ${story.text}`)}" title="הוסף לדף שלי">+</button>`;
    }
    static renderGroups(stories) {
      return this.groups(stories).map(group=>{
        if(!group.numeric)return this.wrapTable(group.title,'<th scope="col">עונה</th><th scope="col">נקודה לשידור</th>',group.rows.map(({story,column})=>{
          const season=column.split('|').map(label).join(', ');
          const text=story.type==='SAME_STAGE_RECORD'?`${story.facts.wins} ${story.facts.wins===1?'ניצחון':'ניצחונות'} ב־${story.sampleSize} משחקים.`:String(story.text||'').replace(/^בעונ(?:ת|ות) [\d/, ו־-]+, /,'');
          return `<tr><th scope="row">${this.text(season)}</th><td>${this.text(text)}${this.actions(story)}</td></tr>`;
        }).join(''));
        const commonCounts=Object.fromEntries(group.columns.map(column=>{const counts=[...new Set(group.rows.flatMap(row=>(row.cells[column]||[]).map(s=>s.sampleSize)))];return [column,counts.length===1?counts[0]:null];}));
        const header=`<th scope="col">מדד</th>${group.columns.map(column=>`<th scope="col">${this.text(column.split('|').map(label).join(', '))}${commonCounts[column]!=null?`<span class="broadcast-count">${this.text(this.count(commonCounts[column]))}</span>`:''}</th>`).join('')}`;
        const body=group.rows.map(row=>`<tr><th scope="row">${escape(row.key==='margin:'&&Object.values(row.cells).flat().every(s=>s.sampleSize===1)?'הפרש':row.label)}</th>${group.columns.map(column=>`<td>${(row.cells[column]||[]).map(story=>{
          if(row.key==='record')return `<div>${this.text(`${story.facts.wins} מתוך ${story.facts.total}`)}</div>`;
          const value=window.IBBABroadcastCopy.formatNumber(story.facts.value,{percent:story.facts.metric.includes('Percentage')});
          return `<div>${this.text(value)}${story.sampleSize!=null&&commonCounts[column]==null?`<span class="broadcast-count">${this.text(this.count(story.sampleSize))}</span>`:''}${this.actions(story)}</div>`;
        }).join('')||'—'}</td>`).join('')}</tr>`).join('');
        return this.wrapTable(group.title,header,body);
      }).join('');
    }
    static meetings(context) {
      const teams=context?.match?.teams||[];
      if(teams.length!==2)return [];
      const games=[...(context.priorSeasons||[]).flatMap(s=>s.resultGames||[]),...(context.currentResultGames||[])];
      return [...new Map(games.filter(g=>g.hasResult&&teams.every(t=>g.teams?.some(other=>String(other.teamId)===String(t.teamId)))).map(g=>[`${g.seasonKey}:${g.gameId}`,g])).values()].sort((a,b)=>+new Date(b.date)-+new Date(a.date));
    }
    static meetingTable(context) {
      const games=this.meetings(context);
      if(!games.length)return '<p class="py-3">לא נמצאו מפגשים קודמים בין הקבוצות בעונות הזמינות.</p>';
      const header=['עונה','תאריך','בית','תוצאה','חוץ','מחזור'].map(v=>`<th scope="col">${v}</th>`).join('');
      return this.wrapTable('המפגשים הקודמים',header,games.map(g=>`<tr><th scope="row">${this.text(label(g.seasonKey))}</th><td>${this.text(new Date(g.date).toLocaleDateString('he-IL'))}</td><td>${escape(g.teams[0].name)}</td><td><bdi dir="ltr">${g.teams[0].score}–${g.teams[1].score}</bdi></td><td>${escape(g.teams[1].name)}</td><td>${g.roundVerified&&g.competitionPhase==='regular'?this.text(g.roundNumber):'—'}</td></tr>`).join(''));
    }
    static roundTables(context) {
      if(!context?.match?.roundVerified||context.match.competitionPhase!=='regular')return '';
      return (context.match.teams||[]).map(team=>{
        const games=(context.priorSeasons||[]).flatMap(s=>s.sameRoundGames||[]).filter(g=>g.teams.some(t=>String(t.teamId)===String(team.teamId))).sort((a,b)=>a.seasonKey.localeCompare(b.seasonKey));
        if(!games.length)return '';
        const header=['עונה','יריבה','מגרש','נקודות','ספיגה','הפרש'].map(v=>`<th scope="col">${v}</th>`).join('');
        return this.wrapTable(`${team.name} · מחזור ${context.match.roundNumber} בעונות הקודמות`,header,games.map(g=>{
          const i=g.teams.findIndex(t=>String(t.teamId)===String(team.teamId)),own=g.teams[i],rival=g.teams[1-i];
          return `<tr><th scope="row">${this.text(label(g.seasonKey))}</th><td>${escape(rival.name)}</td><td>${i===0?'בית':'חוץ'}</td><td>${this.text(own.score)}</td><td>${this.text(rival.score)}</td><td>${this.text(own.score-rival.score)}</td></tr>`;
        }).join(''));
      }).join('');
    }
  }
  window.IBBABroadcastView=IBBABroadcastView;
})();
