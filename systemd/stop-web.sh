#!/bin/bash
kill -9 $(ps aux | grep -i webconsole.js | tail -1 | cut -d ' ' -f7)
