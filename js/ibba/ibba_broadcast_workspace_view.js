(function () {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = s => escape(encodeURIComponent(s.storyKey || ''));
  const text = value => window.IBBABroadcastView.text(value);
  const button = (action,label,s,disabled=false) => `<button type="button" data-workspace-action="${action}" data-story-key="${s?key(s):''}"${disabled?' disabled':''}>${label}</button>`;
  class IBBABroadcastWorkspaceView {
    static details(s) {
      const groups=(Array.isArray(s.detailGroups)?s.detailGroups:[]).filter(g=>Array.isArray(g?.games) && g.games.some(r=>Number.isFinite(r?.points)&&Number.isFinite(r?.opponentPoints)));
      if(!groups.length)return '';
      const content=groups.map(group=>{
        const games=group.games.filter(r=>Number.isFinite(r?.points)&&Number.isFinite(r?.opponentPoints));
        const seasons=[...new Set(games.map(g=>g.seasonKey))].sort(),multiSeason=seasons.length>1;
        const w=group.window || {},scope=window.IBBAAnalysisScope?.label({phase:w.phase==='any'?'all':w.phase,mode:w.mode,windows:[w]});
        const title=[group.teamName,seasons.map(k=>window.IBBASeasons.getSeason(k)?.label||k).join(' ו־'),w.venue==='away'?'משחקי חוץ':w.venue==='home'?'משחקי בית':'',w.phase==='regular' || ['rounds','recent'].includes(w.mode)&&w.count!=null?scope:''].filter(Boolean).join(' · ');
        const wins=games.filter(g=>g.points>g.opponentPoints).length,losses=games.filter(g=>g.points<g.opponentPoints).length,ties=games.length-wins-losses;
        const record=['CLOSE_GAME_RECORD','HALFTIME_RECORD','POOLED_H2H_RECORD'].includes(s.type)?'':`<p class="workspace-game-record">מאזן: ${text(`${wins} ${wins===1?'ניצחון':'ניצחונות'} · ${losses} ${losses===1?'הפסד':'הפסדים'}${ties?` · ${ties} בשוויון`:''}`)}</p>`;
        const rows=games.map(g=>{
          const date=new Date(g.date),dateLabel=Number.isNaN(+date)?'—':date.toLocaleDateString('he-IL');
          const margin=g.points-g.opponentPoints,outcome=margin===0?'שוויון':`${margin>0?'ניצחון':'הפסד'} ב־${Math.abs(margin)} ${Math.abs(margin)===1?'נקודה':'נקודות'}`;
          return `<tr data-detail-game="${escape(`${g.seasonKey}:${g.gameId}`)}"><td>${text(dateLabel)}</td>${multiSeason?`<td>${text(window.IBBASeasons.getSeason(g.seasonKey)?.label||g.seasonKey)}</td>`:''}<td>${text(g.opponentName || '—')}</td><td>${g.venue==='home'?'בית':g.venue==='away'?'חוץ':'—'}</td><td>${text(`${g.points}:${g.opponentPoints}`)}</td><td>${text(outcome)}</td></tr>`;
        }).join('');
        return `<div class="workspace-detail-group">${record}<div class="broadcast-table-wrap workspace-game-results" role="region" aria-label="${escape(`תוצאות: ${title}`)}" tabindex="0"><table class="broadcast-table"><caption>${text(title)}</caption><thead><tr><th scope="col">תאריך</th>${multiSeason?'<th scope="col">עונה</th>':''}<th scope="col">יריבה</th><th scope="col">בית / חוץ</th><th scope="col">תוצאה — ${text(group.teamName)} תחילה</th><th scope="col">סיום</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
      }).join('');
      return `<details class="workspace-game-details" data-workspace-details="${key(s)}"><summary>פרטים נוספים — תוצאות המשחקים</summary>${content}</details>`;
    }
    static card(s,{saved=false,readOnly=false}={}) {
      return `<article class="broadcast-highlight"><p>${text(s.text)}</p><div class="workspace-actions">${button('add',saved?'נוסף לדף שלי':'הוסף לדף שלי',s,saved||readOnly||!s.storyKey)}${button('copy-current','העתק',s)}</div>${this.details(s)}</article>`;
    }
    static item(item,index,total,{readOnly=false,review=false}={}) {
      const s=item.storySnapshot,id=`ws-note-${encodeURIComponent(item.storyKey)}`;
      return `<article class="workspace-item${item.used?' workspace-used':''}"><p class="workspace-story">${text(s.text)}</p>
        ${review?`<p class="workspace-review-label">${item.status==='changed'?'יש נתונים מעודכנים':'הנקודה אינה זמינה בדוח המעודכן'}</p>${item.pendingStory?`<p>${text(item.pendingStory.text)}</p>${button('update','עדכן נקודה',s,readOnly)}`:''}`:''}
        <label for="${escape(id)}">הערה לשידור</label><textarea id="${escape(id)}" data-workspace-action="note" data-story-key="${key(s)}" rows="2"${readOnly?' readonly':''}>${escape(item.note)}</textarea>
        <div class="workspace-actions">${!review?`${button('move-up','העבר למעלה',s,readOnly||index===0)}${button('move-down','העבר למטה',s,readOnly||index===total-1)}<label class="workspace-used-control"><input type="checkbox" data-workspace-action="used" data-story-key="${key(s)}"${item.used?' checked':''}${readOnly?' disabled':''}> נאמר בשידור</label>`:''}
        ${button('copy','העתק',s)}${button('remove','הסר',s,readOnly)}</div>${this.details(s)}</article>`;
    }
    static render(report,result,{readOnly=false}={}) {
      const state=result.state,active=state.items.filter(i=>i.status==='active'),review=state.items.filter(i=>i.status!=='active');
      return `<section class="workspace-personal" aria-labelledby="workspaceHeading"><div class="workspace-heading"><h3 id="workspaceHeading">הדף שלי לשידור</h3>${result.canUndo&&!readOnly?button('undo','בטל הסרה'):''}</div>
        ${readOnly?'<p>צפייה בהכנה שנשמרה למשחק זה.</p>':''}
        <p class="workspace-status" role="status" aria-live="polite">${text(result.notice || '')}</p>
        ${result.cached?`<p>מוצגות הנקודות השמורות. מועד השמירה: ${text(new Date(state.updatedAt).toLocaleString('he-IL'))}.</p>`:''}
        ${result.conflict?`<div class="workspace-conflict">${button('keepLocal','שמור את הדף מכאן',null,readOnly)}${result.conflict.remote?button('acceptRemote','טען את הדף מהחלון האחר',null,readOnly):''}</div>`:''}
        ${!result.writable?`<div class="workspace-conflict">${button('reset','התחל דף חדש',null,readOnly)}</div>`:''}
        ${result.recoveryText?button('recovery','העתק תוכן לשחזור'):''}
        <div class="workspace-points">${active.length?active.map((i,index)=>this.item(i,index,active.length,{readOnly})).join(''):'<p class="workspace-empty">בחרו נקודות באמצעות ״הוסף לדף שלי״ מתוך ההמלצות או הנתונים בהמשך. הסדר וההערות יישמרו למשחק הזה.</p>'}</div>
        ${review.length?`<details class="workspace-review" open><summary>נקודות לבדיקה (${review.length})</summary>${review.map((i,index)=>this.item(i,index,review.length,{readOnly,review:true})).join('')}</details>`:''}
        ${result.manualCopy!=null?`<div class="workspace-manual-copy"><label for="ws-manual-copy">אפשר להעתיק את הטקסט המסומן ידנית</label><textarea id="ws-manual-copy" readonly rows="4">${escape(result.manualCopy)}</textarea>${button('close-copy','סגור')}</div>`:''}</section>`;
    }
  }
  window.IBBABroadcastWorkspaceView=IBBABroadcastWorkspaceView;
})();
