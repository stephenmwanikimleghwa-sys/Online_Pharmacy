#!/usr/bin/env python3
import argparse
import sqlite3
import sys
from typing import Dict, List, Optional, Set, Tuple

import psycopg2
import psycopg2.extras
from psycopg2 import sql


def parse_args():
    parser = argparse.ArgumentParser(
        description='Copy data from a local SQLite DB into a remote PostgreSQL DB.'
    )
    parser.add_argument(
        '--sqlite-db',
        default='db.sqlite3',
        help='Path to the local SQLite database file.',
    )
    parser.add_argument(
        '--pg-uri',
        required=True,
        help='Postgres connection URI for the Supabase database.',
    )
    parser.add_argument(
        '--tables',
        default='',
        help='Comma-separated list of tables to migrate. Defaults to all tables except excluded ones.',
    )
    parser.add_argument(
        '--exclude',
        default='django_migrations,django_session,sqlite_sequence',
        help='Comma-separated list of tables to skip.',
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=200,
        help='Number of rows to insert per batch.',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show the planned table order and counts without inserting.',
    )
    return parser.parse_args()


def get_sqlite_tables(conn: sqlite3.Connection, include: Optional[Set[str]], exclude: Set[str]) -> List[str]:
    cur = conn.cursor()
    cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    tables = [row[0] for row in cur.fetchall()]
    if include:
        tables = [t for t in tables if t in include]
    tables = [t for t in tables if t not in exclude]
    return tables


def get_table_columns(conn: sqlite3.Connection, table: str) -> List[str]:
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info('{table}')")
    return [row[1] for row in cur.fetchall()]


def get_foreign_key_references(conn: sqlite3.Connection, table: str) -> Set[str]:
    cur = conn.cursor()
    cur.execute(f"PRAGMA foreign_key_list('{table}')")
    return {row[2] for row in cur.fetchall() if row[2]}


def topological_sort(tables: List[str], deps: Dict[str, Set[str]]) -> List[str]:
    resolved: List[str] = []
    unresolved = set(tables)
    temp: Set[str] = set()

    def visit(node: str):
        if node in resolved:
            return
        if node in temp:
            return
        temp.add(node)
        for dep in deps.get(node, set()):
            if dep in unresolved:
                visit(dep)
        temp.remove(node)
        resolved.append(node)

    for table in tables:
        visit(table)

    return [t for t in resolved if t in tables]


def estimate_row_counts(conn: sqlite3.Connection, tables: List[str]) -> Dict[str, int]:
    cur = conn.cursor()
    counts: Dict[str, int] = {}
    for table in tables:
        cur.execute(f"SELECT COUNT(*) FROM '{table}'")
        counts[table] = cur.fetchone()[0]
    return counts


def copy_table(
    sqlite_conn: sqlite3.Connection,
    pg_conn: psycopg2.extensions.connection,
    table: str,
    batch_size: int,
) -> int:
    columns = get_table_columns(sqlite_conn, table)
    if not columns:
        return 0

    sqlite_conn.row_factory = sqlite3.Row
    source_cur = sqlite_conn.cursor()
    source_cur.execute(f"SELECT * FROM '{table}'")

    insert_sql = sql.SQL('INSERT INTO {table} ({fields}) VALUES %s').format(
        table=sql.Identifier(table),
        fields=sql.SQL(', ').join([sql.Identifier(c) for c in columns]),
    )

    inserted = 0
    with pg_conn.cursor() as pg_cur:
        while True:
            rows = source_cur.fetchmany(batch_size)
            if not rows:
                break
            values = [tuple(row[col] for col in columns) for row in rows]
            psycopg2.extras.execute_values(pg_cur, insert_sql, values, page_size=batch_size)
            inserted += len(values)
    pg_conn.commit()
    return inserted


def update_serial_sequence(pg_conn: psycopg2.extensions.connection, table: str) -> None:
    with pg_conn.cursor() as cur:
        cur.execute("SELECT pg_get_serial_sequence(%s, 'id')", (table,))
        seq = cur.fetchone()[0]
        if not seq:
            return
        cur.execute(
            sql.SQL("SELECT setval(%s, GREATEST((SELECT COALESCE(MAX(id), 1) FROM {table}), 1), true)").format(
                table=sql.Identifier(table)
            ),
            (seq,),
        )
    pg_conn.commit()


def main():
    args = parse_args()
    exclude_tables = {t.strip() for t in args.exclude.split(',') if t.strip()}
    include_tables = {t.strip() for t in args.tables.split(',') if t.strip()} if args.tables else None

    sqlite_conn = sqlite3.connect(args.sqlite_db)
    try:
        tables = get_sqlite_tables(sqlite_conn, include_tables, exclude_tables)
        if not tables:
            print('No tables found for migration.')
            return

        deps: Dict[str, Set[str]] = {}
        for table in tables:
            deps[table] = get_foreign_key_references(sqlite_conn, table)

        ordered_tables = topological_sort(tables, deps)
        counts = estimate_row_counts(sqlite_conn, ordered_tables)

        print('Planned table order:')
        for table in ordered_tables:
            print(f'  - {table}: {counts.get(table, 0)} rows')

        if args.dry_run:
            print('Dry run complete.')
            return

        pg_conn = psycopg2.connect(args.pg_uri)
        try:
            for table in ordered_tables:
                count = copy_table(sqlite_conn, pg_conn, table, args.batch_size)
                print(f'Copied {count} rows into {table}.')
                update_serial_sequence(pg_conn, table)
        finally:
            pg_conn.close()
    finally:
        sqlite_conn.close()


if __name__ == '__main__':
    main()
