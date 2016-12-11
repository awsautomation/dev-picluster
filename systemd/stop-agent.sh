#!/bin/bash
pgrep -lf 'nodejs agent.js' | kill -9 $(cut -d ' ' -f1)
