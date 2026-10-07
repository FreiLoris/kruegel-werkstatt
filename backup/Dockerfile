# Backup container: the PostgreSQL image (same version as the database → pg_dump fits) plus our
# scripts. Its own image so the NAS needs no copy of the scripts – only compose.yaml and .env.
FROM postgres:18-alpine

COPY backup.sh restore.sh entrypoint.sh /backup/

ENTRYPOINT ["sh", "/backup/entrypoint.sh"]
