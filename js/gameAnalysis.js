// gameAnalysis.js - Advanced Game Analysis Module
// Computes advanced basketball metrics from JSON data

/**
 * Normalizes raw team data from JSON to standardized format
 * @param {Object} t - Raw team data from JSON
 * @returns {Object} Normalized team data
 */
function normalizeTeam(t) {
  console.log('🔍 === DEBUG: normalizeTeam called ===');
  console.log('🔍 team data:', t);
  console.log('🔍 team data keys:', t ? Object.keys(t) : 'null');
  
  const safeNum = (v, d = 0) => (v == null || isNaN(Number(v)) ? d : Number(v));

  const normalized = {
    name: t.name ?? t.teamName ?? t.team?.name ?? "",
    code: t.code ?? t.teamCode ?? t.team?.code,
    points: safeNum(t.tot_sPoints ?? t.points),

    fgm: safeNum(t.tot_sFieldGoalsMade),
    fga: safeNum(t.tot_sFieldGoalsAttempted),
    tpm: safeNum(t.tot_sThreePointersMade),
    tpa: safeNum(t.tot_sThreePointersAttempted),
    twom: safeNum(t.tot_sTwoPointersMade),
    twoa: safeNum(t.tot_sTwoPointersAttempted),
    ftm: safeNum(t.tot_sFreeThrowsMade),
    fta: safeNum(t.tot_sFreeThrowsAttempted),

    orb: safeNum(t.tot_sReboundsOffensive),
    drb: safeNum(t.tot_sReboundsDefensive),
    trb: safeNum(t.tot_sReboundsTotal),

    ast: safeNum(t.tot_sAssists),
    tov: safeNum(t.tot_sTurnovers),
    stl: safeNum(t.tot_sSteals),
    blk: safeNum(t.tot_sBlocks),
    blkAgainst: safeNum(t.tot_sBlocksReceived),

    pf: safeNum(t.tot_sFoulsPersonal),
    pfDrawn: safeNum(t.tot_sFoulsOn),
    pfTeam: safeNum(t.tot_sFoulsTeam),

    benchPts: safeNum(t.tot_sBenchPoints),
    paintPts: safeNum(t.tot_sPointsInThePaint),
    fbPts: safeNum(t.tot_sPointsFastBreak),
    scPts: safeNum(t.tot_sPointsSecondChance),
    potPts: safeNum(t.tot_sPointsFromTurnovers),

    timeLeadingSec: safeNum(t.tot_sTimeLeading),
    biggestLead: safeNum(t.tot_sBiggestLead),
    biggestRun: safeNum(t.tot_sBiggestScoringRun),
    leadChanges: safeNum(t.tot_sLeadChanges),
    ties: safeNum(t.tot_sTimesScoresLevel),

    teamReb: safeNum(t.tot_sReboundsTeam),
    teamDR: safeNum(t.tot_sReboundsTeamDefensive),
    teamOR: safeNum(t.tot_sReboundsTeamOffensive),
    teamTov: safeNum(t.tot_sTurnoversTeam),

    totalMinutes: safeNum(t.tot_sMinutes, 200), // Default 5×40
  };
  
  console.log('🔍 Normalized team result:', normalized);
  return normalized;
}

/**
 * Estimates possessions using Dean Oliver formula
 * @param {Object} team - Normalized team data
 * @returns {number} Estimated possessions
 */
function estimatePossessions(team) {
  // Dean Oliver estimate: FGA - OR + TOV + 0.44*FTA
  return team.fga - team.orb + team.tov + 0.44 * team.fta;
}

/**
 * Computes comprehensive team metrics
 * @param {Object} team - Team data
 * @param {Object} opp - Opponent data
 * @param {number} possAvg - Average possessions
 * @param {number} teamPoss - Team possessions
 * @param {number} oppPoss - Opponent possessions
 * @returns {Object} Team metrics
 */
function computeTeamMetrics(team, opp, possAvg, teamPoss, oppPoss) {
  const twoPA = Math.max(team.fga - team.tpa, 0);
  const oppTwoPA = Math.max(opp.fga - opp.tpa, 0);

  const eFG = team.fga > 0 ? (team.fgm + 0.5 * team.tpm) / team.fga : 0;
  const TS = (team.fga + 0.44 * team.fta) > 0 ? team.points / (2 * (team.fga + 0.44 * team.fta)) : 0;

  const threePAR = team.fga > 0 ? team.tpa / team.fga : 0;
  const twoPAR = team.fga > 0 ? twoPA / team.fga : 0;

  const ftRate = team.fga > 0 ? team.fta / team.fga : 0; // FT Rate (FTA/FGA)
  const astRate = team.fgm > 0 ? team.ast / team.fgm : 0; // AST/FGM

  const offRtg = teamPoss > 0 ? (team.points / teamPoss) * 100 : 0; // points per 100 poss
  const defRtg = oppPoss > 0 ? (opp.points / oppPoss) * 100 : 0;

  const tovPct = teamPoss > 0 ? team.tov / teamPoss : 0;
  const stlPct = oppPoss > 0 ? team.stl / oppPoss : 0;
  const blkPct = oppTwoPA > 0 ? team.blk / oppTwoPA : 0;

  // Rebound percentages (team perspective)
  const orbPct = (team.orb + (team.teamOR ?? 0)) /
    Math.max(team.orb + (team.teamOR ?? 0) + opp.drb, 1);
  const drbPct = (team.drb + (team.teamDR ?? 0)) /
    Math.max(team.drb + (team.teamDR ?? 0) + opp.orb, 1);

  // Points shares / efficiencies
  const paintShare = team.points > 0 ? team.paintPts / team.points : 0;
  const benchShare = team.points > 0 ? team.benchPts / team.points : 0;
  const fastbreakPPP = team.fbPts / Math.max(teamPoss, 1); // FB per poss
  const secondChancePtsPerOR = team.orb > 0 ? team.scPts / team.orb : 0;
  const pointsOffTovPerOppTOV = opp.tov > 0 ? team.potPts / opp.tov : 0;

  const timeLeadingPct =
    team.timeLeadingSec > 0 && (team.timeLeadingSec + opp.timeLeadingSec) > 0
      ? team.timeLeadingSec / (team.timeLeadingSec + opp.timeLeadingSec)
      : 0;

  return {
    teamName: team.name,
    points: team.points,
    poss: teamPoss,
    offRtg,
    defRtg,
    netRtg: offRtg - defRtg,

    eFG,
    TS,
    threePAR,
    twoPAR,
    ftRate,
    astRate,

    tovPct,
    stlPct,
    blkPct,

    orbPct,
    drbPct,

    paintShare,
    benchShare,
    fastbreakPPP,
    secondChancePtsPerOR,
    pointsOffTovPerOppTOV,

    timeLeadingPct,
    biggestLead: team.biggestLead ?? 0,
    biggestRun: team.biggestRun ?? 0,

    leadChanges: team.leadChanges ?? 0,
    ties: team.ties ?? 0,
  };
}

/**
 * Main function to compute comprehensive game analysis
 * @param {Object} json - Raw game JSON data
 * @returns {Object} Complete game analysis
 */
function computeGameAnalysis(json) {
  console.log('🔍 === DEBUG: computeGameAnalysis called ===');
  console.log('🔍 json:', json);
  console.log('🔍 json type:', typeof json);
  console.log('🔍 json keys:', json ? Object.keys(json) : 'null');
  
  const homeRaw = json.tm?.["1"] ?? json.home ?? {};
  const awayRaw = json.tm?.["2"] ?? json.away ?? {};

  console.log('🔍 homeRaw:', homeRaw);
  console.log('🔍 awayRaw:', awayRaw);

  const home = normalizeTeam(homeRaw);
  const away = normalizeTeam(awayRaw);

  console.log('📊 Normalized teams:', { home: home.name, away: away.name });

  // possessions estimate (Dean Oliver):
  const possHome = estimatePossessions(home);
  const possAway = estimatePossessions(away);
  const poss = (possHome + possAway) / 2;

  // game minutes from summed player minutes ÷ 5
  const gameMinutesHome = home.totalMinutes ? home.totalMinutes / 5 : 40;
  const gameMinutesAway = away.totalMinutes ? away.totalMinutes / 5 : 40;
  const gameMinutes = Math.max(gameMinutesHome, gameMinutesAway);

  // pace per 40 (FIBA) – scale possessions to 40 minutes
  const pacePer40 = (poss * 40) / gameMinutes;

  console.log('⚡ Game pace:', { pacePer40, gameMinutes, poss });

  const homeMetrics = computeTeamMetrics(home, away, poss, possHome, possAway);
  const awayMetrics = computeTeamMetrics(away, home, poss, possAway, possHome);

  const analysis = {
    meta: { pacePer40, gameMinutes },
    teams: {
      home: homeMetrics,
      away: awayMetrics,
    },
    matchup: {
      offRatingDiff: homeMetrics.offRtg - awayMetrics.offRtg,
      rebBattle: {
        orbPctDiff: homeMetrics.orbPct - awayMetrics.orbPct,
        drbPctDiff: homeMetrics.drbPct - awayMetrics.drbPct,
      },
      turnoverBattle: homeMetrics.tovPct - awayMetrics.tovPct, // lower is better
      ftRateDiff: homeMetrics.ftRate - awayMetrics.ftRate,
      shotProfile: {
        threePARdiff: homeMetrics.threePAR - awayMetrics.threePAR,
        paintShareDiff: homeMetrics.paintShare - awayMetrics.paintShare,
        fastbreakPPPdiff: homeMetrics.fastbreakPPP - awayMetrics.fastbreakPPP,
        secondChanceConversionDiff:
          homeMetrics.secondChancePtsPerOR - awayMetrics.secondChancePtsPerOR,
      },
      momentum: {
        timeLeadingPctDiff: homeMetrics.timeLeadingPct - awayMetrics.timeLeadingPct,
        biggestLeadDiff: (home.biggestLead ?? 0) - (away.biggestLead ?? 0),
        leadChangesTotal: (home.leadChanges ?? 0) + (away.leadChanges ?? 0),
        tiesTotal: (home.ties ?? 0) + (away.ties ?? 0),
      },
    },
  };

  console.log('✅ Game analysis completed:', analysis);
  return analysis;
}

/**
 * Formats a number for display with proper rounding
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
function formatMetric(num, decimals = 1) {
  if (isNaN(num) || num === null || num === undefined) return '0.0';
  return Number(num).toFixed(decimals);
}

/**
 * Formats a percentage for display
 * @param {number} num - Number to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
function formatPercentage(num, decimals = 1) {
  if (isNaN(num) || num === null || num === undefined) return '0.0%';
  return (Number(num) * 100).toFixed(decimals) + '%';
}

// Export functions for global use
window.computeGameAnalysis = computeGameAnalysis;
window.formatMetric = formatMetric;
window.formatPercentage = formatPercentage;

console.log('📈 Game Analysis module loaded successfully!');
console.log('🔍 === DEBUG: Module exports ===');
console.log('🔍 window.computeGameAnalysis:', typeof window.computeGameAnalysis);
console.log('🔍 window.formatMetric:', typeof window.formatMetric);
console.log('🔍 window.formatPercentage:', typeof window.formatPercentage);
