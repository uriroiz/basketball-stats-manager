// preGamePrep.js
// Aggregation & matchup prep for NEXT GAME, based on arrays of past-game JSONs.

// דרישות: קובץ gameAnalysis.js קיים ומייצא normalizeTeam, estimatePossessions, computeTeamMetrics, types.

/**
 * @typedef {Object} PerGamePair
 * @property {Object} home - metrics for home team in a single past game
 * @property {Object} away - metrics for away team in a single past game
 * @property {string} homeName - name of home team
 * @property {string} awayName - name of away team
 */

/**
 * @typedef {Object} SeriesAgg
 * @property {string} teamName - name of the team
 * @property {number} nGames - number of games analyzed
 * @property {number} pacePer40_avg - average pace per 40 minutes
 * @property {number} offRtg_avg - average offensive rating
 * @property {number} defRtg_avg - average defensive rating
 * @property {number} netRtg_avg - average net rating
 * @property {number} eFG_avg - average effective field goal percentage
 * @property {number} TS_avg - average true shooting percentage
 * @property {number} threePAR_avg - average three-point attempt rate
 * @property {number} ftRate_avg - average free throw rate
 * @property {number} tovPct_avg - average turnover percentage
 * @property {number} orbPct_avg - average offensive rebound percentage
 * @property {number} drbPct_avg - average defensive rebound percentage
 * @property {number} paintShare_avg - average paint points share
 * @property {number} benchShare_avg - average bench points share
 * @property {number} fastbreakPPP_avg - average fast break points per possession
 * @property {number} secondChancePtsPerOR_avg - average second chance points per offensive rebound
 * @property {number} opp_threePAR_avg - average three-point attempt rate allowed to opponents
 * @property {number} opp_ftRate_avg - average free throw rate allowed to opponents
 * @property {number} opp_tovPct_avg - average turnover percentage forced on opponents
 * @property {number} opp_orbPct_avg - average offensive rebound percentage allowed to opponents
 * @property {number} lastN - number of recent games analyzed
 * @property {number} netRtg_lastN - net rating in last N games
 * @property {number} offRtg_lastN - offensive rating in last N games
 * @property {number} defRtg_lastN - defensive rating in last N games
 * @property {number} netRtg_std - standard deviation of net rating
 * @property {number} netRtg_slope - slope of net rating trend (>0 improving, <0 declining)
 */

/**
 * @typedef {Object} MatchupAgg
 * @property {SeriesAgg} A - team A aggregation
 * @property {SeriesAgg} B - team B aggregation
 * @property {number} expect_pace_per40 - expected pace per 40 minutes
 * @property {Object} edges - matchup edges
 * @property {number} edges.shooting_profile - shooting profile edge (+ favors A, - favors B)
 * @property {number} edges.turnover_pressure - turnover pressure edge
 * @property {number} edges.rebound_off - offensive rebound edge
 * @property {number} edges.free_throw_edge - free throw edge
 * @property {number} edges.bench_influence - bench influence edge
 */

// ---------- Utilities ----------
const mean = (arr) => (arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0);

const std = (arr) => {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  const v = mean(arr.map(x => (x-m)*(x-m)));
  return Math.sqrt(v);
};

// Linear regression slope for y vs. index (0..n-1)
const slope = (arr) => {
  const n = arr.length;
  if (n <= 1) return 0;
  const xs = Array.from({length: n}, (_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(arr);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (arr[i] - yMean);
    den += (xs[i] - xMean) * (xs[i] - xMean);
  }
  return den === 0 ? 0 : num / den;
};

// Extract per-game metrics for both teams from one JSON file
export function parseGamePair(gameJson) {
  const homeRaw = gameJson.tm?.["1"] ?? gameJson.home ?? {};
  const awayRaw = gameJson.tm?.["2"] ?? gameJson.away ?? {};

  const Hn = window.normalizeTeam(homeRaw);
  const An = window.normalizeTeam(awayRaw);

  const possH = window.estimatePossessions(Hn);
  const possA = window.estimatePossessions(An);

  const home = window.computeTeamMetrics(Hn, An, possH, possA);
  const away = window.computeTeamMetrics(An, Hn, possA, possH);

  return {
    home, away,
    homeName: Hn.name || "Home",
    awayName: An.name || "Away",
  };
}

// Build series for a particular team by name
export function buildSeriesAgg(games, teamName, opts = {}) {
  const lastN = Math.max(3, opts?.lastN ?? 5); // חלון ברירת מחדל 5

  const rows = [];

  for (const g of games) {
    const p = parseGamePair(g);
    // זהה לפי שם
    const isHome = p.homeName === teamName;
    const isAway = p.awayName === teamName;
    if (!isHome && !isAway) continue;

    const self = isHome ? p.home : p.away;
    const opp = isHome ? p.away : p.home;
    rows.push({ self, opp });
  }

  const n = rows.length || 0;
  const takeAll = rows.map(r => r.self);
  const takeOppAll = rows.map(r => r.opp);

  // ממוצעים כוללים
  const M = (k) => mean(takeAll.map(x => Number(x[k] ?? 0)));
  const O = (k) => mean(takeOppAll.map(x => Number(x[k] ?? 0)));

  // lastN window (הכי אחרונים)
  const last = rows.slice(-lastN);
  const takeLast = last.map(r => r.self);

  const L = (k) => mean(takeLast.map(x => Number(x[k] ?? 0)));
  const S = (k) => std(takeAll.map(x => Number(x[k] ?? 0)));
  const T = (k) => slope(takeAll.map(x => Number(x[k] ?? 0)));

  // Pace פר משחק = (possHome+possAway)/2 בפריים הקודם; כאן נשתמש בקירוב דרך poss של self (זמין ב-self.poss)
  const paceAll = takeAll.map(x => x.poss);
  const pacePer40_all = paceAll.map(p => p); // כבר בקנה מידה פוזשנים למשחק; ההמרה ל-40 דק׳ נעשית בשכבת תצוגה לפי ליגה – נשמור פוז'.

  // הערכות "allow" דרך נתוני היריבות מולנו:
  const opp_threePAR = takeOppAll.map(x => x.threePAR);
  const opp_ftRate = takeOppAll.map(x => x.ftRate);
  const opp_tovPct = takeOppAll.map(x => x.tovPct);
  const opp_orbPct = takeOppAll.map(x => x.orbPct);
  const opp_benchShare = takeOppAll.map(x => x.benchShare);

  // סדרות לטרנדים/סטיות עבור netRtg
  const netSeries = takeAll.map(x => x.netRtg);

  return {
    teamName,
    nGames: n,

    pacePer40_avg: mean(pacePer40_all), // פוז' ממוצעים למשחק (להערכת קצב יחסי)
    offRtg_avg: M("offRtg"),
    defRtg_avg: M("defRtg"),
    netRtg_avg: M("netRtg"),

    eFG_avg: M("eFG"),
    TS_avg: M("TS"),
    threePAR_avg: M("threePAR"),
    ftRate_avg: M("ftRate"),
    tovPct_avg: M("tovPct"),
    orbPct_avg: M("orbPct"),
    drbPct_avg: M("drbPct"),
    paintShare_avg: M("paintShare"),
    benchShare_avg: M("benchShare"),
    fastbreakPPP_avg: M("fastbreakPPP"),
    secondChancePtsPerOR_avg: M("secondChancePtsPerOR"),

    opp_threePAR_avg: mean(opp_threePAR),
    opp_ftRate_avg: mean(opp_ftRate),
    opp_tovPct_avg: mean(opp_tovPct),
    opp_orbPct_avg: mean(opp_orbPct),

    lastN,
    netRtg_lastN: L("netRtg"),
    offRtg_lastN: L("offRtg"),
    defRtg_lastN: L("defRtg"),

    netRtg_std: S("netRtg"),
    netRtg_slope: T("netRtg"),
  };
}

// Compose matchup view for NEXT GAME
export function buildMatchupAgg(A, B) {
  const expect_pace_per40 = (A.pacePer40_avg + B.pacePer40_avg) / 2;

  return {
    A, B,
    expect_pace_per40,
    edges: {
      shooting_profile:
        (A.eFG_avg - B.eFG_avg) + // איכות קליעה עצמית
        (A.threePAR_avg - B.opp_threePAR_avg) * 0.5 + // נפח שלשות מול מה ש-B מאפשרת
        (A.ftRate_avg - B.opp_ftRate_avg) * 0.5,  // נפח קו מול מה ש-B מאפשרת

      turnover_pressure:
        (B.opp_tovPct_avg - A.tovPct_avg), // חיובי = לטובת A (B יריבותיה מאבדות יותר ממה ש-A עצמו מאבד)

      rebound_off:
        (A.orbPct_avg - B.opp_orbPct_avg), // חיובי = לטובת A (A תוקף חזק, B מאפשרת ORB)

      free_throw_edge:
        (A.ftRate_avg - B.opp_ftRate_avg),

      bench_influence:
        (A.benchShare_avg - (B.opp_benchShare_avg ?? 0)), // אם תרצה, אפשר להרחיב לשמירת opp_benchShare_avg באגרגט
    },
  };
}

// Export to window for global access
window.parseGamePair = parseGamePair;
window.buildSeriesAgg = buildSeriesAgg;
window.buildMatchupAgg = buildMatchupAgg;

console.log('📊 Pre-Game Prep module loaded successfully!');
