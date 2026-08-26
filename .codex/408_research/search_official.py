import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).parent
SOURCE = ROOT / "nnuo_408.json"
OUT = ROOT / "official_candidates.json"
SEARCH_ENDPOINT = "https://cn.bing.com/search?format=rss&q="


def normalize(text):
    return re.sub(r"\s+", "", text or "")


def score_result(school, title, link, description):
    host = urlparse(link).netloc.lower()
    haystack = normalize(title + description)
    score = 0
    if host.endswith("edu.cn") or ".edu.cn" in host:
        score += 8
    if host.endswith("ac.cn") or ".ac.cn" in host or host.endswith("cas.cn"):
        score += 8
    if "chsi.com.cn" in host:
        score += 4
    short = school.replace("大学", "").replace("学院", "").replace("研究院", "")
    if school in haystack:
        score += 6
    elif len(short) >= 2 and short in haystack:
        score += 3
    if "2026" in haystack:
        score += 4
    if "拟录取" in haystack:
        score += 5
    if "复试" in haystack:
        score += 2
    if any(word in haystack for word in ["计算机", "软件", "人工智能", "网络空间", "电子信息"]):
        score += 2
    if any(bad in host for bad in ["noobdream", "sohu", "csdn", "xdf", "kaoyan", "youlu", "zhihu"]):
        score -= 20
    return score


def search_school(school):
    query = f'"{school}" 2026 硕士研究生 拟录取 计算机'
    url = SEARCH_ENDPOINT + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        xml_bytes = response.read()
    root = ET.fromstring(xml_bytes)
    candidates = []
    for item in root.findall(".//item"):
        title = item.findtext("title") or ""
        link = item.findtext("link") or ""
        description = item.findtext("description") or ""
        item_score = score_result(school, title, link, description)
        if item_score >= 8:
            candidates.append({
                "score": item_score,
                "title": title,
                "url": link,
                "description": re.sub(r"<[^>]+>", "", description)[:500],
            })
    candidates.sort(key=lambda item: item["score"], reverse=True)
    return school, candidates[:3]


data = json.loads(SOURCE.read_text(encoding="utf-8"))
schools = sorted({record["school"] for record in data["records"]})
results = {}
errors = {}

with ThreadPoolExecutor(max_workers=6) as pool:
    futures = {pool.submit(search_school, school): school for school in schools}
    for future in as_completed(futures):
        school = futures[future]
        try:
            key, candidates = future.result()
            results[key] = candidates
        except Exception as exc:
            errors[school] = str(exc)

payload = {
    "school_count": len(schools),
    "matched_school_count": sum(1 for candidates in results.values() if candidates),
    "error_count": len(errors),
    "results": results,
    "errors": errors,
}
OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k: payload[k] for k in ["school_count", "matched_school_count", "error_count"]}, ensure_ascii=False))
