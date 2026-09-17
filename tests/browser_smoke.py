#!/usr/bin/env python3
"""Run both the existing interaction regressions and the new repeat/preset checks."""
import runpy
from pathlib import Path
for script in ['browser_v2.py', 'browser_v3.py']:
    runpy.run_path(str(Path(__file__).with_name(script)), run_name='__main__')
