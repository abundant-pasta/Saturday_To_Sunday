import os
import re

# --- CONFIGURATION ---

# Directories to ignore (to save time and avoid false positives)
IGNORED_DIRS = {
    '.git', 'node_modules', '.next', 'dist', 'build', 'venv', '__pycache__', '.vscode', '.idea'
}

# Files to ignore (e.g., lock files or this script itself)
IGNORED_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'security_scan.py', '.DS_Store'
}

# Regex patterns to look for
PATTERNS = [
    (r'service_role', "Supabase Service Role Key (CRITICAL - Do not commit!)"),
    (r'postgres://', "Database Connection String"),
    (r'sk-[a-zA-Z0-9]{20,}', "OpenAI/Stripe Secret Key"),
    (r'AKIA[0-9A-Z]{16}', "AWS Access Key"),
    (r'(?i)api_key\s*[:=]\s*[\'"][a-zA-Z0-9_\-]{10,}[\'"]', "Generic API Key assignment"),
    (r'(?i)secret\s*[:=]\s*[\'"][a-zA-Z0-9_\-]{10,}[\'"]', "Generic Secret assignment"),
    # Check for hardcoded secrets in Next.js public vars
    (r'NEXT_PUBLIC_[A-Z_]*SECRET', "Secret detected in NEXT_PUBLIC variable (Exposed to browser!)"),
    (r'NEXT_PUBLIC_[A-Z_]*PASSWORD', "Password detected in NEXT_PUBLIC variable"),
]

def is_ignored(path):
    parts = path.split(os.sep)
    for part in parts:
        if part in IGNORED_DIRS:
            return True
    return False

def scan_file(filepath):
    issues = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for i, line in enumerate(f, 1):
                # Skip lines that look like environment variable examples or comments
                if line.strip().startswith('#'):
                    continue
                
                for pattern, description in PATTERNS:
                    if re.search(pattern, line):
                        # Truncate line for display if it's too long
                        display_line = (line.strip()[:75] + '..') if len(line) > 75 else line.strip()
                        issues.append(f"  Line {i}: {description}\n    Matched: {display_line}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    
    return issues

def check_gitignore():
    print("\n--- Checking .gitignore ---")
    if not os.path.exists('.gitignore'):
        print("❌ WARNING: No .gitignore file found!")
        return

    with open('.gitignore', 'r') as f:
        content = f.read()
    
    # Check for .env files
    if '.env' not in content and '.env.local' not in content:
        print("❌ WARNING: .env files are NOT listed in .gitignore.")
        print("   Please add '.env' and '.env.local' to your .gitignore file immediately.")
    else:
        print("✅ .env files appear to be ignored.")

def main():
    root_dir = os.getcwd()
    print(f"Scanning directory: {root_dir}")
    print("---------------------------------------------------")
    
    found_issues = False

    for dirpath, _, filenames in os.walk(root_dir):
        if is_ignored(dirpath):
            continue

        for filename in filenames:
            if filename in IGNORED_FILES:
                continue
            
            # Skip images/binary files by extension
            if filename.endswith(('.png', '.jpg', '.jpeg', '.ico', '.woff', '.woff2', '.ttf')):
                continue

            filepath = os.path.join(dirpath, filename)
            issues = scan_file(filepath)
            
            if issues:
                found_issues = True
                rel_path = os.path.relpath(filepath, root_dir)
                
                # Special check: If we find secrets in a file named .env*, that's expected
                # We only warn if those files are NOT ignored by git (handled by check_gitignore)
                if filename.startswith('.env'):
                    continue

                print(f"\n📁 File: {rel_path}")
                for issue in issues:
                    print(issue)

    check_gitignore()
    
    print("\n---------------------------------------------------")
    if found_issues:
        print("⚠️  Potential vulnerabilities found. Please review the output above.")
    else:
        print("✅ Scan complete. No obvious hardcoded secrets found in code files.")

if __name__ == "__main__":
    main()