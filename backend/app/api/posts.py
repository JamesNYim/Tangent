from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.db.session import get_connection
from app.api.auth import get_current_user

router = APIRouter(prefix="/posts", tags=["posts"])

# Schemas

class PostCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)

class PostUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)

class PostOut(BaseModel):
    id: int
    user_id: int
    username: str
    content: str
    created_at: datetime
    updated_at: datetime

class User(BaseModel):
    id: int
    username: str

class FeedPage(BaseModel):
    feed: List[PostOut]
    next_cursor: Optional[int] = None

# ---- Helpers ----

def fetchone_to_dict(cur) -> Optional[dict]:
    row = cur.fetchone()
    if row is None:
        return None
    cols = [desc[0] for desc in cur.description]
    return dict(zip(cols, row))


def fetchall_to_dict(cur) -> List[dict]:
    rows = cur.fetchall()
    cols = [desc[0] for desc in cur.description]
    return [dict(zip(cols, row)) for row in rows]

# Routes

@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(payload: PostCreate, current_user: User=Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Inserting and creating a post
        cur.execute(
            """
            INSERT INTO posts (user_id, content)
            VALUES (%s, %s)
            RETURNING id  
            """,
            (current_user["id"], payload.content)
        )
        post_id = cur.fetchone()[0]

        # Crafting the final post info
        cur.execute(
            """
            SELECT
                p.id,
                p.content,
                p.created_at,
                p.updated_at,
                u.id as user_id,
                u.username
            FROM posts p
            JOIN users u ON u.id = p.user_id
            WHERE p.id = %s
            """,
            (post_id,),
        )

        post = fetchone_to_dict(cur)
        conn.commit()
        return post

    finally:
        cur.close()
        conn.close()

@router.get("", response_model=FeedPage)
def list_posts(limit: int = Query(20, ge=1, le=100), feed_cursor: Optional[int] = Query(None, ge=1)):

    conn = get_connection()
    cur = conn.cursor()

    try:
        if feed_cursor is None:
            cur.execute(
                """
                SELECT
                    p.id,
                    p.content,
                    p.created_at,
                    p.updated_at,
                    u.id as user_id,
                    u.username
                FROM posts p
                JOIN users u ON u.id = p.user_id
                ORDER by p.id DESC
                LIMIT %s 
                """,
                (limit,),
            )
        else:
            cur.execute(
                """
                SELECT
                    p.id,
                    p.content,
                    p.created_at,
                    p.updated_at,
                    u.id as user_id,
                    u.username
                FROM posts p
                JOIN users u ON u.id = p.user_id
                WHERE p.id < %s
                ORDER BY p.id DESC
                LIMIT %s
                """,
                (feed_cursor, limit),
            )
        feed = fetchall_to_dict(cur)
        
        next_cursor = None
        if len(feed) == limit:
            next_cursor = feed[-1]["id"]

        return {"feed": feed, "next_cursor": next_cursor}
    
    finally:
        cur.close()
        conn.close()

@router.get("/latest", response_model=FeedPage)
def latest_posts(since_id: int = Query(..., ge=1), limit: int = Query(50, ge=1, le=100)):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT
                p.id,
                p.content,
                p.created_at,
                p.updated_at,
                u.id as user_id,
                u.username
            FROM posts p
            JOIN users u ON u.id = p.user_id
            WHERE p.id > %s
            ORDER BY p.id DESC
            LIMIT %s
            """,
            (since_id, limit),
        )
        feed = fetchall_to_dict(cur)
        return feed
    finally:
        cur.close()
        conn.close()

@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT
                p.id,
                p.content,
                p.created_at,
                p.updated_at,
                u.id as user_id,
                u.username
            FROM posts p
            JOIN users u ON u.id = p.user_id
            WHERE p.id = %s
            """,
            (post_id,),
        )

        post = fetchone_to_dict(cur)
        return post

    finally:
        cur.close()
        conn.close()

@router.put("/{post_id}", response_model=PostOut)
def update_post(post_id: int, payload: PostUpdate, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Ownership check
        cur.execute(
            """
            SELECT user_id FROM posts WHERE id = %s
            """,
            (post_id,)
        )

        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Post not found")

        post_owner_id = row[0]
        if (post_owner_id != current_user["id"]):
            raise HTTPException(status_code=403, detail="Not allowed")

        cur.execute(
            """
            UPDATE posts p
            SET content = %s, updated_at = NOW()
            WHERE p.id = %s
            """,
            (payload.content, post_id)
        )

        cur.execute(
            """
            SELECT
                p.id,
                p.content,
                p.created_at,
                p.updated_at,
                u.id as user_id,
                u.username
            FROM posts p
            JOIN users u ON u.id = p.user_id
            WHERE p.id = %s
            """,
            (post_id,),
        )

        post = fetchone_to_dict(cur)
        conn.commit()
        return post
    
    finally:
        cur.close()
        conn.close()

@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Ownership check
        cur.execute(
            """
            SELECT user_id FROM posts WHERE id = %s
            """,
            (post_id,)
        )

        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Post not found")

        post_owner_id = row[0]
        if (post_owner_id != current_user["id"]):
            raise HTTPException(status_code=403, detail="Not allowed")

        cur.execute(
            """
            DELETE FROM posts
            WHERE id = %s
            """,
            (post_id,),
        )
        conn.commit()
        return None

    finally:
        cur.close()
        conn.close()
