import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import resend
from core.database import get_db_connection
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY", "")
APP_URL = os.getenv("APP_URL", "http://localhost:5173")

router = APIRouter(
    prefix="/api/calendar",
    tags=["Calendar"]
)


class CalendarEvent(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    start_time: str
    end_time: str
    room_id: Optional[str] = None
    host_name: Optional[str] = "Host"
    invite_emails: Optional[List[str]] = []


class CreateEventResponse(BaseModel):
    id: str
    room_id: str
    message: str


def send_invite_emails(event_id: str, title: str, description: str, start_time: str, end_time: str, room_id: str, host_name: str, invite_emails: List[str]):
    """
    Sends calendar invite emails via Resend.com to each invitee.
    """
    if not resend.api_key or resend.api_key == "re_REPLACE_WITH_YOUR_KEY":
        print("⚠️  Resend API key not set — skipping email invites.")
        return

    join_url = f"{APP_URL}/room/{room_id}"

    for email in invite_emails:
        try:
            resend.Emails.send({
                "from": "Shnoor Meetings <onboarding@resend.dev>",
                "to": [email],
                "subject": f"You're invited: {title}",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #1d4ed8; font-size: 24px; margin: 0;">Shnoor Meetings</h1>
                    </div>
                    <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                        <h2 style="color: #1f2937; margin-top: 0;">{title}</h2>
                        <p style="color: #6b7280; line-height: 1.6;">{description or 'You have been invited to a meeting.'}</p>
                        
                        <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 120px;">Hosted by:</td>
                                <td style="padding: 8px 0; color: #1f2937;">{host_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Starts:</td>
                                <td style="padding: 8px 0; color: #1f2937;">{start_time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Ends:</td>
                                <td style="padding: 8px 0; color: #1f2937;">{end_time}</td>
                            </tr>
                        </table>
                        
                        <div style="text-align: center; margin-top: 24px;">
                            <a href="{join_url}" style="display: inline-block; background: #1d4ed8; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                Join Meeting
                            </a>
                        </div>
                        
                        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
                            Or paste this link: <a href="{join_url}" style="color: #1d4ed8;">{join_url}</a>
                        </p>
                    </div>
                </div>
                """
            })
            print(f"✅ Invite sent to {email}")
        except Exception as e:
            print(f"⚠️  Failed to send invite to {email}: {e}")


@router.get("/events", response_model=List[CalendarEvent])
async def get_events():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id::TEXT, title, description, start_time::TEXT, end_time::TEXT, room_id, host_name, invite_emails FROM calendar_events ORDER BY start_time ASC")
            rows = cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch events: {e}")
    finally:
        conn.close()

    return [
        CalendarEvent(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            start_time=row["start_time"],
            end_time=row["end_time"],
            room_id=row["room_id"],
            host_name=row["host_name"],
            invite_emails=list(row["invite_emails"]) if row["invite_emails"] else []
        )
        for row in rows
    ]


@router.post("/events", response_model=CreateEventResponse)
async def create_event(event: CalendarEvent):
    event_id = str(uuid.uuid4())
    room_id = event.room_id or str(uuid.uuid4())
    invite_emails = event.invite_emails or []

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO calendar_events (id, title, description, start_time, end_time, room_id, host_name, invite_emails)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (event_id, event.title, event.description, event.start_time, event.end_time, room_id, event.host_name, invite_emails)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create event: {e}")
    finally:
        conn.close()

    # Send invite emails asynchronously after saving
    if invite_emails:
        send_invite_emails(
            event_id=event_id,
            title=event.title,
            description=event.description or "",
            start_time=event.start_time,
            end_time=event.end_time,
            room_id=room_id,
            host_name=event.host_name or "Host",
            invite_emails=invite_emails
        )

    return {"id": event_id, "room_id": room_id, "message": f"Event created. Invites sent to {len(invite_emails)} people."}


@router.delete("/events/{id}")
async def delete_event(id: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM calendar_events WHERE id = %s", (id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete event: {e}")
    finally:
        conn.close()
    return {"message": "Event deleted successfully"}


@router.put("/events/{id}")
async def update_event(id: str, event: CalendarEvent):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE calendar_events 
                SET title = %s, description = %s, start_time = %s, end_time = %s, room_id = %s
                WHERE id = %s
                """,
                (event.title, event.description, event.start_time, event.end_time, event.room_id, id)
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Event not found")
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update event: {e}")
    finally:
        conn.close()
    return {"message": "Event updated successfully"}
