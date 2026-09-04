#!/bin/sh
# Applies any pending migrations, then hands off to the server.
#
# `migrate deploy` -- never `migrate dev`. deploy only applies the migration
# files already committed under prisma/migrations and never invents or resets
# anything, which is the only safe behaviour against a database holding data.
set -e

if [ -z "$DATABASE_URL" ]; then
    echo "entrypoint: DATABASE_URL is not set" >&2
    exit 1
fi

# Only meaningful for the SQLite file:// URLs this app uses. A fresh database
# means nobody can log in yet, so seed it once to get the demo accounts in.
DB_PATH=""
case "$DATABASE_URL" in
    file:*) DB_PATH="${DATABASE_URL#file:}" ;;
esac

FRESH_DB=0
if [ -n "$DB_PATH" ] && [ ! -f "$DB_PATH" ]; then
    FRESH_DB=1
fi

echo "entrypoint: applying migrations"
node /opt/prisma/node_modules/prisma/build/index.js migrate deploy

if [ "$FRESH_DB" = "1" ] && [ -f prisma/seed.js ]; then
    echo "entrypoint: new database -- seeding"
    node prisma/seed.js
fi

exec "$@"
