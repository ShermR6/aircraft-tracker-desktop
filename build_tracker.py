#!/usr/bin/env python3
"""
build_tracker.py
Run this from the repo root to compile the Python tracker into a binary.

Usage:
  python build_tracker.py

Output:
  dist/tracker           (Mac/Linux)
  dist/tracker.exe       (Windows)

Then copy the output to resources/ in your Electron project before packaging.
"""

import subprocess
import sys
import shutil
import os

TRACKER_SCRIPT = 'tracker/aviation_tracker_discord_bot.py'
OUTPUT_NAME = 'tracker'
RESOURCES_DIR = 'resources'

def run(cmd):
    print(f'\n$ {" ".join(cmd)}')
    result = subprocess.run(cmd, check=True)
    return result

def main():
    # Make sure pyinstaller is available
    try:
        import PyInstaller
    except ImportError:
        print('Installing PyInstaller...')
        run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'])

    # Install tracker dependencies
    print('\nInstalling tracker dependencies...')
    run([sys.executable, '-m', 'pip', 'install', 'requests', 'discord.py'])

    # Build the binary
    print(f'\nBuilding {TRACKER_SCRIPT} -> dist/{OUTPUT_NAME}...')
    run([
        sys.executable, '-m', 'PyInstaller',
        '--onefile',                        # single binary
        '--name', OUTPUT_NAME,
        '--distpath', 'dist',
        '--workpath', 'build/pyinstaller',
        '--specpath', 'build/pyinstaller',
        '--noconfirm',
        '--clean',
        '--log-level', 'WARN',
        TRACKER_SCRIPT,
    ])

    # Copy to Electron resources folder
    ext = '.exe' if sys.platform == 'win32' else ''
    src = os.path.join('dist', f'{OUTPUT_NAME}{ext}')
    
    os.makedirs(RESOURCES_DIR, exist_ok=True)
    dst = os.path.join(RESOURCES_DIR, f'{OUTPUT_NAME}{ext}')
    
    shutil.copy2(src, dst)
    print(f'\n✓ Binary copied to {dst}')
    print(f'  Size: {os.path.getsize(dst) / 1024 / 1024:.1f} MB')
    print('\nDone! Run npm run package to build the Electron installer.')

if __name__ == '__main__':
    main()
