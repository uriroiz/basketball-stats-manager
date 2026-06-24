const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadUpcomingModule() {
  const file = path.join(__dirname, '..', 'js', 'app_upcoming_games_pure.js');
  const source = fs.readFileSync(file, 'utf8');
  const context = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout,
    clearTimeout,
    fetch: async () => ({ ok: true, json: async () => [] }),
    AbortController,
    Date,
    window: {
      allGames: [
        {
          gameId: 'old-1',
          gameSerial: 'old-1',
          date: '2026-04-01T19:00:00',
          cycle: 28,
          homeTeam: 'Home A',
          awayTeam: 'Away A'
        },
        {
          gameId: 'old-2',
          gameSerial: 'old-2',
          date: '2026-05-20T19:00:00',
          cycle: 30,
          homeTeam: 'Home B',
          awayTeam: 'Away B'
        }
      ]
    },
    document: {
      createElement() {
        return {
          innerHTML: '',
          textContent: '',
          get value() {
            return this.innerHTML || this.textContent;
          }
        };
      },
      getElementById() {
        return null;
      },
      querySelectorAll() {
        return [];
      }
    }
  };

  vm.runInNewContext(`${source}\nwindow.__test = { findDefaultRound, groupGamesByRound, getFallbackGamesFromLoadedSeason };`, context);
  return context.window.__test;
}

const { findDefaultRound, groupGamesByRound, getFallbackGamesFromLoadedSeason } = loadUpcomingModule();

const fallbackGames = getFallbackGamesFromLoadedSeason();
assert.strictEqual(fallbackGames.length, 2, 'uses already loaded games when upcoming API is empty');
assert.deepStrictEqual(fallbackGames.map(game => game.stage_id), ['28', '30']);
assert.strictEqual(fallbackGames[0].home.team, 'Home A');
assert.strictEqual(fallbackGames[1].away.team, 'Away B');

const grouped = groupGamesByRound(fallbackGames);
assert.strictEqual(findDefaultRound(grouped), '30', 'ended seasons default to most recent past round');

console.log('upcoming-games tests passed');
