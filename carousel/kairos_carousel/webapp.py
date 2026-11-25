"""Local form app (standard library only). Browser form -> brief JSON -> carousel PDF.

Binds to 127.0.0.1. Output goes to ./carousel_output/<id>/, saved product profiles to ./profiles/.
"""
from __future__ import annotations

import json
import re
import secrets
import threading
import traceback
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .brief import HEX, normalize_logo
from .pipeline import build_from_brief

PKG = Path(__file__).parent
ID_RE, FILE_RE, SLUG_RE = re.compile(r"^[0-9a-f]{12}$"), re.compile(r"^(carousel\.pdf|carousel\.html|slide-\d{2}\.png)$"), re.compile(r"^[a-z0-9-]{1,40}$")
TYPES = {".pdf": "application/pdf", ".png": "image/png", ".html": "text/html; charset=utf-8"}
LOCK = threading.Lock()  # one Chromium build at a time


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40]


def make_handler(out_root: Path, prof_root: Path):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _send(self, code, body: bytes, ctype):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _json(self, code, obj):
            self._send(code, json.dumps(obj).encode(), "application/json")

        def _body(self):
            n = int(self.headers.get("Content-Length") or 0)
            if n > 14_000_000:
                raise ValueError("That upload is too large (limit 14 MB in total).")
            return json.loads(self.rfile.read(n) or b"{}")

        def do_GET(self):
            path = self.path.split("?")[0]
            if path == "/":
                return self._send(200, (PKG / "static" / "app.html").read_bytes(), "text/html; charset=utf-8")
            if path == "/profiles":
                rows = []
                for f in sorted(prof_root.glob("*.json")):
                    try:
                        rows.append({"slug": f.stem, "name": json.loads(f.read_text(encoding="utf-8")).get("name", f.stem)})
                    except ValueError:
                        pass
                return self._json(200, rows)
            m = re.match(r"^/profiles/([a-z0-9-]+)$", path)
            if m and SLUG_RE.match(m[1]) and (prof_root / f"{m[1]}.json").exists():
                return self._send(200, (prof_root / f"{m[1]}.json").read_bytes(), "application/json")
            m = re.match(r"^/files/([0-9a-f]{12})/([^/]+)$", path)
            if m and ID_RE.match(m[1]) and FILE_RE.match(m[2]) and (out_root / m[1] / m[2]).exists():
                return self._send(200, (out_root / m[1] / m[2]).read_bytes(), TYPES[Path(m[2]).suffix])
            self._json(404, {"error": "Not found."})

        def do_POST(self):
            try:
                data = self._body()
                if self.path == "/profiles":
                    name = str(data.get("name", "")).strip()
                    if not name:
                        raise ValueError("Enter a product name before saving a profile.")
                    if data.get("primary") and not HEX.match(data["primary"]):
                        raise ValueError("Brand colour must look like #1f6f4a.")
                    prof = {"name": name, "handle": data.get("handle", ""), "site": data.get("site", ""),
                            "primary": data.get("primary") or "#1f6f4a", "logo": normalize_logo(data.get("logo"))}
                    prof_root.mkdir(exist_ok=True)
                    (prof_root / f"{_slug(name) or 'product'}.json").write_text(json.dumps(prof), encoding="utf-8")
                    return self._json(200, {"saved": _slug(name)})
                if self.path == "/build":
                    jid = secrets.token_hex(6)
                    with LOCK:
                        rep = build_from_brief(data, out_root / jid, png=True)
                    issues = [i.__dict__ for i in rep.issues if i.sev != "info" or i.kind == "fit"]
                    ok = rep.exported and not rep.errors
                    return self._json(200, {"ok": ok, "issues": issues,
                                            "pdf": f"/files/{jid}/carousel.pdf" if ok else None,
                                            "slides": [f"/files/{jid}/{Path(p).name}" for p in rep.files.get("png", [])] if ok else []})
                self._json(404, {"error": "Not found."})
            except (ValueError, FileNotFoundError) as e:  # bad input: tell the user what to fix
                self._json(400, {"error": str(e)})
            except Exception:
                traceback.print_exc()
                self._json(500, {"error": "Something went wrong while building the carousel. Check the terminal for details."})

    return H


def serve(port: int = 8765, open_browser: bool = True):
    out_root, prof_root = Path.cwd() / "carousel_output", Path.cwd() / "profiles"
    out_root.mkdir(exist_ok=True)
    srv = ThreadingHTTPServer(("127.0.0.1", port), make_handler(out_root, prof_root))
    url = f"http://127.0.0.1:{port}"
    print(f"Carousel maker running at {url}  (Ctrl+C to stop)\nOutput: {out_root}")
    if open_browser:
        webbrowser.open(url)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
