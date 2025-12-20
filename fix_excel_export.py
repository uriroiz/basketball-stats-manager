#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Old code to replace
old_code = r'''      // Create workbook and worksheet
      const wb = XLSX\.utils\.book_new\(\);
      const ws = XLSX\.utils\.aoa_to_sheet\(excelData\);
      
      // Set RTL \(Right-to-Left\) for the worksheet
      if \(!ws\['\!views'\]\) ws\['\!views'\] = \[{}\];
      ws\['\!views'\]\[0\] = { rightToLeft: true };
      
      // Set column widths
      ws\['\!cols'\] = \[
        { wch: 15 },  // Category
        { wch: 10 },  // Importance
        { wch: 25 },  // Team
        { wch: 80 }   // Insight text
      \];

      // Add worksheet to workbook
      XLSX\.utils\.book_append_sheet\(wb, ws, 'תובנות'\);

      // Generate filename with team names and date
      // Get team names from selectors
      const homeSelect = document\.getElementById\('homeTeamSelect'\);
      const awaySelect = document\.getElementById\('awayTeamSelect'\);
      const homeTeam = homeSelect\?\.selectedOptions\?\.\[0\]\?\.text \|\| 'קבוצת-בית';
      const awayTeam = awaySelect\?\.selectedOptions\?\.\[0\]\?\.text \|\| 'קבוצת-חוץ';
      
      // Format date as DDMMYYYY
      const now = new Date\(\);
      const day = String\(now\.getDate\(\)\)\.padStart\(2, '0'\);
      const month = String\(now\.getMonth\(\) \+ 1\)\.padStart\(2, '0'\);
      const year = now\.getFullYear\(\);
      const dateStr = `\${day}\${month}\${year}`;
      
      // Filename format: "הכנה למשחק_DDMMYYYY_שם-קבוצת-בית_נגד_שם-קבוצת-חוץ"
      const filename = `הכנה למשחק_\${dateStr}_\${homeTeam}_נגד_\${awayTeam}\.xlsx`;

      // Save file
      XLSX\.writeFile\(wb, filename\);
      
      console\.log\(`✅ Exported \${excelData\.length - 1} insights to Excel`\);'''

# New code
new_code = '''      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 15 },  // Category
        { wch: 10 },  // Importance
        { wch: 25 },  // Team
        { wch: 80 }   // Insight text
      ];

      const sheetName = 'תובנות';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Write to ArrayBuffer
      const xlsxArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      // Post-process with JSZip to inject RTL
      try {
        const zip = await JSZip.loadAsync(xlsxArray);
        
        const sheetIndex = wb.SheetNames.indexOf(sheetName);
        const sheetPath = `xl/worksheets/sheet${sheetIndex + 1}.xml`;
        const sheetFile = zip.file(sheetPath);

        if (sheetFile) {
          let xml = await sheetFile.async('string');

          // Inject rightToLeft="1" into sheetView
          if (xml.includes('<sheetViews')) {
            xml = xml.replace(
              /<sheetView\\b([^>]*)>/,
              (m, attrs) =>
                attrs.includes('rightToLeft=')
                  ? m.replace(/rightToLeft="[^"]*"/, 'rightToLeft="1"')
                  : `<sheetView rightToLeft="1"${attrs}>`
            );
          } else {
            xml = xml.replace(
              /<worksheet\\b([^>]*)>/,
              `<worksheet$1><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>`
            );
          }

          zip.file(sheetPath, xml);
        }

        // Generate filename with team names and date
        const homeSelect = document.getElementById('homeTeamSelect');
        const awaySelect = document.getElementById('awayTeamSelect');
        const homeTeam = homeSelect?.selectedOptions?.[0]?.text || 'קבוצת-בית';
        const awayTeam = awaySelect?.selectedOptions?.[0]?.text || 'קבוצת-חוץ';
        
        // Format date as DDMMYYYY
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const dateStr = `${day}${month}${year}`;
        
        // Filename format: "הכנה למשחק_DDMMYYYY_שם-קבוצת-בית_נגד_שם-קבוצת-חוץ"
        const filename = `הכנה למשחק_${dateStr}_${homeTeam}_נגד_${awayTeam}.xlsx`;

        // Generate Blob and download
        const outBlob = await zip.generateAsync({ type: 'blob' });
        
        // Trigger download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(outBlob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);

        console.log(`✅ Exported ${excelData.length - 1} insights to Excel with RTL`);
      } catch (error) {
        console.error('❌ Error processing Excel file:', error);
        alert('שגיאה ביצירת קובץ Excel. אנא נסה שוב.');
      }'''

# Replace
content = re.sub(old_code, new_code, content, flags=re.DOTALL)

# Write back
with open('index.html', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Fixed Excel export function!")






