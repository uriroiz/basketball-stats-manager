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
    static topic(story) {
      const topics={
        CLOSE_GAME_RECORD:['close-games','משחקים צמודים · הפרש של עד 5 נקודות'],
        HALFTIME_RECORD:['halftime-record','מאזן לפי התוצאה במחצית'],
        LEAD_REVERSAL:['comebacks','ניצחונות אחרי פיגור בסיום רבע'],
        QUARTER_WINDOW:['quarter-play','מאזן הרבעים'],
        LATE_GAME_CHANGE:['late-game-change','שינוי ברבע האחרון'],
        WINDOW_STYLE:['style','סגנון משחק'],
        VENUE_PROFILE:['venue-profile','קליעה ותוצאות'],
        MATCHUP_STYLE:['matchup-style','סגנון המשחק מול היריבה'],
        ROUND_SCORING:['round-profile','קליעה ותוצאות לפי מחזור'],
        ROUND_WINDOW_PROFILE:['round-profile','קליעה ותוצאות לפי מחזור'],
        SAME_STAGE_RECORD:['round-record','מאזן עד המחזור'],
        SAME_STAGE_COMPARISON:['round-comparison','השוואה לאותו שלב בעונות קודמות'],
        WINDOW_VS_LEAGUE:['league-comparison','קליעה בהשוואה לליגה'],
        HISTORICAL_ROUND_RESULT:['round-result','תוצאות המחזור בעונות קודמות'],
        RECENT_WINDOW_CHANGE:['recent-change','שינוי במשחקים האחרונים'],
        HISTORICAL_WINDOW_COMPARISON:['historic-change','השוואת התקופה לעונות קודמות'],
        STREAK_REFERENCE:['streak','רצף תוצאות'],
        WINS_MILESTONE:['wins-milestone','מאזן הניצחונות לאורך העונה'],
        H2H_WINDOW_PROFILE:['head-to-head-profile','ממוצעים במפגשים הישירים'],
        H2H_VENUE_PROFILE:['head-to-head-venue','ממוצעים במפגשים לפי מגרש'],
        H2H_CHANGE:['head-to-head-change','שינוי במפגשים הישירים'],
        CURRENT_STREAK_HISTORICAL_MATCHUP:['streak-meeting','הרצף הנוכחי והמפגש הקודם'],
        LAST_HISTORICAL_MEETING:['last-meeting','המפגש האחרון'],
        HISTORICAL_H2H_RECORD:['head-to-head-record','מאזן המפגשים הישירים'],
        POOLED_H2H_RECORD:['pooled-head-to-head','מאזן המפגשים בעונות האחרונות'],
        TEAM_OFFICIAL_SEASON_BACKGROUND:['season-background','סיכום העונה הסדירה'],
        PLAYER_OFFICIAL_SEASON:['player-season','סיכום עונת השחקן'],
        PLAYER_PREVIOUS_OPPONENT_GAME:['player-opponent-game','הופעה קודמת מול היריבה'],
        PLAYER_SAME_ROUND_GAME:['player-round-game','הופעה קודמת במחזור'],
        PLAYER_OPPONENT_PROFILE:['player-opponent','ביצועי השחקן מול היריבה'],
        PLAYER_ROUND_PROFILE:['player-round','ביצועי השחקן לפי מחזור'],
        PLAYER_DOUBLE_DOUBLES:['player-double-doubles','דאבל דאבל'],
        PLAYER_CONSISTENCY:['player-consistency','עקביות בקליעה'],
        PLAYER_WINDOW_CHANGE:['player-change','שינוי במשחקים האחרונים'],
        PLAYER_CONTRIBUTION_CHANGE:['player-contribution','חלק השחקן בנקודות הקבוצה']
      };
      const legacyTopics={
        CLUTCH_STREAK:'רצף ניצחונות צמודים',WINNING_STREAK:'רצף ניצחונות',LOSING_STREAK:'רצף הפסדים',
        BLOWOUT_WINS:'ניצחונות בהפרש גדול',CLOSE_LOSSES:'הפסדים צמודים',
        HOT_HAND:'כושר קליעה במשחקים האחרונים',COLD_SPELL:'ירידה בקליעה במשחקים האחרונים',
        KILLER_VS_TEAM:'קליעת השחקן מול היריבה',ASSIST_MACHINE:'מסירות לסלים',REBOUND_MACHINE:'ריבאונדים של השחקן',
        TEAM_LEADER:'מוביל הקבוצה',DOUBLE_DOUBLE_MACHINE:'משחקי דאבל דאבל',MR_CONSISTENT:'עקביות השחקן בקליעה',
        BOOM_OR_BUST:'תנודות בקליעה',HOME_COURT_HERO:'קליעת השחקן בבית ובחוץ',RISING_STAR:'מגמת השיפור של השחקן',
        THREE_POINT_DEPENDENT:'חלק השלשות בנקודות הקבוצה',PAINT_DOMINATORS:'קליעה מזריקות ל־2',
        ASSIST_HEAVY:'חלק הסלים שהגיעו מאסיסט',FREE_THROW_FACTORY:'הגעה לקו העונשין',HIGH_SCORING:'קצב צבירת הנקודות',
        FAST_BREAK_KINGS:'נקודות במתפרצת',PAINT_DOMINANCE:'נקודות בצבע',BENCH_POWER:'תרומת הספסל',
        WORST_CATEGORY:'התחום שבו הקבוצה מתקשה',BEST_CATEGORY:'התחום החזק של הקבוצה',STARTING_VS_BENCH:'חמישייה מול ספסל',
        TURNOVER_CAPITALIZATION:'נקודות מאיבודי היריבה',SECOND_CHANCE_MASTERS:'נקודות מהזדמנות שנייה',
        DEFENSIVE_WALL:'הגבלת נקודות היריבה',REBOUND_DOMINANCE:'מאזן הריבאונדים',TURNOVER_CREATORS:'איבודים של היריבה',
        BLOCK_PARTY:'חסימות של הקבוצה',THREE_POINT_DEFENSE_GOOD:'הגנה יעילה מול השלשות',THREE_POINT_DEFENSE_BAD:'קושי בהגנה מול השלשות',
        POINT_DIFF_TREND:'מגמת הפרש הנקודות',SCHEDULE_STRENGTH:'מאזן מול הצמרת והתחתית',SEASON_HALVES:'השוואה בין חצאי העונה',DAY_OF_WEEK:'מאזן לפי יום בשבוע',
        H2H_VENUE:'מפגשים ישירים בבית ובחוץ',H2H_MARGIN_TREND:'מגמת ההפרש במפגשים הישירים',H2H_TOP_SCORER:'הקלע הבולט במפגשים הישירים',H2H_FLIP:'שינוי המאזן במפגשים הישירים',
        SLOW_STARTERS:'פתיחה איטית וניצחונות אחרי פיגור במחצית',COMEBACK_KINGS:'ניצחונות אחרי פיגור גדול',
        FOURTH_QUARTER_COLLAPSE:'הפסדים ברבע האחרון',BEST_QUARTER:'הרבע החזק של הקבוצה',QUARTER_DOMINANCE:'מאזן ניצחונות ברבע',
        LEAGUE_LEADER:'תחומים שבהם הקבוצה מובילה בליגה',ABOVE_AVERAGE:'נתונים מעל ממוצע הליגה',BELOW_AVERAGE:'נתונים מתחת לממוצע הליגה'
      };
      const fallback={ROUND:'נתונים לפי מחזור',MOMENTUM:'מגמות ורצפים',PROFILE:'סגנון משחק',DECIDING:'משחקים צמודים ורבעים',MATCHUP:'מפגשים בין הקבוצות',PLAYERS:'נתוני שחקנים'};
      return topics[story.type]||[story.type||story.family||'background',legacyTopics[story.type]||fallback[story.family]||'נקודות נוספות למשחק'];
    }
    static groups(stories) {
      const groups=new Map();
      for(const [storyIndex,story] of stories.entries()) {
        const f=story.facts||{},numeric=f.metric&&f.value!=null&&f.referenceValue==null;
        const entity=story.playerName||story.teamName||'רקע למשחק';
        const windowLabel=this.window(story),venue=f.venue?f.venue==='home'?'בבית':'בחוץ':'';
        const scopeLabel=window.IBBAAnalysisScope?.label(story.analysisScope),[topicKey,topicLabel]=this.topic(story);
        const opponentIds=[...new Set((story.analysisScope?.windows||story.windows||[]).map(w=>w.opponentId).filter(id=>id!=null).map(String))].sort();
        const referenceKey=story.referenceName?(opponentIds.length?opponentIds:story.referenceName):'';
        const title=[entity,topicLabel,story.historicalTeam,scopeLabel||windowLabel,venue,story.referenceName?`מול ${story.referenceName}`:''].filter(Boolean).join(' · ');
        const key=JSON.stringify([numeric,story.playerRef||(story.teamIds?.length?story.teamIds.map(String).sort():entity),story.historicalTeam,windowLabel,venue,referenceKey,story.scope==='comparison'?'comparison':'',topicKey,numeric?'':story.type,
          window.IBBAAnalysisScope?.groupKey(story.analysisScope),story.analysisScope?.phase==='unknown'?(story.storyKey||story.factKey||story.id||storyIndex):'']);
        if(!groups.has(key))groups.set(key,{key,title,numeric,rows:[],columns:[]});
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
    static wrapTable(title,header,body,key=title,storyTable=false) {
      return `<details class="broadcast-comparison" data-broadcast-table="${escape(encodeURIComponent(key))}"><summary>${this.text(title)}</summary><div class="broadcast-table-wrap" role="region" aria-label="${escape(title)}" tabindex="0"><table class="broadcast-table${storyTable?' broadcast-story-table':''}"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div></details>`;
    }
    static familySummary(stories,context) {
      const preferred=s=>['ROUND_TEAM_SUMMARY','POOLED_H2H_RECORD'].includes(s.type)?1:0;
      const sorted=[...stories].filter(s=>s.text).sort((a,b)=>preferred(b)-preferred(a)||String(b.seasonKeys?.at(-1)||'').localeCompare(String(a.seasonKeys?.at(-1)||'')));
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
      return this.groups(stories.filter(s=>s.type!=='ROUND_TEAM_SUMMARY')).map(group=>{
        if(!group.numeric)return this.wrapTable(group.title,'<th scope="col">עונה</th><th scope="col">נקודה לשידור</th>',group.rows.map(({story,column})=>{
          const season=column.split('|').map(label).join(', ');
          const text=story.type==='SAME_STAGE_RECORD'?`${story.facts.wins} ${story.facts.wins===1?'ניצחון':'ניצחונות'} ב־${story.sampleSize} משחקים.`:String(story.text||'').replace(/^בעונ(?:ת|ות) [\d/, ו־-]+, /,'');
          return `<tr><th scope="row">${this.text(season)}</th><td>${this.text(text)}${this.actions(story)}</td></tr>`;
        }).join(''),group.key,true);
        const commonCounts=Object.fromEntries(group.columns.map(column=>{const counts=[...new Set(group.rows.flatMap(row=>(row.cells[column]||[]).map(s=>s.sampleSize)))];return [column,counts.length===1?counts[0]:null];}));
        const header=`<th scope="col">מדד</th>${group.columns.map(column=>`<th scope="col">${this.text(column.split('|').map(label).join(', '))}${commonCounts[column]!=null?`<span class="broadcast-count">${this.text(this.count(commonCounts[column]))}</span>`:''}</th>`).join('')}`;
        const body=group.rows.map(row=>`<tr><th scope="row">${escape(row.key==='margin:'&&Object.values(row.cells).flat().every(s=>s.sampleSize===1)?'הפרש':row.label)}</th>${group.columns.map(column=>`<td>${(row.cells[column]||[]).map(story=>{
          if(row.key==='record')return `<div>${this.text(`${story.facts.wins} מתוך ${story.facts.total}`)}</div>`;
          const value=window.IBBABroadcastCopy.formatNumber(story.facts.value,{percent:story.facts.metric.includes('Percentage')});
          return `<div>${this.text(value)}${story.sampleSize!=null&&commonCounts[column]==null?`<span class="broadcast-count">${this.text(this.count(story.sampleSize))}</span>`:''}${this.actions(story)}</div>`;
        }).join('')||'—'}</td>`).join('')}</tr>`).join('');
        return this.wrapTable(group.title,header,body,group.key);
      }).join('');
    }
    static renderTeamGroups(stories,context) {
      const officialId=value=>value!=null&&/^[1-9]\d*$/.test(String(value))?String(value):null;
      const teams=context?.match?.teams||[],byTeam=teams.map(()=>[]),shared=[],players=[],unassigned=[];
      for(const story of stories||[]) {
        if(story.playerRef||story.playerName||story.family==='PLAYERS'||String(story.type||'').startsWith('PLAYER_')){players.push(story);continue;}
        const ids=[...new Set((story.teamIds||[]).map(officialId).filter(Boolean))];
        if(ids.length>1){shared.push(story);continue;}
        const index=ids.length===1?teams.findIndex(team=>officialId(team.teamId)===ids[0]):-1;
        if(index<0)unassigned.push(story);else byTeam[index].push(story);
      }
      const section=(title,rows,attributes,className)=>{
        const summaries=rows.filter(story=>story.type==='ROUND_TEAM_SUMMARY').map(story=>`<p class="broadcast-team-summary">${this.text(story.text)}${this.actions(story)}</p>`).join('');
        const content=summaries+this.renderGroups(rows);
        return `<section class="${className}" ${attributes}><h4 class="broadcast-team-heading">${this.text(title)}</h4>${content||'<p class="broadcast-team-empty">אין נתונים זמינים לנושא זה בעונות שנבחרו.</p>'}</section>`;
      };
      const content=teams.map((team,index)=>section(`${team.name||'קבוצה'} · ${index===0?'בית':'חוץ'}`,byTeam[index],`data-broadcast-team="${escape(officialId(team.teamId)||'')}"`,'broadcast-team-section')).join('');
      const extras=[[shared,'נקודות משותפות למשחק'],[players,'שחקנים'],[unassigned,'נקודות נוספות למשחק']].filter(([rows])=>rows.length).map(([rows,title])=>section(title,rows,'','broadcast-shared-section')).join('');
      return `<div class="broadcast-team-groups">${content}${extras}</div>`;
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
