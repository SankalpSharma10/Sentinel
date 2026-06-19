import os
import re

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Fix the messed up process.env substitution
            content = re.sub(r'`\$\s*\{process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*"http://localhost:8000"\}', '', content)
            content = re.sub(r'`\$\s*\{process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*\'http://localhost:8000\'\}', '', content)
            # Fix any weird unescaped versions
            content = content.replace('$ {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}', '')
            content = content.replace('`$ {process.env.NEXT_PUBLIC_API_URL || \n"http://localhost:8000"}', '')
            content = content.replace('`$ {process.env.NEXT_PUBLIC_API_URL || \r\n"http://localhost:8000"}', '')
            
            # Replace normal localhost
            content = content.replace('http://localhost:8000', '')

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
