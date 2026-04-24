#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE cabgo_auth;
    CREATE DATABASE cabgo_booking;
    CREATE DATABASE cabgo_driver;
    CREATE DATABASE cabgo_payment;
EOSQL
