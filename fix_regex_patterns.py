#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken regex patterns
# The patterns got corrupted, need to fix them

# Fix 1: sheetVie -> sheetView\b
content = content.replace(
    '/<sheetVie([^>]*)>/',
    '/<sheetView\\b([^>]*)>/'
)

# Fix 2: workshee -> worksheet\b  
content = content.replace(
    '/<workshee([^>]*)>/',
    '/<worksheet\\b([^>]*)>/'
)

# Fix the extra whitespace before async
content = content.replace(
    '        async function exportInsightsToExcel() {',
    '    async function exportInsightsToExcel() {'
)

# Write back
with open('index.html', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("✅ Fixed regex patterns!")
print("   - /<sheetVie([^>]*)>/ → /<sheetView\\b([^>]*)>/")
print("   - /<workshee([^>]*)>/ → /<worksheet\\b([^>]*)>/")
print("   - Fixed indentation for exportInsightsToExcel()")






