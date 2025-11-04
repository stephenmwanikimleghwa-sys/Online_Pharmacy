#!/usr/bin/env python3
"""
Create a sandboxed commented copy of the workspace at ./sandbox_commented
Usage: python3 comment_workspace.py

This script will:
- Walk the repository root (current directory assumed to be repo root)
- Skip .git, sandbox_commented, venv, node_modules
- For text/code files, produce a commented version in sandbox_commented preserving tree
- For binary files, copy them as-is

Comment tokens used by extension:
- .py, .sh, .yml, .yaml, .env, .ini, .cfg, .md -> '# '
- .js, .jsx, .ts, .tsx, .json -> '// '
- .css, .scss, .less -> '/* ' prefix per line and ' */' suffix at end
- .html, .htm -> '<!-- ' prefix per line and ' -->' suffix at end
- Others -> '// ' fallback

Be careful: this produces commented files (not runnable). To re-enable a file, copy it back from the original workspace or uncomment lines.
"""

import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "sandbox_commented"
SKIP_DIRS = {'.git', 'sandbox_commented', 'venv', 'node_modules', '.venv'}

TEXT_PREFIX = {
    '.py': '# ',
    '.sh': '# ',
    '.yml': '# ',
    '.yaml': '# ',
    '.env': '# ',
    '.ini': '# ',
    '.cfg': '# ',
    '.md': '# ',
    '.txt': '# ',

    '.js': '// ',
    '.jsx': '// ',
    '.ts': '// ',
    '.tsx': '// ',
    '.json': '// ',

    '.css': '/* ',
    '.scss': '/* ',
    '.less': '/* ',

    '.html': '<!-- ',
    '.htm': '<!-- ',
}

# Helper to detect binary
def is_binary_string(bytes_data):
    # crude test
    textchars = bytearray({7,8,9,10,12,13,27} | set(range(0x20, 0x100)) - {0x7f})
    return bool(bytes_data.translate(None, textchars))

if OUT.exists():
    print(f"Removing existing {OUT}")
    shutil.rmtree(OUT)

print(f"Creating sandbox at {OUT}")

for dirpath, dirnames, filenames in os.walk(ROOT):
    # skip directories
    parts = Path(dirpath).relative_to(ROOT).parts
    if any(p in SKIP_DIRS for p in parts):
        continue
    # create corresponding dir in OUT
    rel_dir = Path(dirpath).relative_to(ROOT)
    target_dir = OUT / rel_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    for fname in filenames:
        src_path = Path(dirpath) / fname
        # skip this script output file if encountered
        if src_path.resolve() == (ROOT / 'comment_workspace.py').resolve():
            continue
        rel_file = (rel_dir / fname)
        dst_path = OUT / rel_file
        # read bytes
        try:
            with open(src_path, 'rb') as f:
                data = f.read()
        except Exception as e:
            print(f"Skipping {src_path}: read error: {e}")
            continue
        # detect binary
        if len(data) > 0 and is_binary_string(data[:1024]):
            # copy binary as-is
            try:
                with open(dst_path, 'wb') as out_f:
                    out_f.write(data)
                # copy permissions
                shutil.copystat(src_path, dst_path)
            except Exception as e:
                print(f"Failed copying binary {src_path}: {e}")
            continue
        # text file: decode
        try:
            text = data.decode('utf-8')
        except UnicodeDecodeError:
            try:
                text = data.decode('latin-1')
            except Exception:
                print(f"Skipping {src_path}: cannot decode")
                continue
        ext = src_path.suffix.lower()
        prefix = TEXT_PREFIX.get(ext, None)
        if prefix is None:
            prefix = '// '
        # special handling for block comment types
        if prefix == '/* ':
            # wrap entire content in block comment
            commented = '/*\n' + text + '\n*/\n'
        elif prefix == '<!-- ':
            commented = '<!--\n' + text + '\n-->\n'
        else:
            # prefix each line
            lines = text.splitlines()
            if len(lines) == 0:
                commented = prefix + '\n'
            else:
                commented = '\n'.join(prefix + line for line in lines) + '\n'
        try:
            with open(dst_path, 'w', encoding='utf-8') as out_f:
                out_f.write(commented)
        except Exception as e:
            print(f"Failed writing {dst_path}: {e}")

print('Done. Sandbox created at sandbox_commented/')
print('To enable features, copy/uncomment files from the sandbox back into the main workspace.')
