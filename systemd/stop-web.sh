#!/bin/bash
pgrep -lf 'node webconsole.js' | kill -9 $(cut -d ' ' -f1)
