"""Stored photos are deleted once nothing uses them, and only photos this app stored."""
import io
import json
from pathlib import Path

import httpx
import pytest
from PIL import Image

from app.core.config import settings
from app.services import images

API = "/api/v1"


@pytest.fixture
def local_uploads(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "CLOUDINARY_URL", "")


def _jpeg() -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (64, 48), (10, 120, 90)).save(out, format="JPEG")
    return out.getvalue()


async def _upload(client, headers, purpose="post") -> str:
    r = await client.post(f"{API}/uploads/images", headers=headers, data={"purpose": purpose},
                          files={"file": ("p.jpg", _jpeg(), "image/jpeg")})
    assert r.status_code == 201, r.text
    return r.json()["url"]


def _exists(url: str) -> bool:
    return (Path(settings.MEDIA_DIR) / url.rsplit("/", 1)[1]).is_file()


async def _post(client, headers, cover, step_image=None):
    body = {"title": "Pipes", "caption": "x", "media": [{"url": cover, "type": "image"}]}
    if step_image:
        body |= {"post_type": "task_walkthrough", "task_details": {
            "problem_statement": "Leak", "category": "Plumbing", "difficulty": "beginner", "estimated_time_mins": 30,
            "tools_used": [], "steps": [{"step_number": 1, "title": "Shut off", "description": "Valves", "image_url": step_image}],
        }}
    r = await client.post(f"{API}/posts", headers=headers, json=body)
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def test_deleting_a_post_deletes_its_photos(client, auth_headers, local_uploads):
    cover, step = await _upload(client, auth_headers), await _upload(client, auth_headers, "step")
    pid = await _post(client, auth_headers, cover, step)
    assert _exists(cover) and _exists(step)
    assert (await client.delete(f"{API}/posts/{pid}", headers=auth_headers)).status_code == 204
    assert not _exists(cover) and not _exists(step)


async def test_replacing_a_cover_deletes_only_the_old_one(client, auth_headers, local_uploads):
    old, new = await _upload(client, auth_headers), await _upload(client, auth_headers)
    pid = await _post(client, auth_headers, old)
    r = await client.patch(f"{API}/posts/{pid}", headers=auth_headers, json={"media": [{"url": new, "type": "image"}]})
    assert r.status_code == 200, r.text
    assert not _exists(old) and _exists(new)
    # an edit that doesn't touch photos deletes nothing
    await client.patch(f"{API}/posts/{pid}", headers=auth_headers, json={"title": "Pipes, again"})
    assert _exists(new)


async def test_a_photo_still_used_elsewhere_is_kept(client, auth_headers, local_uploads):
    shared = await _upload(client, auth_headers)
    first = await _post(client, auth_headers, shared)
    await _post(client, auth_headers, shared)  # the same address pasted into a second post
    await client.delete(f"{API}/posts/{first}", headers=auth_headers)
    assert _exists(shared)


async def test_links_to_other_sites_are_never_touched(client, auth_headers, local_uploads, monkeypatch):
    called = []
    monkeypatch.setattr(images, "delete_stored_images", lambda urls: called.append(urls))
    pid = await _post(client, auth_headers, "https://example.com/media/AbCdEfGhIjKlMnOp.webp")
    assert (await client.delete(f"{API}/posts/{pid}", headers=auth_headers)).status_code == 204
    assert called == []


async def test_stories_avatars_and_accounts(client, auth_headers, local_uploads, signup_payload):
    story_photo = await _upload(client, auth_headers, "story")
    sid = (await client.post(f"{API}/stories", headers=auth_headers, json={"media_url": story_photo, "caption": "hi"})).json()["id"]
    assert (await client.delete(f"{API}/stories/{sid}", headers=auth_headers)).status_code == 204
    assert not _exists(story_photo)

    first, second = await _upload(client, auth_headers, "avatar"), await _upload(client, auth_headers, "avatar")
    await client.patch(f"{API}/auth/me", headers=auth_headers, json={"avatar_url": first})
    await client.patch(f"{API}/auth/me", headers=auth_headers, json={"avatar_url": second})
    assert not _exists(first) and _exists(second)

    cover = await _upload(client, auth_headers)
    await _post(client, auth_headers, cover)
    r = await client.post(f"{API}/auth/me/delete", headers=auth_headers, json={"password": signup_payload["password"]})
    assert r.status_code == 204
    assert not _exists(second) and not _exists(cover)


async def test_moderators_removing_a_post_deletes_its_photos(client, seeded, auth_headers, local_uploads, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_USERNAMES", ["elena_lawyer"])
    cover = await _upload(client, auth_headers)
    pid = await _post(client, auth_headers, cover)
    sarah = {"Authorization": "Bearer " + (await client.post(f"{API}/auth/login", json={
        "username_or_email": "sarah_plumber", "password": "demo1234"})).json()["access_token"]}
    await client.post(f"{API}/moderation/reports", headers=sarah, json={"target_type": "post", "target_id": pid, "reason": "spam"})
    elena = {"Authorization": "Bearer " + (await client.post(f"{API}/auth/login", json={
        "username_or_email": "elena_lawyer", "password": "demo1234"})).json()["access_token"]}
    r = await client.post(f"{API}/moderation/reports/resolve", headers=elena,
                          json={"target_type": "post", "target_id": pid, "action": "remove"})
    assert r.status_code == 200, r.text
    assert not _exists(cover)


# ---- Cloudinary ----

def test_only_our_cloudinary_photos_are_recognized(monkeypatch):
    monkeypatch.setattr(settings, "CLOUDINARY_URL", "cloudinary://123456:s3cr3t@prologue-cloud")
    ours = "https://res.cloudinary.com/prologue-cloud/image/upload/v1731999999/prologue/post/AbCdEf123.webp"
    assert images.cloudinary_public_id(ours) == "prologue/post/AbCdEf123"
    assert images.cloudinary_public_id("https://res.cloudinary.com/someone-else/image/upload/v1/prologue/post/x.webp") is None
    assert images.cloudinary_public_id("https://res.cloudinary.com/prologue-cloud/image/upload/v1/their-folder/x.webp") is None
    assert images.cloudinary_public_id("https://images.unsplash.com/photo-1.jpg") is None


async def test_cloudinary_photos_are_destroyed_with_a_signed_request(monkeypatch, caplog):
    monkeypatch.setattr(settings, "CLOUDINARY_URL", "cloudinary://123456:s3cr3t@prologue-cloud")
    seen = []

    def handler(request: httpx.Request):
        seen.append((str(request.url), dict(httpx.QueryParams(request.content.decode()))))
        return httpx.Response(200, json={"result": "ok"})

    real = httpx.AsyncClient
    monkeypatch.setattr(images.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(handler), **kw))
    await images.delete_stored_images(["https://res.cloudinary.com/prologue-cloud/image/upload/v17/prologue/story/Zz9.webp"])
    url, form = seen[0]
    assert url == "https://api.cloudinary.com/v1_1/prologue-cloud/image/destroy"
    assert form["public_id"] == "prologue/story/Zz9" and form["api_key"] == "123456"
    assert form["signature"] == images.cloudinary_signature(
        {"public_id": form["public_id"], "timestamp": form["timestamp"]}, "s3cr3t")

    # A failure is logged, never raised
    monkeypatch.setattr(images.httpx, "AsyncClient", lambda **kw: real(
        transport=httpx.MockTransport(lambda req: httpx.Response(500, text=json.dumps({"error": "boom"}))), **kw))
    await images.delete_stored_images(["https://res.cloudinary.com/prologue-cloud/image/upload/v1/prologue/post/Q1.webp"])
    assert "Could not delete the stored photo" in caplog.text
