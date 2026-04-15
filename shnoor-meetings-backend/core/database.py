import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs, unquote

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env file!")


def _parse_db_url(url: str) -> dict:
    """
    Manually parse DATABASE_URL into psycopg2 keyword args.
    This avoids issues with special chars (like &) in passwords
    being mangled by URL encoding.
    """
    parsed = urlparse(url)
    params = {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "dbname": parsed.path.lstrip("/"),
        "user": unquote(parsed.username),
        "password": unquote(parsed.password),
    }
    # Handle ?sslmode=require and similar query params
    if parsed.query:
        qs = parse_qs(parsed.query)
        if "sslmode" in qs:
            params["sslmode"] = qs["sslmode"][0]
    return params


def get_db_connection():
    """
    Returns a new psycopg2 connection to Supabase PostgreSQL.
    Use as a context manager or close() manually after use.
    """
    conn = psycopg2.connect(**_parse_db_url(DATABASE_URL), cursor_factory=RealDictCursor)
    conn.autocommit = False
    return conn


def init_db():
    """
    Creates all required tables if they don't already exist.
    Called once on application startup. Non-fatal — warns if DB unreachable.
    """
    try:
        conn = get_db_connection()
    except Exception as e:
        print(f"WARNING: DB not reachable at startup (tables already exist on Supabase): {e}")
        print("WARNING: Server will still start. Fix DATABASE_URL in .env to restore full DB access.")
        return
    try:
        with conn.cursor() as cur:
            # Meetings table — stores every room that was created
            cur.execute("""
                CREATE TABLE IF NOT EXISTS meetings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    room_id TEXT UNIQUE NOT NULL,
                    host_name TEXT NOT NULL DEFAULT 'Host',
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    ended_at TIMESTAMPTZ
                );
            """)

            # Meeting participants — every person who joins a room
            cur.execute("""
                CREATE TABLE IF NOT EXISTS meeting_participants (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    room_id TEXT NOT NULL REFERENCES meetings(room_id) ON DELETE CASCADE,
                    display_name TEXT NOT NULL,
                    joined_at TIMESTAMPTZ DEFAULT NOW(),
                    left_at TIMESTAMPTZ
                );
            """)

            # Calendar events — scheduled meetings with email invites
            cur.execute("""
                CREATE TABLE IF NOT EXISTS calendar_events (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    start_time TIMESTAMPTZ NOT NULL,
                    end_time TIMESTAMPTZ NOT NULL,
                    room_id TEXT NOT NULL,
                    host_name TEXT NOT NULL DEFAULT 'Host',
                    invite_emails TEXT[] DEFAULT '{}',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)

            conn.commit()
            print("OK: Supabase PostgreSQL tables initialised successfully.")
    except Exception as e:
        conn.rollback()
        print(f"❌ Database init error: {e}")
        raise
    finally:
        conn.close()
