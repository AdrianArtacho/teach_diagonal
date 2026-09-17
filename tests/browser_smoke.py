#!/usr/bin/env python3
"""Run the current browser regression suite. The v1 harness remains in Git history."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('browser_v2.py')), run_name='__main__')
