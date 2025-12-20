#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add findGameByTeams function before performAdvancedAnalysis
find_game_function = '''    /**
     * Find game by team names
     */
    function findGameByTeams(homeTeam, awayTeam) {
      if (!allGames || allGames.length === 0) {
        console.warn('⚠️ No games available to find match');
        return null;
      }
      
      const game = allGames.find(g => 
        g.homeTeam === homeTeam && g.awayTeam === awayTeam
      );
      
      if (game) {
        console.log(`✅ Found game: ${homeTeam} vs ${awayTeam} on ${game.date}`);
      } else {
        console.warn(`⚠️ No game found for ${homeTeam} vs ${awayTeam}`);
      }
      
      return game;
    }

'''

# Insert before performAdvancedAnalysis
content = content.replace(
    '    /**\n     * Perform advanced analysis using Insights V2 system\n     */',
    find_game_function + '    /**\n     * Perform advanced analysis using Insights V2 system\n     */'
)

# 2. Add game info saving in performAdvancedAnalysis
# Find and replace the line where currentAdvancedReport is set
old_report_save = '''        // Build matchup report (this will load standings from HTML)
        const report = await advanced.buildMatchupReport(homeTeam, awayTeam);
        currentAdvancedReport = report;'''

new_report_save = '''        // Build matchup report (this will load standings from HTML)
        const report = await advanced.buildMatchupReport(homeTeam, awayTeam);
        currentAdvancedReport = report;
        
        // Find and save game info (including date) for export
        const gameInfo = findGameByTeams(homeTeam, awayTeam);
        if (gameInfo) {
          currentAdvancedReport.gameInfo = gameInfo;
        }'''

content = content.replace(old_report_save, new_report_save)

# 3. Fix exportInsightsToExcel to use game date
old_date_code = '''      // Format date as DDMMYYYY
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateStr = `${day}${month}${year}`;'''

new_date_code = '''      // Format date as DDMMYYYY (use game date if available)
      let dateToUse;
      if (currentAdvancedReport.gameInfo && currentAdvancedReport.gameInfo.date) {
        dateToUse = new Date(currentAdvancedReport.gameInfo.date);
        console.log('📅 Using game date:', currentAdvancedReport.gameInfo.date);
      } else {
        dateToUse = new Date();
        console.log('📅 Using current date (no game date found)');
      }
      
      const day = String(dateToUse.getDate()).padStart(2, '0');
      const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
      const year = dateToUse.getFullYear();
      const dateStr = `${day}${month}${year}`;'''

content = content.replace(old_date_code, new_date_code)

# Write back
with open('index.html', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("✅ All fixes applied successfully!")
print("   1. Added findGameByTeams() function")
print("   2. Modified performAdvancedAnalysis() to save game info")
print("   3. Modified exportInsightsToExcel() to use game date")






