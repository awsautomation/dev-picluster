#!/bin/bash
kill -9 $(ps aux | grep -i server.js | tail -1 | cut -d ' ' -f7)
