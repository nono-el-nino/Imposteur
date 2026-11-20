"""Retain deployed files over HTTPS; do not depend on expiring Actions artifacts."""
import json
import os
import pathlib
import re
import time
import urllib.error
import urllib.parse
import urllib.request

ASSET = re.compile(r"assets/[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:js|css|woff2?|png|svg|webp|jpe?g|json)")


def inventory(data):
    value = json.loads(data)
    if not isinstance(value, dict):
        raise RuntimeError("Invalid asset inventory; publication stopped.")
    paths = value.get("assets")
    if not isinstance(paths, list) or any(not isinstance(p, str) or not ASSET.fullmatch(p) for p in paths):
        raise RuntimeError("Invalid asset inventory; publication stopped to protect previous versions.")
    return set(paths)


def worker_assets(data):
    match = re.search(rb"\bconst FILES\s*=\s*(\[.*?\]);", data, re.S)
    if not match:
        raise RuntimeError("Cannot read deployed offline file list; publication stopped.")
    return {p for p in json.loads(match[1]) if isinstance(p, str) and ASSET.fullmatch(p)}


def retain_assets(dist, fetch, legacy_path):
    """fetch(path) returns bytes, None only for a genuine HTTP 404, or raises."""
    dist = pathlib.Path(dist)
    manifest = fetch("asset-manifest.json")
    worker = fetch("sw.js")
    page = fetch("")
    required = inventory(manifest) if manifest is not None else set()
    if worker is not None:
        required.update(worker_assets(worker))
    if page is not None:
        required.update(re.findall(r'''(?:src|href)=["'](?:\./)?(assets/[A-Za-z0-9_.-]+)["']''', page.decode()))
    if any(not ASSET.fullmatch(path) for path in required):
        raise RuntimeError("Unsafe deployed asset path; publication stopped.")
    # Bootstrap existing deployments from before the durable inventory was added.
    candidates = set()
    if manifest is None and (worker is not None or page is not None):
        candidates = inventory(pathlib.Path(legacy_path).read_bytes())
    kept = 0
    absent = 0
    for path in sorted(required | candidates):
        target = dist / path
        if target.exists():
            continue  # Never replace a file from the current build.
        content = fetch(path)
        if content is None:
            if path in required:
                raise RuntimeError(f"Deployed asset {path} is missing; publication stopped.")
            absent += 1
            continue  # Historical builds can include files never published.
        if not content or content.lstrip().lower().startswith((b"<!doctype html", b"<html")):
            raise RuntimeError(f"Invalid response for deployed asset {path}; publication stopped.")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        kept += 1
    assets = sorted(str(path.relative_to(dist)) for path in (dist / "assets").glob("*") if path.is_file() and ASSET.fullmatch(str(path.relative_to(dist))))
    (dist / "asset-manifest.json").write_text(json.dumps({"version": 1, "assets": assets}, indent=2) + "\n")
    print(f"Retained {kept} previous files; {len(assets)} assets inventoried; {absent} unpublished historical candidates ignored.")
    return assets


def main():
    repository = os.environ.get("GH_REPO", "nono-el-nino/Imposteur")
    if not re.fullmatch(r"[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+", repository):
        raise RuntimeError("Invalid repository identity.")
    owner, name = repository.split("/")
    base = f"https://{owner.lower()}.github.io/{name}/"
    nonce = str(time.time_ns())

    def fetch(path):
        url = urllib.parse.urljoin(base, path)
        if path in ("", "sw.js", "asset-manifest.json"):
            url += "?retain=" + nonce
        request = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "User-Agent": "flou-pages-retention"})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
            raise RuntimeError(f"Pages returned HTTP {error.code}; publication stopped.") from None
        except urllib.error.URLError:
            raise RuntimeError("Cannot verify deployed assets over HTTPS; publication stopped.") from None

    retain_assets(pathlib.Path("dist"), fetch, pathlib.Path(__file__).with_name("legacy-page-assets.json"))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        message = str(error).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print(f"::error::{message}")
        raise SystemExit(1)
