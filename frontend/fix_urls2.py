import os
import re

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            content = content.replace('fetch(/api/', 'fetch(`/api/')
            content = content.replace('fetch(\'/api/', 'fetch(`/api/')

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
