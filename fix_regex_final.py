#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and fix the specific lines
for i, line in enumerate(lines):
    # Fix line with /<sheetVie
    if '/<sheetVie([^>]*)>/' in line:
        lines[i] = line.replace('/<sheetVie([^>]*)>/', '/<sheetView\\b([^>]*)>/')
        print(f"Fixed line {i+1}: sheetVie -> sheetView\\b")
    
    # Fix line with /<workshee
    if '/<workshee([^>]*)>/' in line:
        lines[i] = line.replace('/<workshee([^>]*)>/', '/<worksheet\\b([^>]*)>/')
        print(f"Fixed line {i+1}: workshee -> worksheet\\b")

# Write back
with open('index.html', 'w', encoding='utf-8', newline='') as f:
    f.writelines(lines)

print("\n✅ Fixed all regex patterns!")






