(function () {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = s => escape(encodeURIComponent(s.storyKey || ''));
  const text = value => window.IBBABroadcastView.text(value);
  const button = (action,label,s,disabled=false) => `<button type="button" data-workspace-action="${action}" data-story-key="${s?key(s):''}"${disabled?' disabled':''}>${label}</button>`;
  class IBBABroadcastWorkspaceView {
    static details(s) {
      const f=s.facts || {},labels={value:'נתון',referenceValue:'נתון להשוואה',difference:'שינוי',wins:'ניצחונות',total:'משחקים',points:'נקודות',round:'מחזור',quarter:'רבע',count:'מספר מקרים',threshold:'רף'};
      const values=Object.entries(labels).filter(([k])=>typeof f[k]==='number').map(([k,label])=>`<dt>${label}</dt><dd>${text(f[k])}</dd>`).join('');
      const scope=window.IBBAAnalysisScope?.label(s.analysisScope) || '';
      return `<details data-workspace-details="${key(s)}"><summary>פרטים</summary><dl class="broadcast-facts">${scope?`<dt>טווח הנתונים</dt><dd>${text(scope)}</dd>`:''}${s.sampleSize!=null?`<dt>משחקים</dt><dd>${text(s.sampleSize)}</dd>`:''}${values}</dl></details>`;
    }
    static card(s,{saved=false,readOnly=false}={}) {
      return `<article class="broadcast-highlight"><p>${text(s.text)}</p><div class="workspace-actions">${button('add',saved?'נוסף לדף שלי':'הוסף לדף שלי',s,saved||readOnly||!s.storyKey)}${button('copy','העתק',s)}</div>${this.details(s)}</article>`;
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
