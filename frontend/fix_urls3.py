import os
import re

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            content = content.replace("fetch(`/api/v1/cascade-arcs')", "fetch(`/api/v1/cascade-arcs`)")
            content = content.replace("fetch(`/api/v1/chat', {", "fetch(`/api/v1/chat`, {")
            content = content.replace("fetch(`/api/v1/simulate', {", "fetch(`/api/v1/simulate`, {")

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
