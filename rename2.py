import os
import re

DIRS = ['app', 'components', 'lib', 'docs']
EXTS = ('.ts', '.tsx', '.js', '.jsx', '.md', '.json')

# Words to ignore
IGNORE_WORDS = [
    'personalize', 'Personalize', 'personalized', 'Personalized',
    'personalise', 'Personalise', 'personalised', 'Personalised',
    'personnel', 'Personnel', 'impersonate', 'Impersonate',
    'personalizes', 'Personalizes'
]

def replacer(match):
    word = match.group(0)
    
    # Check if word contains any of the ignored words
    for ignore in IGNORE_WORDS:
        if ignore.lower() in word.lower():
            return word

    # Replace 'persons' -> 'customers'
    word = word.replace('persons', 'customers')
    word = word.replace('Persons', 'Customers')
    word = word.replace('PERSONS', 'CUSTOMERS')

    # Replace 'person' -> 'customer'
    word = word.replace('person', 'customer')
    word = word.replace('Person', 'Customer')
    word = word.replace('PERSON', 'CUSTOMER')

    return word

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return

    original_content = content

    # Match any word that contains 'person' (case-insensitive)
    # word characters: a-zA-Z0-9_
    pattern = r'\b[a-zA-Z0-9_]*[pP][eE][rR][sS][oO][nN][a-zA-Z0-9_]*\b'
    
    content = re.sub(pattern, replacer, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for d in DIRS:
    if not os.path.exists(d):
        continue
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith(EXTS):
                replace_in_file(os.path.join(root, file))

print("Done renaming part 2.")
