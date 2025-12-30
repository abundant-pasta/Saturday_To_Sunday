import os

# --- CONFIGURATION ---
OUTPUT_FILE = "full_project_code.txt"

# Folders to completely ignore (The "Heavy" Stuff)
IGNORE_DIRS = {
    'node_modules', 'venv', '.git', '.next', '.vscode', 
    '__pycache__', 'dist', 'build', '.idea'
}

# File extensions to include (Source Code Only)
INCLUDE_EXTS = {
    '.ts', '.tsx', '.js', '.jsx', '.py', '.css', '.sql', 
    '.json', '.md', '.env.local'
}

# Specific files to ignore even if they match extensions
IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
}

def pack_codebase():
    root_dir = os.getcwd()
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # Write a header
        outfile.write(f"PROJECT DUMP\n")
        outfile.write("==================================================\n\n")

        for dirpath, dirnames, filenames in os.walk(root_dir):
            # 1. Modify dirnames in-place to skip ignored directories
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

            for filename in filenames:
                # 2. Skip ignored specific files
                if filename in IGNORE_FILES:
                    continue

                # 3. Check extension
                _, ext = os.path.splitext(filename)
                if ext.lower() not in INCLUDE_EXTS:
                    continue

                # 4. Read and Write File Content
                file_path = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(file_path, root_dir)

                print(f"Packing: {rel_path}")

                outfile.write(f"FILE_START: {rel_path}\n")
                outfile.write("--------------------------------------------------\n")
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as infile:
                        outfile.write(infile.read())
                except Exception as e:
                    outfile.write(f"Error reading file: {e}")

                outfile.write("\n\nFILE_END\n")
                outfile.write("==================================================\n\n")

    print(f"\n✅ Done! All code saved to: {OUTPUT_FILE}")
    print(f"   Size: {os.path.getsize(OUTPUT_FILE) / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    pack_codebase()