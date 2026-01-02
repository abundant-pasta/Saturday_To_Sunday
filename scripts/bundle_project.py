import os

# Configuration: Folders and files to IGNORE
IGNORE_DIRS = {
    'node_modules', '.git', '.next', 'dist', 'build', 'coverage', 
    '__pycache__', '.vercel', '.vscode'
}
IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 
    '.DS_Store', '.env.local', '.env', 'bundle_project.py', 
    'project_context.txt', 'next-env.d.ts'
}
# Only include these file extensions (to avoid binary files)
INCLUDE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.css', '.md', '.json', '.sql'
}

def get_project_context(output_file='project_context.txt'):
    # Get the current working directory
    root_dir = os.getcwd()
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Write a header
        outfile.write(f"PROJECT CONTEXT EXPORT\n")
        outfile.write(f"======================\n\n")
        
        # Walk through the directory
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Modify dirnames in-place to skip ignored directories
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
            
            for filename in filenames:
                if filename in IGNORE_FILES:
                    continue
                
                # Check extension
                _, ext = os.path.splitext(filename)
                if ext not in INCLUDE_EXTENSIONS:
                    continue
                
                filepath = os.path.join(dirpath, filename)
                relative_path = os.path.relpath(filepath, root_dir)
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                    # Write file metadata and content
                    outfile.write(f"--- START FILE: {relative_path} ---\n")
                    outfile.write(content)
                    outfile.write(f"\n--- END FILE: {relative_path} ---\n\n")
                    print(f"Added: {relative_path}")
                    
                except Exception as e:
                    print(f"Skipping {relative_path} due to error: {e}")

    print(f"\nSuccessfully created {output_file}")

if __name__ == "__main__":
    get_project_context()