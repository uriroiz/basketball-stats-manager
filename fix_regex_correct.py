#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Remove the backspace characters and add proper \\b for JavaScript regex
# In JavaScript regex literals, we need \\b which Python will write as \\\\b

# Replace the broken patterns
content = content.replace(
    r'/<sheetView\x08([^>]*)>/',
    r'/<sheetView\\b([^>]*)>/'
)

content = content.replace(
    r'/<worksheet\x08([^>]*)>/',
    r'/<worksheet\\b([^>]*)>/'
)

# Also check for escaped versions (just in case)
content = content.replace(
    '/<sheetView\\x08([^>]*)>/',
    r'/<sheetView\\b([^>]*)>/'
)

content = content.replace(
    '/<worksheet\\x08([^>]*)>/',
    r'/<worksheet\\b([^>]*)>/'
)

# Write back
with open('index.html', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("✅ Fixed regex patterns correctly!")
print("   - Replaced \\x08 (backspace) with \\\\b (word boundary)")






