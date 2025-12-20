#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Read the file as binary to preserve exact encoding
with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with "Format date as DDMMYYYY" and modify following lines
for i, line in enumerate(lines):
    if 'Format date as DDMMYYYY' in line and i < len(lines) - 7:
        # Check if this is the right place (should have "const now = new Date()" next)
        if 'const now = new Date()' in lines[i+1]:
            print(f"Found at line {i+1}")
            
            # Replace the comment
            lines[i] = line.replace(
                '// Format date as DDMMYYYY',
                '// Format date as DDMMYYYY (use game date if available)'
            )
            
            # Replace the next 5 lines
            indent = '        '
            new_code = [
                indent + 'let dateToUse;\n',
                indent + 'if (currentAdvancedReport.gameInfo && currentAdvancedReport.gameInfo.date) {\n',
                indent + '  dateToUse = new Date(currentAdvancedReport.gameInfo.date);\n',
                indent + "  console.log('📅 Using game date:', currentAdvancedReport.gameInfo.date);\n",
                indent + '} else {\n',
                indent + '  dateToUse = new Date();\n',
                indent + "  console.log('📅 Using current date (no game date found)');\n",
                indent + '}\n',
                indent + '\n',
                indent + "const day = String(dateToUse.getDate()).padStart(2, '0');\n",
                indent + "const month = String(dateToUse.getMonth() + 1).padStart(2, '0');\n",
                indent + 'const year = dateToUse.getFullYear();\n',
                indent + 'const dateStr = `${day}${month}${year}`;\n',
            ]
            
            # Replace lines i+1 through i+6 (6 lines total)
            lines[i+1:i+7] = new_code
            print("✅ Replaced date code")
            break

# Write back
with open('index.html', 'w', encoding='utf-8', newline='') as f:
    f.writelines(lines)

print("✅ Date fix applied!")






