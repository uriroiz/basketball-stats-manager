(function () {
  'use strict';
  const same=(a,b)=>a&&b&&a.seasonKey===b.seasonKey&&String(a.gameId)===String(b.gameId);
  class IBBABroadcastWorkspaceController {
    constructor({workspace,root,clipboard,onChange=()=>{}}) {
      this.workspace=workspace;this.root=root;this.clipboard=clipboard;this.onChange=onChange;
      this.click=event=>{const target=event.target.closest?.('[data-workspace-action]');if(!target || target.disabled || ['note','used'].includes(target.dataset.workspaceAction))return;
        this.dispatch(target.dataset.workspaceAction,decodeURIComponent(target.dataset.storyKey || ''));};
      this.input=event=>{const t=event.target;if(t.dataset?.workspaceAction==='note')this.dispatch('note',decodeURIComponent(t.dataset.storyKey),t.value);};
      this.change=event=>{const t=event.target;if(t.dataset?.workspaceAction==='used')this.dispatch('used',decodeURIComponent(t.dataset.storyKey),t.checked);};
      this.storage=event=>{this.workspace.receiveExternal(event);this.render();};
    }
    static resolveLink(location,seasonKey,games,{now=new Date(),complete=true}={}) {
      const url=new URL(location.href || location),id=url.searchParams.get('game');
      if(url.searchParams.get('view')!=='gamePrep'||!id)return {state:'none'};
      const matchRef={seasonKey,gameId:id};
      if(url.searchParams.get('season')!==seasonKey||!/^\d+$/.test(id))return {state:'unknown'};
      const match=games.find(g=>same(g,matchRef));
      if(!match)return {state:complete?'unknown':'offline',matchRef};
      const future=window.IBBASeasons.canPrepareSeason(seasonKey) && !match.hasResult && !['cancelled','completed'].includes(match.status) && +new Date(match.date)>+new Date(now);
      return {state:future?'future':'readonly',match,matchRef};
    }
    open(match,{readOnly=false}={}) {
      this.match=match;this.readOnly=readOnly;this.report=null;this.sourceError=false;this.loading=false;this.feedback='';this.manualCopy=null;
      if(!this.bound){this.root.addEventListener('click',this.click);this.root.addEventListener('input',this.input);this.root.addEventListener('change',this.change);window.addEventListener?.('storage',this.storage);this.bound=true;}
      this.workspace.load(match);this.render();return this.snapshot();
    }
    publish(report) {
      if(!same(this.match,report?.gameInfo))return false;
      this.report=report;this.sourceError=false;this.loading=false;this.workspace.reconcile(report);
      if(JSON.stringify(this.workspace.state.selectedPlayerRefs)!==JSON.stringify(report.selectedPlayerRefs || []))this.workspace.apply({type:'players',matchRef:this.match,selectedPlayerRefs:report.selectedPlayerRefs || []});
      this.render();return true;
    }
    snapshot() {
      const result=this.workspace.snapshot();result.cached ||= this.sourceError;
      result.notice=[result.notice,this.loading?'מעדכן נתונים…':'',this.sourceError?'המקור אינו זמין כרגע. הנקודות שנשמרו זמינות כאן.':'',this.feedback].filter(Boolean).join(' · ');
      result.manualCopy=this.manualCopy;return result;
    }
    captureFocus() {
      const active=document.activeElement;
      if(!active?.id || !this.root.contains?.(active))return null;
      return {id:active.id,start:active.selectionStart,end:active.selectionEnd};
    }
    restoreFocus(focus) {
      if(!focus)return;const node=document.getElementById(focus.id);node?.focus?.({preventScroll:true});
      if(typeof focus.start==='number')node?.setSelectionRange?.(focus.start,focus.end);
    }
    render() {
      if(!this.match)return;
      const focus=this.captureFocus(),panel=this.root.querySelector('#broadcastPersonal') || this.root;
      const open=new Set(Array.from(panel.querySelectorAll?.('details[data-workspace-details]') || []).filter(d=>d.open).map(d=>d.dataset.workspaceDetails));
      panel.innerHTML=window.IBBABroadcastWorkspaceView.render(this.report,this.snapshot(),{readOnly:this.readOnly});
      panel.querySelectorAll?.('details[data-workspace-details]').forEach(d=>{d.open=open.has(d.dataset.workspaceDetails);});
      this.restoreFocus(focus);this.onChange(this.snapshot());
    }
    refreshStarted() {this.loading=true;this.render();}
    showSourceError() {this.loading=false;this.sourceError=true;this.render();}
    findStory(key) {return this.workspace.state.items.find(i=>i.storyKey===key)?.storySnapshot || this.report?.allInsights?.find(s=>s.storyKey===key) || this.report?.topStories?.find(s=>s.storyKey===key);}
    async dispatch(action,key,value) {
      if(!this.match)return;
      this.feedback='';
      if(action==='close-copy'){this.manualCopy=null;this.render();return;}
      if(action==='copy'||action==='recovery') {
        const ref=this.match,text=action==='recovery'?this.workspace.snapshot().recoveryText:this.findStory(key)?.text;
        if(text==null)return;
        try {await this.clipboard?.writeText(text);if(!this.clipboard?.writeText)throw Error('Clipboard unavailable');if(!same(ref,this.match))return;this.feedback='הועתק';}
        catch(_){if(!same(ref,this.match))return;this.manualCopy=text;}
        this.render();if(this.manualCopy!=null){const node=document.getElementById('ws-manual-copy');node?.focus?.();node?.select?.();}return;
      }
      if(this.readOnly)return;
      const type=action==='move-up'||action==='move-down'?'move':action;
      const command={type,matchRef:this.match,storyKey:key};
      if(type==='add')command.story=this.findStory(key);
      if(type==='note')command.note=value;
      if(type==='used')command.used=value;
      if(type==='move')command.direction=action==='move-up'?-1:1;
      this.workspace.apply(command);this.render();
    }
    detach() {
      if(this.bound){this.root.removeEventListener?.('click',this.click);this.root.removeEventListener?.('input',this.input);this.root.removeEventListener?.('change',this.change);window.removeEventListener?.('storage',this.storage);}
      this.bound=false;this.match=null;this.report=null;
    }
  }
  window.IBBABroadcastWorkspaceController=IBBABroadcastWorkspaceController;
})();
