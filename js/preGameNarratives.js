// preGameNarratives.js
// Turn MatchupAgg into broadcaster-friendly PRE-GAME talking points (Hebrew).

const fmt = {
  pct(v, digits = 1) {
    return Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : "—";
  },
  num(v, digits = 1) {
    return Number.isFinite(v) ? Number(v).toFixed(digits) : "—";
  },
};

function labelPace(p) {
  return p >= 75 ? "קצב גבוה מאוד"
       : p >= 70 ? "קצב גבוה"
       : p >= 65 ? "קצב בינוני"
       : "קצב איטי";
}

function side(a) { return a >= 0 ? "A" : "B"; }

/**
 * @typedef {Object} PreGameNotes
 * @property {string[]} tldr - summary points for broadcaster
 * @property {Object} sections - detailed sections with talking points
 * @property {Object} meta - metadata about the analysis
 */

export function buildPreGameNotes(m) {
  const A = m.A, B = m.B;
  const tldr = [];

  // Pace expectation
  const paceLabel = labelPace(m.expect_pace_per40);
  const paceLine = `${paceLabel}: כ-${fmt.num(m.expect_pace_per40, 1)} פוזשנים למשחק (משוקלל היסטורית).`;

  // Shooting profile
  const shootEdge = m.edges.shooting_profile;
  const shootLine = shootEdge >= 0
    ? `יתרון פרופיל קליעה ל-${A.teamName}: eFG% טוב יותר ומגמת נפח שלשות/עונשין העולה על הממוצע ש${B.teamName} מאפשרת.`
    : `יתרון פרופיל קליעה ל-${B.teamName}: איכות הזריקה והנפחים צפויים להטות לכיוון ${B.teamName}.`;

  // Turnover pressure
  const tovLine = m.edges.turnover_pressure >= 0
    ? `לחץ איבודים מצד ${A.teamName}: יריבות של ${B.teamName} מאבדות יותר מ${A.teamName} עצמו – מפתח ללחץ מוקדם על הכדור.`
    : `${B.teamName} עשויה לכפות איבודים: ${A.teamName} מאבדת יותר ממה שיריבות ${B.teamName} מאבדות – ניהול סיכונים חיוני.`;

  // Offensive boards
  const orbLine = m.edges.rebound_off >= 0
    ? `יתרון ריבאונד התקפה ל-${A.teamName}: ORB% גבוה, ו${B.teamName} נוטה לאפשר שניות.`
    : `יתרון ריבאונד התקפה ל-${B.teamName}: ${B.teamName} חזקה בקרש הקדמי או ש${A.teamName} מתקשה למנוע שניות.`;

  // Free throws
  const ftLine = m.edges.free_throw_edge >= 0
    ? `יתרון בקו ל-${A.teamName}: יחס עונשין/שדה של ${A.teamName} גבוה מול מה ש${B.teamName} נוטה לאפשר.`
    : `יתרון בקו ל-${B.teamName}: ${B.teamName} נוטה להגיע לקו יותר ביחס למה ש${A.teamName} מונעת.`;

  // Bench
  const benchLine =
    (A.benchShare_avg - B.benchShare_avg) >= 0.06
    ? `תרומת ספסל משמעותית ל-${A.teamName}: כ-${fmt.pct(A.benchShare_avg)} מהנקודות – שיקול לרוטציות.`
    : (B.benchShare_avg - A.benchShare_avg) >= 0.06
      ? `ספסל ${B.teamName} תורם מעל הממוצע: כ-${fmt.pct(B.benchShare_avg)} מהנקודות – לשים לב לדקות ביניים.`
      : `תרומת הספסלים דומה יחסית; ההכרעה צפויה מהחמישיות.`

  // Form / trend
  const formA = trendLine(A.teamName, A.netRtg_lastN, A.netRtg_slope, A.netRtg_std);
  const formB = trendLine(B.teamName, B.netRtg_lastN, B.netRtg_slope, B.netRtg_std);

  tldr.push(paceLine, shootLine, orbLine, tovLine, ftLine);

  const sections = {
    "קצב צפוי": [paceLine],
    "פרופיל קליעה": [shootLine,
      `${A.teamName} – eFG ממוצע: ${fmt.pct(A.eFG_avg)}, threePAR: ${fmt.pct(A.threePAR_avg)}, FT Rate: ${fmt.pct(A.ftRate_avg)}.`,
      `${B.teamName} מאפשרת ליריבות: threePAR ${fmt.pct(B.opp_threePAR_avg)}, FT Rate ${fmt.pct(B.opp_ftRate_avg)}.`],
    "איבודים ולחץ": [tovLine,
      `${A.teamName} – TOV% ממוצע: ${fmt.pct(A.tovPct_avg)} · ${B.teamName} – יריבות מאבדות מולה: ${fmt.pct(B.opp_tovPct_avg)}.`],
    "ריבאונד התקפה": [orbLine,
      `${A.teamName} – ORB%: ${fmt.pct(A.orbPct_avg)} · ${B.teamName} – יריבות לוקחות מולה ORB%: ${fmt.pct(B.opp_orbPct_avg)}.`],
    "קו עונשין": [ftLine,
      `${A.teamName} – FT Rate: ${fmt.pct(A.ftRate_avg)} · ${B.teamName} – opp FT Rate: ${fmt.pct(B.opp_ftRate_avg)}.`],
    "ספסל ומתפרצות": [
      benchLine,
      `${A.teamName} – ספסל: ${fmt.pct(A.benchShare_avg)} · FB PPP~ ${fmt.num(A.fastbreakPPP_avg, 2)}.`,
      `${B.teamName} – ספסל: ${fmt.pct(B.benchShare_avg)} · FB PPP~ ${fmt.num(B.fastbreakPPP_avg, 2)}.`,
    ],
    "פורמה אחרונה": [formA, formB],
    "מפת מפתחות ניצחון": buildKeysToWin(m),
  };

  return {
    tldr: tldr.slice(0, 5),
    sections,
    meta: {
      expectPace: m.expect_pace_per40,
      formA: { netRtg_lastN: A.netRtg_lastN, slope: A.netRtg_slope, std: A.netRtg_std },
      formB: { netRtg_lastN: B.netRtg_lastN, slope: B.netRtg_slope, std: B.netRtg_std },
    }
  };
}

function trendLine(teamName, netLast, slopeV, stdV) {
  const dir = slopeV > 0.5 ? "במגמת שיפור"
           : slopeV < -0.5 ? "במגמת ירידה"
           : "יציבה יחסית";
  return `פורמה ${teamName}: NetRtg ${netLast.toFixed(1)} ב${dir} (סטיית תקן ${stdV.toFixed(1)}).`;
}

function buildKeysToWin(m) {
  const keys = [];
  const A = m.A, B = m.B;
  
  // A
  if (m.edges.rebound_off >= 0.02) keys.push(`${A.teamName}: לתקוף את הקרש – יתרון ב-ORB% מול חולשה יחסית של ${B.teamName}.`);
  if (m.edges.turnover_pressure >= 0.01) keys.push(`${A.teamName}: להפעיל לחץ מוקדם על מובילי הכדור; המגמה מצביעה על איבודי יריבות גבוהים מול ${B.teamName}.`);
  if (m.edges.shooting_profile >= 0.03) keys.push(`${A.teamName}: לשמר נפח שלשות וכניסות לקו – הפרופיל תומך ביעילות.`);

  // B
  if (m.edges.rebound_off <= -0.02) keys.push(`${B.teamName}: למנוע שניות – דגש על בוקס-אאוט מול יתרון ORB של ${A.teamName}.`);
  if (m.edges.turnover_pressure <= -0.01) keys.push(`${B.teamName}: לכפות איבודים דרך לחץ על מסירות כניסה/דאבל-טים.`);
  if (m.edges.shooting_profile <= -0.03) keys.push(`${B.teamName}: להוריד נפח שלשות של ${A.teamName} ולשמור על קווי חדירה ללא עבירה מיותרת.`);

  if (keys.length === 0) keys.push("המשחק צפוי להיות מאוזן; ההכרעה בפרטים הקטנים – איבוד כאן, ריבאונד התקפה שם.");
  return keys;
}

// Export to window for global access
window.buildPreGameNotes = buildPreGameNotes;

console.log('📝 Pre-Game Narratives module loaded successfully!');
