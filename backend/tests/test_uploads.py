import io
from email.parser import BytesParser
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
    """The tests run with production settings; uploads to a local folder are a development feature."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "CLOUDINARY_URL", "")


def _photo(size=(400, 200), fmt="JPEG", orientation=None, gps=False, mode="RGB") -> bytes:
    img = Image.new(mode, size, (200, 30, 30) if mode == "RGB" else (200, 30, 30, 128))
    exif = Image.Exif()
    if orientation:
        exif[0x0112] = orientation
    if gps:
        exif[0x8825] = {1: "N", 2: (32.0, 4.0, 50.0), 3: "E", 4: (34.0, 46.0, 50.0)}  # somewhere in Tel Aviv
    out = io.BytesIO()
    kwargs = {"exif": exif.tobytes()} if (orientation or gps) and fmt in ("JPEG", "WEBP", "PNG") else {}
    img.save(out, format=fmt, **kwargs)
    return out.getvalue()


async def _upload(client, headers, data, purpose="post", name="photo.jpg", mime="image/jpeg"):
    return await client.post(f"{API}/uploads/images", headers=headers, data={"purpose": purpose},
                             files={"file": (name, data, mime)})


def _stored(url: str) -> Image.Image:
    return Image.open(Path(settings.MEDIA_DIR) / url.rsplit("/", 1)[1])


async def test_a_phone_photo_is_turned_upright_and_loses_its_location(client, auth_headers, local_uploads):
    original = _photo(size=(400, 200), orientation=6, gps=True)  # 6 = "rotate 90° to display"
    with Image.open(io.BytesIO(original)) as check:
        assert check.getexif().get(0x8825)  # the test photo really carries a location

    r = await _upload(client, auth_headers, original)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["url"].startswith("http://test/media/") and body["url"].endswith(".webp")
    assert (body["width"], body["height"]) == (200, 400)  # upright

    stored_bytes = (Path(settings.MEDIA_DIR) / body["url"].rsplit("/", 1)[1]).read_bytes()
    with Image.open(io.BytesIO(stored_bytes)) as img:
        assert img.format == "WEBP" and img.size == (200, 400)
        assert not img.getexif() and "exif" not in img.info  # no location, no camera data, no rotation flag


async def test_big_photos_are_shrunk(client, auth_headers, local_uploads):
    r = await _upload(client, auth_headers, _photo(size=(4000, 3000)))
    assert (r.json()["width"], r.json()["height"]) == (1600, 1200)
    r = await _upload(client, auth_headers, _photo(size=(4000, 3000)), purpose="avatar")
    assert (r.json()["width"], r.json()["height"]) == (512, 384)
    small = await _upload(client, auth_headers, _photo(size=(300, 300)))
    assert (small.json()["width"], small.json()["height"]) == (300, 300)  # never enlarged


async def test_transparency_survives(client, auth_headers, local_uploads):
    r = await _upload(client, auth_headers, _photo(fmt="PNG", mode="RGBA"), name="logo.png", mime="image/png")
    assert r.status_code == 201
    with _stored(r.json()["url"]) as img:
        assert img.mode == "RGBA"


async def test_only_real_photos_are_accepted(client, auth_headers, local_uploads):
    r = await _upload(client, auth_headers, b"<script>alert(1)</script>", name="evil.jpg")
    assert r.status_code == 415 and "JPEG, PNG, WebP or GIF" in r.json()["detail"]
    r = await _upload(client, auth_headers, _photo(fmt="BMP"), name="old.bmp", mime="image/bmp")
    assert r.status_code == 415
    r = await _upload(client, auth_headers, _photo()[:300])  # cut off half way
    assert r.status_code == 415
    assert (await _upload(client, auth_headers, b"")).status_code == 400
    r = await _upload(client, auth_headers, _photo(), purpose="banner")
    assert r.status_code == 422


async def test_too_big_files_are_refused(client, auth_headers, local_uploads, monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 1)
    r = await _upload(client, auth_headers, b"\0" * (2 * 1024 * 1024))
    assert r.status_code == 413 and "1 MB" in r.json()["detail"]


async def test_uploads_need_an_account(client, local_uploads):
    assert (await _upload(client, {}, _photo())).status_code == 401


async def test_production_without_cloudinary_says_so(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "CLOUDINARY_URL", "")
    assert (await client.get(f"{API}/uploads/status")).json()["images"] is False
    r = await _upload(client, auth_headers, _photo())
    assert r.status_code == 503 and "Paste a link" in r.json()["detail"]


def test_cloudinary_signature_matches_their_documentation():
    params = {"public_id": "sample_image", "timestamp": "1315060510"}
    assert images.cloudinary_signature(params, "abcd") == "b4ad47fb4e25c7bf5f92a20089f9db59bc302313"


async def test_photos_go_to_cloudinary_when_configured(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "CLOUDINARY_URL", "cloudinary://123456:s3cr3t@prologue-cloud")
    sent = []

    def handler(request: httpx.Request):
        sent.append(request)
        return httpx.Response(200, json={"secure_url": "https://res.cloudinary.com/prologue-cloud/image/upload/x.webp"})

    real = httpx.AsyncClient
    monkeypatch.setattr(images.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(handler), **kw))

    assert (await client.get(f"{API}/uploads/status")).json()["images"] is True
    r = await _upload(client, auth_headers, _photo(gps=True), purpose="story")
    assert r.status_code == 201 and r.json()["url"].startswith("https://res.cloudinary.com/")

    [req] = sent
    assert str(req.url) == "https://api.cloudinary.com/v1_1/prologue-cloud/image/upload"
    body = req.content
    assert b"s3cr3t" not in body  # the secret signs the request but is never sent
    form = BytesParser().parsebytes(b"Content-Type: " + req.headers["content-type"].encode() + b"\r\n\r\n" + body)
    fields = {p.get_param("name", header="content-disposition"): p.get_payload(decode=True) for p in form.get_payload()}
    assert fields["api_key"] == b"123456" and fields["folder"] == b"prologue/story"
    signed = {k: fields[k].decode() for k in ("folder", "public_id", "timestamp")}
    assert fields["signature"].decode() == images.cloudinary_signature(signed, "s3cr3t")
    with Image.open(io.BytesIO(fields["file"])) as img:  # what was sent is the cleaned WebP
        assert img.format == "WEBP" and not img.getexif()


async def test_cloudinary_failure_is_a_clear_error(client, auth_headers, monkeypatch, caplog):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "CLOUDINARY_URL", "cloudinary://123456:s3cr3t@prologue-cloud")
    real = httpx.AsyncClient
    monkeypatch.setattr(images.httpx, "AsyncClient", lambda **kw: real(
        transport=httpx.MockTransport(lambda req: httpx.Response(401, text=json.dumps({"error": "Invalid Signature"}))), **kw))
    r = await _upload(client, auth_headers, _photo())
    assert r.status_code == 502 and "try again" in r.json()["detail"]
    assert "Invalid Signature" in caplog.text and "s3cr3t" not in caplog.text


async def test_uploaded_photo_can_be_used_on_a_post(client, auth_headers, local_uploads):
    url = (await _upload(client, auth_headers, _photo())).json()["url"]
    r = await client.post(f"{API}/posts", headers=auth_headers, json={
        "title": "With a photo", "caption": "x", "media": [{"url": url, "type": "image"}],
    })
    assert r.status_code == 201, r.text
    assert r.json()["media"][0]["url"] == url
