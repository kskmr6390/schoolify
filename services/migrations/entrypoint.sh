#!/bin/sh
set -e

# Check current alembic revision
CURRENT=$(python -m alembic current 2>&1)

if echo "$CURRENT" | grep -qE "[0-9a-f]{4}"; then
    # alembic_version table exists and has a revision — just upgrade
    echo "Alembic version found. Running upgrade..."
else
    # No alembic_version table — tables were created directly by services.
    # Stamp head so alembic knows the schema is already in place.
    echo "No alembic revision found. Stamping head (tables pre-exist)..."
    python -m alembic stamp head
fi

python -m alembic upgrade head
echo "Migrations complete."
