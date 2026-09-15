"""
DoodleClash Portable Distribution Packager
Creates a standalone zip archive to easily share with friends
"""

import os
import zipfile

def package():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    zip_path = os.path.join(project_dir, "DoodleClash_Portable.zip")
    
    print(f"[*] Packaging DoodleClash into {zip_path}...")
    
    ignore_dirs = {".git", ".system_generated", "__pycache__", "tasks"}
    ignore_extensions = {".pyc", ".log", ".tmp"}

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(project_dir):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            for file in files:
                if file == "DoodleClash_Portable.zip":
                    continue
                ext = os.path.splitext(file)[1].lower()
                if ext in ignore_extensions:
                    continue
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, project_dir)
                zipf.write(file_path, rel_path)
                print(f"  + Added {rel_path}")

    print("\n=======================================================")
    print(f" [SUCCESS] Created: {zip_path}")
    print(f" Size: {os.path.getsize(zip_path) / 1024:.1f} KB")
    print(" You can now send this ZIP file to anyone!")
    print("=======================================================\n")

if __name__ == "__main__":
    package()
