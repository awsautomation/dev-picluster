#!/bin/bash
pgrep -lf 'nodejs webconsole.js' | kill -9 $(cut -d ' ' -f1)
