#!/bin/bash
cron
chown -R mysql:mysql /var/lib/mysql

if [ "$(ls -A /var/lib/mysql)" ]; then
   echo "Found existing MySQL Data......"
   mysqld_safe  --max_connect_errors=10000 --user root&
   sleep infinity
else
  echo "No existing database found......"
   mysql_install_db --user root
   mysqld_safe --max_connect_errors=10000 --user root&
   sleep 10
   mysqladmin -u root password $sql_password
   mysql -u root -p$sql_password -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY '" + $sql_password + "' WITH GRANT OPTION; FLUSH PRIVILEGES;"
   sleep infinity
fi
