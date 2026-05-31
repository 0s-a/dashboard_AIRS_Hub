import os
import re

# Base directories to scan
DIRS = ['app', 'components', 'lib', 'docs']
EXTS = ('.ts', '.tsx', '.js', '.jsx', '.md', '.json')

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Failed to read {filepath}: {e}")
        return

    original_content = content

    # English replacements
    # Using \b for word boundaries. Using negative lookahead/behind to prevent matching something like "personal"
    content = re.sub(r'\bpersons\b', 'customers', content)
    content = re.sub(r'\bPersons\b', 'Customers', content)
    content = re.sub(r'\bperson\b', 'customer', content)
    content = re.sub(r'\bPerson\b', 'Customer', content)
    content = re.sub(r'\bPERSONS\b', 'CUSTOMERS', content)
    content = re.sub(r'\bPERSON\b', 'CUSTOMER', content)

    # Note: the above \b matches word boundaries.
    # What about hyphenated words? e.g., 'recent-persons' -> 'recent-customers'. \b covers hyphens.

    # Arabic replacements
    # Using negative lookarounds for Arabic letters to act as word boundaries.
    ar_word_boundary = r'(?<![أ-يa-zA-Z0-9_])'
    ar_word_boundary_end = r'(?![أ-يa-zA-Z0-9_])'

    replacements_ar = {
        'الأشخاص': 'العملاء',
        'الاشخاص': 'العملاء',
        'للأشخاص': 'للعملاء',
        'للاشخاص': 'للعملاء',
        'شخصاً': 'عميلاً',
        'شخصا': 'عميلا',
        'للشخص': 'للعميل',
        'بالشخص': 'بالعميل',
        'الشخص': 'العميل',
        'شخص': 'عميل',
        'أشخاص': 'عملاء',
        'اشخاص': 'عملاء',
    }

    for old, new in replacements_ar.items():
        pattern = ar_word_boundary + old + ar_word_boundary_end
        content = re.sub(pattern, new, content)

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

print("Done replacing.")
