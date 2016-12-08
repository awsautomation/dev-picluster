#!/bin/bash
cron
chown -R mysql:mysql /var/lib/mysql

if [ "$(ls -A /var/lib/mysql)" ]; then
   echo "Found existing MySQL Data......"
   mysqld_safe  --user root&
   sleep infinity
else
  echo "No existing database found......"
   mysql_install_db --user root
   mysqld_safe --user root&
   sleep 10
   mysqladmin -u root password $sql_password
   mysql -u root -$sql_password -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY '" + $sql_password + "' WITH GRANT OPTION; FLUSH PRIVILEGES;"
   sleep infinity
fi
