(function () {
  'use strict';
  const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const same = (a,b) => a && b && a.seasonKey===b.seasonKey && String(a.gameId)===String(b.gameId);
  const failure = 'לא ניתן לשמור במכשיר כרגע; השינויים זמינים בדף הפתוח';
  const fields = ['type','family','storyKey','factFingerprint','text','broadcastShort','facts','seasonKeys','analysisScope','sampleSize',
    'samples','evidence','scope','teamIds','teamNames','teamName','playerRef','playerName','historicalTeam','dataState','windows'];
  const snapshot = s => copy(Object.fromEntries(fields.filter(k=>s[k]!==undefined).map(k=>[k,s[k]])));
  const matchSnapshot = m => copy(Object.fromEntries(['seasonKey','gameId','date','homeTeam','awayTeam','teams','roundNumber','roundVerified','competitionPhase','status','hasResult','permalink'].filter(k=>m[k]!==undefined).map(k=>[k,m[k]])));
  class IBBABroadcastWorkspace {
    constructor({storage,now=()=>new Date(),writerId}={}) {
      this.storage=storage;this.now=now;this.writerId=writerId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    }
    static key(ref) {return `ibba_broadcast_workspace_v1:${ref.seasonKey}:${ref.gameId}`;}
    fresh(ref) {return {schemaVersion:1,matchRef:{seasonKey:ref.seasonKey,gameId:String(ref.gameId)},matchSnapshot:matchSnapshot(ref),
      revision:0,writerId:this.writerId,updatedAt:this.now().toISOString(),selectedPlayerRefs:[],items:[]};}
    validate(value, ref) {
      if (!value || value.schemaVersion!==1 || !same(value.matchRef,ref) || !Array.isArray(value.items) || !Array.isArray(value.selectedPlayerRefs)
        || !value.selectedPlayerRefs.every(x=>typeof x==='string') || !Number.isSafeInteger(value.revision) || value.revision<0
        || typeof value.writerId!=='string' || !Number.isFinite(Date.parse(value.updatedAt)) || !same(value.matchSnapshot,value.matchRef)) return false;
      const seen=new Set();
      return value.items.every(i=>{
        if (!i || typeof i.storyKey!=='string' || seen.has(i.storyKey) || typeof i.note!=='string' || typeof i.used!=='boolean'
          || !['active','changed','missing'].includes(i.status) || !i.storySnapshot || i.storySnapshot.storyKey!==i.storyKey
          || typeof i.storySnapshot.text!=='string' || !Number.isFinite(Date.parse(i.savedAt))
          || i.status==='changed' && (!i.pendingStory || i.pendingStory.storyKey!==i.storyKey || typeof i.pendingStory.text!=='string')) return false;
        seen.add(i.storyKey);return true;
      });
    }
    read() {
      const storage=this.storage || window.localStorage;
      if (!storage) throw Error('Storage unavailable');
      return storage.getItem(this.key);
    }
    load(ref) {
      if (!ref || !/^\d{4}-\d{2}$/.test(ref.seasonKey) || !/^\d+$/.test(String(ref.gameId))) throw Error('Invalid match identity');
      this.key=IBBABroadcastWorkspace.key(ref);this.state=this.fresh(ref);this.raw=null;this.notice='';this.conflict=null;this.undo=null;this.writable=true;this.cached=false;this.recoveryText='';
      try {
        this.raw=this.read();
        if (this.raw!=null) {
          let saved;try {saved=JSON.parse(this.raw);} catch (_) {}
          if (this.validate(saved,ref)) this.state=copy(saved);
          else {this.writable=false;this.recoveryText=this.raw;this.notice='הדף השמור אינו תקין או נוצר בגרסה אחרת. אפשר להתחיל דף חדש או להעתיק את התוכן לשחזור.';}
        }
      } catch (_) {this.notice=failure;}
      return this.snapshot();
    }
    snapshot() {return copy({state:this.state,notice:this.notice,conflict:this.conflict,writable:this.writable,cached:this.cached,
      canUndo:Boolean(this.undo),recoveryText:this.recoveryText});}
    persist(force=false) {
      if (!this.writable || this.conflict && !force) return this.snapshot();
      try {
        const current=this.read();
        if (!force && current!==this.raw) {this.receiveExternal({key:this.key,newValue:current});return this.snapshot();}
        let revision=this.state.revision;
        if (force && current) {try {const remote=JSON.parse(current);if(this.validate(remote,this.state.matchRef))revision=Math.max(revision,remote.revision);}catch(_) {}}
        this.state.revision=revision+1;this.state.writerId=this.writerId;this.state.updatedAt=this.now().toISOString();
        const raw=JSON.stringify(this.state);(this.storage || window.localStorage).setItem(this.key,raw);
        this.raw=raw;this.notice='נשמר במכשיר';this.conflict=null;
      } catch (_) {this.notice=failure;}
      return this.snapshot();
    }
    receiveExternal({key,newValue}) {
      if (key!==this.key || newValue===this.raw) return this.snapshot();
      let remote=null;try {remote=newValue==null?null:JSON.parse(newValue);}catch(_) {}
      this.conflict={remote:this.validate(remote,this.state.matchRef)?copy(remote):null,raw:newValue,local:copy(this.state)};
      this.notice='הדף השתנה בחלון אחר. ההערות שלך נשמרות כאן עד לבחירה כיצד להמשיך.';
      return this.snapshot();
    }
    apply(command) {
      if (!same(command.matchRef,this.state?.matchRef)) throw Error('Workspace match changed');
      const item=this.state.items.find(i=>i.storyKey===command.storyKey);
      switch (command.type) {
        case 'add': {
          const s=command.story;if (!s?.storyKey || typeof s.text!=='string') return this.snapshot();
          if (this.state.items.some(i=>i.storyKey===s.storyKey)) return this.snapshot();
          this.state.items.push({storyKey:s.storyKey,storySnapshot:snapshot(s),savedAt:this.now().toISOString(),note:'',used:false,status:'active',pendingStory:null});break;
        }
        case 'note': if(item)item.note=String(command.note ?? '');break;
        case 'used': if(item)item.used=Boolean(command.used);break;
        case 'move': {
          const active=this.state.items.filter(i=>i.status==='active'),position=active.indexOf(item),neighbor=active[position+command.direction];
          if(position>=0 && [-1,1].includes(command.direction) && neighbor) {
            const index=this.state.items.indexOf(item),target=this.state.items.indexOf(neighbor);
            [this.state.items[index],this.state.items[target]]=[this.state.items[target],this.state.items[index]];
          }break;
        }
        case 'remove': if(item){this.undo={item:copy(item),index:this.state.items.indexOf(item)};this.state.items=this.state.items.filter(i=>i!==item);}break;
        case 'undo': if(this.undo){if(!this.state.items.some(i=>i.storyKey===this.undo.item.storyKey))this.state.items.splice(this.undo.index,0,this.undo.item);this.undo=null;}break;
        case 'update': if(item?.pendingStory){item.storySnapshot=snapshot(item.pendingStory);item.pendingStory=null;item.status='active';item.savedAt=this.now().toISOString();}break;
        case 'players': this.state.selectedPlayerRefs=[...new Set(command.selectedPlayerRefs || [])];break;
        case 'reset': this.state=this.fresh(this.state.matchRef);this.writable=true;this.conflict=null;this.undo=null;this.recoveryText='';return this.persist(true);
        case 'acceptRemote': {
          if(this.conflict?.remote){this.recoveryText=JSON.stringify(this.state);this.state=copy(this.conflict.remote);this.raw=this.conflict.raw;this.conflict=null;this.notice='נטען הדף מהחלון האחר; ההערות המקומיות זמינות להעתקה לשחזור.';}
          return this.snapshot();
        }
        case 'keepLocal': this.conflict=null;return this.persist(true);
        default: return this.snapshot();
      }
      return this.persist();
    }
    sourceReady(story,report) {
      const a=story.analysisScope,keys=a?.requestedSeasonKeys || story.seasonKeys || [];
      if (a?.basis==='officialSummary') {
        const ctx=report.context;
        if (story.type?.includes('PLAYER')) return keys.every(key=>(ctx?.playerSummaries?.statuses || []).find(s=>s.seasonKey===key)?.state==='ready' || ctx?.playerSummaries?.state==='ready' && !(ctx.playerSummaries.statuses || []).some(s=>s.seasonKey===key && s.state!=='ready'));
        return keys.every(key=>(ctx?.teamSummaries || []).find(s=>s.seasonKey===key)?.state==='ready');
      }
      return keys.every(key=>key===report.seasonKey ? report.context?.currentComplete===true : report.context?.priorSeasons?.find(s=>s.seasonKey===key)?.state==='ready');
    }
    reconcile(report) {
      if (!same(report?.gameInfo,this.state?.matchRef)) return this.snapshot();
      const before=JSON.stringify(this.state),byKey=new Map((report.allInsights || []).filter(s=>s.storyKey).map(s=>[s.storyKey,s]));
      this.state.matchSnapshot=matchSnapshot(report.gameInfo);
      this.cached=false;
      for (const item of this.state.items) {
        if (!this.sourceReady(item.storySnapshot,report)) {this.cached=true;continue;}
        const next=byKey.get(item.storyKey);
        if (!next) {item.status='missing';item.pendingStory=null;continue;}
        if (next.factFingerprint===item.storySnapshot.factFingerprint) {item.status='active';item.pendingStory=null;}
        else {item.status='changed';item.pendingStory=snapshot(next);}
      }
      if (JSON.stringify(this.state)!==before) return this.persist();
      return this.snapshot();
    }
  }
  window.IBBABroadcastWorkspace=IBBABroadcastWorkspace;
})();
