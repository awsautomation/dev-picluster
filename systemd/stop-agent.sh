#!/bin/bash
kill -9 $(ps aux | grep -i agent.js | tail -1 | cut -d ' ' -f7)
