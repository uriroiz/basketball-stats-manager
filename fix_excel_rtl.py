#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Change onclick to call wrapper function
print("Fix 1: Changing onclick handler...")
content = content.replace(
    'onclick="exportInsightsToExcel()"',
    'onclick="handleExcelExport()"'
)

# Fix 2: Add wrapper function before exportInsightsToExcel
print("Fix 2: Adding wrapper function...")
wrapper_function = '''    // Wrapper function for proper async error handling
    function handleExcelExport() {
      exportInsightsToExcel().catch(error => {
        console.error('❌ Unhandled error in Excel export:', error);
        alert('שגיאה לא צפויה ביצירת קובץ Excel: ' + error.message);
      });
    }

    '''

# Insert wrapper before async function exportInsightsToExcel
content = content.replace(
    '    async function exportInsightsToExcel() {',
    wrapper_function + '    async function exportInsightsToExcel() {'
)

# Fix 3: Add \b to regex patterns for proper XML matching
print("Fix 3: Fixing regex patterns...")

# Fix the sheetView regex - need to escape the backslash properly
content = content.replace(
    '/<sheetView([^>]*)>/',
    '/<sheetView\\b([^>]*)>/'
)

# Fix the worksheet regex
content = content.replace(
    '/<worksheet([^>]*)>/',
    '/<worksheet\\b([^>]*)>/'
)

# Write back
with open('index.html', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("✅ All fixes applied successfully!")
print("   - Changed onclick handler to handleExcelExport()")
print("   - Added wrapper function for error handling")
print("   - Fixed regex patterns with \\b word boundaries")
