#!/bin/bash
pgrep -lf 'node server.js' | kill -9 $(cut -d ' ' -f1)
