#!/bin/bash
pgrep -lf 'node agent.js' | kill -9 $(cut -d ' ' -f1)
