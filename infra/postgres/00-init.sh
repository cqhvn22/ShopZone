#!/bin/sh
set -eu
for context in auth order inventory payment notification; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -v db_password="$SHOPZONE_DB_PASSWORD" -v db_user="${context}_user" -v db_name="${context}_db" <<'SQL'
CREATE ROLE :"db_user" LOGIN PASSWORD :'db_password';
CREATE DATABASE :"db_name" OWNER :"db_user";
REVOKE CONNECT ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db_name" TO :"db_user";
SQL
done
