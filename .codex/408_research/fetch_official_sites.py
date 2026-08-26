import html
import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).parent
SOURCE = ROOT / "nnuo_408.json"
OUT = ROOT / "official_sites.json"


def clean(fragment):
    return re.sub(r"\s+", "", html.unescape(re.sub(r"<[^>]+>", "", fragment or "")))


def fetch_school(school, school_id):
    url = f"https://noobdream.com/schoolinfo/{school_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        page = response.read().decode("utf-8", errors="replace")
    candidates = []
    short = school.replace("大学", "").replace("学院", "").replace("研究院", "")
    for match in re.finditer(r'href="(https?://[^"]+)"[^>]*>(.*?)</a>', page, flags=re.I | re.S):
        link = html.unescape(match.group(1))
        anchor = clean(match.group(2))
        host = urlparse(link).netloc.lower()
        if not any(token in host for token in ["edu.cn", "ac.cn", "cas.cn", "mil.cn"]):
            continue
        score = 0
        if school in anchor:
            score += 8
        elif len(short) >= 2 and short in anchor:
            score += 4
        if any(word in anchor for word in ["研究生", "招生", "计算机", "软件", "信息", "人工智能"]):
            score += 3
        if link.rstrip("/").count("/") <= 3:
            score += 1
        candidates.append({"score": score, "anchor": anchor, "url": link, "host": host})
    unique = {}
    for item in sorted(candidates, key=lambda x: x["score"], reverse=True):
        unique.setdefault(item["url"], item)
    return school, list(unique.values())[:8]


data = json.loads(SOURCE.read_text(encoding="utf-8"))
school_ids = {}
for record in data["records"]:
    school_ids.setdefault(record["school"], record["school_id"])

results = {}
errors = {}
with ThreadPoolExecutor(max_workers=12) as pool:
    futures = {pool.submit(fetch_school, school, school_id): school for school, school_id in school_ids.items()}
    for future in as_completed(futures):
        school = futures[future]
        try:
            key, candidates = future.result()
            results[key] = candidates
        except Exception as exc:
            errors[school] = str(exc)

payload = {
    "school_count": len(school_ids),
    "matched_school_count": sum(1 for value in results.values() if value),
    "error_count": len(errors),
    "results": results,
    "errors": errors,
}
OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k: payload[k] for k in ["school_count", "matched_school_count", "error_count"]}, ensure_ascii=False))
