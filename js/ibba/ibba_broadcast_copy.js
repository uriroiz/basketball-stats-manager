(function(){
  'use strict';
  const labels={points:'נקודות',opponentPoints:'נקודות ספיגה',margin:'הפרש נקודות',threePointsAttempted:'ניסיונות לשלוש',threePointPercentage:'קליעה לשלוש',fgPercentage:'קליעה מהשדה',ftPercentage:'קליעה מהעונשין',offensiveRebounds:'ריבאונדים בהתקפה',defensiveRebounds:'ריבאונדים בהגנה',totalRebounds:'ריבאונדים',assists:'אסיסטים',turnovers:'איבודים',steals:'חטיפות',blocks:'חסימות',assistTurnoverRatio:'יחס אסיסטים לאיבודים',pointsFastBreak:'נקודות במתפרצת',pointsFromTurnovers:'נקודות מאיבודי היריבה',pointsInPaint:'נקודות בצבע',pointsSecondChance:'נקודות מהזדמנות שנייה',pointsBench:'נקודות מהספסל',quarterMargin:'הפרש נקודות ברבע',contributionPercentage:'מנקודות הקבוצה',minutesPlayed:'דקות'};
  class IBBABroadcastCopy {
    static formatNumber(value,{percent=false}={}){return value==null||!Number.isFinite(value)?'—':`${Number(value.toFixed(1))}${percent?'%':''}`;}
    static format(story,{variant=0}={}) {
      if(story.type==='POOLED_H2H_RECORD') {
        const years=story.seasonKeys.map(k=>window.IBBASeasons.getSeason(k)?.label||k).join(' ו־');
        const prefix=`${story.seasonKeys.length===1?'בעונת':'בעונות'} ${years}, `;
        const [a,b]=story.facts.winsByTeam,total=story.facts.total,names=story.teamNames;
        if(a.wins===b.wins)return `${prefix}במפגשים בין ${names[0]} ל־${names[1]}, כל קבוצה ניצחה ${a.wins===1?'מפגש אחד':`ב־${a.wins} מפגשים`}.`;
        const winner=a.wins>b.wins?0:1,wins=story.facts.winsByTeam[winner].wins;
        return `${prefix}${names[winner]} ניצחה ${wins===total?`בכל ${total} המפגשים`:`ב־${wins} מתוך ${total} המפגשים`} מול ${names[1-winner]}.`;
      }
      const f=story.facts||{},name=story.playerName||story.teamName||'הקבוצה';
      const yearLabels=(story.seasonKeys||[]).map(k=>window.IBBASeasons.getSeason(k)?.label||k);
      const years=yearLabels.length>1?`${yearLabels.slice(0,-1).join(', ')} ו־${yearLabels.at(-1)}`:yearLabels[0]||'';
      const season=years?`${story.seasonKeys.length>1?'בעונות':'בעונת'} ${years}`:'';
      const group=story.playerName&&story.historicalTeam?`, במדי ${story.historicalTeam}`:'';
      const n=v=>this.formatNumber(v),metric=labels[f.metric]||f.metric||'';
      const value=this.formatNumber(f.value,{percent:f.metric?.includes('Percentage')});
      const unit=f.metric?.includes('Percentage')||f.metric==='assistTurnoverRatio'?'':' למשחק';
      const past=story.scope!=='current';
      const statement=f.metric==='points'?`${name} ${story.playerName?'קלע':past?'קלעה':'קולעת'} ${value} נקודות בממוצע למשחק`:f.metric==='opponentPoints'?`${name} ${past?'ספגה':'סופגת'} ${value} נקודות בממוצע למשחק`:f.metric==='margin'?`${name} עם הפרש ממוצע של ${value} נקודות למשחק`:f.metric==='threePointsAttempted'?`${name} ${past?'זרקה':'זורקת'} ${value} פעמים לשלוש בממוצע למשחק`:['ftPercentage','fgPercentage','threePointPercentage'].includes(f.metric)?`${name} ${past?'קלעה':'קולעת'} ${value} ${f.metric==='ftPercentage'?'מהעונשין':f.metric==='fgPercentage'?'מהשדה':'לשלוש'}`:`${name}: ${value} ${metric}${unit}`;
      const range=story.windows?.find(w=>w.mode==='rounds');
      const windowLabel=range?range.fromRound===range.toRound?`במחזור ${range.fromRound}`:`במחזורים ${range.fromRound}–${range.toRound}`:story.windows?.some(w=>w.count===5)?'ב־5 המשחקים האחרונים':'';
      let body;
      if(f.referenceValue!=null&&story.type!=='MATCHUP_STYLE') {
        const referenceYears=(story.samples?.[1]?.seasonKeys||[]).map(k=>window.IBBASeasons.getSeason(k)?.label||k).join(' ו־');
        const reference=story.type==='WINDOW_VS_LEAGUE'?'נקודות למשחק לקבוצה בליגה':story.scope==='comparison'?`בחלון המקביל${referenceYears?` בעונת ${referenceYears}`:''}`:'ב־5 המשחקים הקודמים';
        const rounded=f.difference==null?0:Number(f.difference.toFixed(1));
        const direction=story.type==='WINDOW_VS_LEAGUE'?'פער':rounded>0?'עלייה':rounded<0?'ירידה':'ללא שינוי';
        body=`${statement} ${windowLabel}, לעומת ${this.formatNumber(f.referenceValue,{percent:f.metric?.includes('Percentage')})} ${reference}; ${direction}${rounded?` של ${n(Math.abs(f.difference))}${f.metric?.includes('Percentage')?' נקודות אחוז':''}`:''}.`;
      }else switch(story.type) {
        case 'ROUND_TEAM_SUMMARY': {
          const scores=f.roundMetrics;
          const pointsUnit=v=>Math.abs(v)===1?'נקודה':'נקודות';
          body=story.sampleSize===1
            ? `${name} ${scores.margin>0?'ניצחה':scores.margin<0?'הפסידה':'סיימה בשוויון'} ${n(scores.points)}:${n(scores.opponentPoints)} במחזור ${f.round}${scores.margin?`, בהפרש ${n(Math.abs(scores.margin))} ${pointsUnit(scores.margin)}`:''}.`
            : `${statement} במחזור ${f.round}. ${name} ${past?'קלעה':'קולעת'} ${n(scores.points)} וספגה ${n(scores.opponentPoints)} נקודות בממוצע (${story.sampleSize} משחקים).`;
          if(story.sampleSize>1&&f.roundResults?.length===story.sampleSize&&f.roundResults.every(r=>Number.isFinite(r.margin))) {
            const outcomes=f.roundResults.map(r=>r.margin===0?'שוויון':`${r.margin>0?'ניצחון':'הפסד'} ב־${n(Math.abs(r.margin))} ${pointsUnit(r.margin)}`);
            const results=`${outcomes.slice(0,-1).join(', ')} ו${outcomes.at(-1)}`;
            body=`${name} במחזור ${f.round}: ${results}. בממוצע למשחק ${past?'קלעה':'קולעת'} ${n(scores.points)} וספגה ${n(scores.opponentPoints)} נקודות, עם הפרש ממוצע של ${n(Math.abs(scores.margin))} ${pointsUnit(scores.margin)}${scores.margin>0?' לזכותה':scores.margin<0?' לחובתה':''} (${story.sampleSize} משחקים).`;
          }
          break;
        }
        case 'ROUND_SCORING': case 'PLAYER_ROUND_PROFILE':body=`${statement} במחזור ${f.round}.`;break;
        case 'CLOSE_GAME_RECORD':body=`${name} ניצחה ב־${f.wins} מתוך ${f.total} משחקים שהסתיימו בהפרש של עד 5 נקודות.`;break;
        case 'HALFTIME_RECORD':body=`${name} ניצחה ב־${f.wins} מתוך ${f.total} משחקים שבהם ${f.position==='leading'?'הובילה':'פיגרה'} במחצית.`;break;
        case 'LEAD_REVERSAL':body=`ב־${f.count} מתוך ${f.total} משחקים, ${name} פיגרה בסיום לפחות רבע אחד, אך ניצחה בסיום המשחק.`;break;
        case 'QUARTER_WINDOW':body=`${name}: הפרש ממוצע של ${value} נקודות ברבע ${f.quarter}.`;break;
        case 'WINS_MILESTONE':body=`${name} עם ${f.wins} ניצחונות ו־${f.losses} הפסדים ${windowLabel}.${f.referenceRecords?.filter(r=>r.total).map(r=>` באותו שלב ב־${window.IBBASeasons.getSeason(r.seasonKey)?.label||r.seasonKey}: ${r.wins} ניצחונות ו־${r.losses} הפסדים ב־${r.total} משחקים.`).join('')||''}`;break;
        case 'STREAK_REFERENCE':body=`${name} מגיעה עם ${f.count} ${f.win?'ניצחונות':'הפסדים'} רצופים בעונה הנוכחית.`;break;
        case 'CURRENT_STREAK_HISTORICAL_MATCHUP':body=`${name} עם ${f.count} ${f.win?'ניצחונות':'הפסדים'} רצופים בעונה הנוכחית; במפגש העבר האחרון מול ${story.referenceName} ${f.previousWin?'ניצחה':'הפסידה'} ${f.previousPoints}:${f.previousOpponentPoints}.`;break;
        case 'PLAYER_DOUBLE_DOUBLES':body=`${name} רשם ${f.count} דאבל־דאבלים ב־${f.total} הופעות עם הנתונים הנדרשים.`;break;
        case 'PLAYER_CONSISTENCY':body=`${name} קלע לפחות ${f.threshold} נקודות ב־${f.count} מתוך ${f.total} הופעות.`;break;
        case 'MATCHUP_STYLE':body=`${name} עם ${value} ${metric}${unit}, מול ${story.referenceName}: ${this.formatNumber(f.referenceValue,{percent:f.referenceMetric?.includes('Percentage')})} ${labels[f.referenceMetric]}${f.referenceMetric?.includes('Percentage')?'':' למשחק'}.`;break;
        case 'H2H_WINDOW_PROFILE': case 'H2H_VENUE_PROFILE':case 'PLAYER_OPPONENT_PROFILE':body=`${statement} מול ${story.referenceName}${f.venue?`, ${f.venue==='home'?'בבית':'בחוץ'}`:''}${f.total!=null?`; ניצחה ב־${f.wins} מתוך ${f.total} המפגשים`:''}.`;break;
        default:body=`${statement}${windowLabel?` ${windowLabel}`:''}${f.venue?`, ${f.venue==='home'?'בבית':'בחוץ'}`:''}${story.sampleSize!=null?` (${story.sampleSize} ${story.sampleSize===1?'משחק':'משחקים'})`:''}.`;
      }
      const prefix=season?`${season}${group}, `:'';
      return variant%2?`${body} ${season}${group}.`:`${prefix}${body}`;
    }
  }
  window.IBBABroadcastCopy=IBBABroadcastCopy;
})();

