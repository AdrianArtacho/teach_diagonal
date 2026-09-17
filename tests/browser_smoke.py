#!/usr/bin/env python3
"""Run all interaction regressions, including fullscreen and starter-pack checks."""
import runpy
from pathlib import Path
for script in ['browser_v2.py', 'browser_v3.py', 'browser_v4.py']:
    runpy.run_path(str(Path(__file__).with_name(script)), run_name='__main__')
