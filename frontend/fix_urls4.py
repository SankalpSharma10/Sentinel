import os
import re

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            content = content.replace("const url = /api/v1/", "const url = `/api/v1/")
            content = content.replace("fetch(/api/v1/", "fetch(`/api/v1/")
            content = content.replace("= /api/v1/", "= `/api/v1/")

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
