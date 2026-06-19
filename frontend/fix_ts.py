import os

filepath = os.path.join('src', 'components', 'TriagePanel.tsx')
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '  date_str: string;\n}',
    '  date_str: string;\n  early_intervention?: boolean;\n}'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
