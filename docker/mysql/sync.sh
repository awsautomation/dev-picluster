#!/bin/bash
mysqldump -u root -p$sql_password --all-databases > /saves/database-`date +%Y-%m-%d`.sql
