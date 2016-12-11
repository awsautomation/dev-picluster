#!/bin/bash
pgrep -lf 'nodejs server.js' | kill -9 $(cut -d ' ' -f1)
