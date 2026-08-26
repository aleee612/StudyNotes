import json
import html as html_lib
import re
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


URL = "https://noobdream.com/zexiao/"
OUT = Path(__file__).with_name("nnuo_408.json")
PROVINCES = [
    "北京", "天津", "上海", "重庆", "河北", "山西", "辽宁", "吉林", "黑龙江", "江苏",
    "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "海南",
    "四川", "贵州", "云南", "陕西", "甘肃", "青海", "内蒙古", "广西", "西藏", "宁夏", "新疆",
]


def strip_tags(fragment):
    fragment = re.sub(r"<br\s*/?>", " ", fragment or "", flags=re.I)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    return html_lib.unescape(fragment)


def clean(text):
    return re.sub(r"\s+", "", strip_tags(text)).replace("【", "[").replace("】", "]")


records = []
schools = []


def fetch(province):
    page_url = URL + "?" + urllib.parse.urlencode({"filter": province})
    req = urllib.request.Request(page_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return province, page_url, response.read().decode("utf-8", errors="replace")


pages = []
with ThreadPoolExecutor(max_workers=8) as pool:
    futures = [pool.submit(fetch, province) for province in PROVINCES]
    for future in as_completed(futures):
        pages.append(future.result())

page_titles = []
for province, page_url, html in sorted(pages, key=lambda item: PROVINCES.index(item[0])):
  title_match_page = re.search(r'<title>(.*?)</title>', html, flags=re.I | re.S)
  if title_match_page:
      page_titles.append(clean(title_match_page.group(1)))
  card_chunks = re.split(r'<div\s+class="data-card"', html, flags=re.I)[1:]
  for chunk in card_chunks:
      id_match = re.match(r'[^>]*data-school-id="([^"]*)"[^>]*>', chunk, flags=re.I)
      title_match = re.search(r'<div\s+class="card-title"[^>]*>(.*?)</div>', chunk, flags=re.I | re.S)
      if not title_match:
          continue
      title_html = re.sub(r'<span[^>]*class="label[^>]*>.*?</span>', "", title_match.group(1), flags=re.I | re.S)
      school = clean(title_html)
      school_id = id_match.group(1) if id_match else ""
      schools.append({"school": school, "school_id": school_id, "province": province})
      college = ""
      headers = []
      for tr_html in re.findall(r'<tr[^>]*>(.*?)</tr>', chunk, flags=re.I | re.S):
          cells = re.findall(r'<(td|th)([^>]*)>(.*?)</\1>', tr_html, flags=re.I | re.S)
          values = [clean(cell[2]) for cell in cells]
          if not values:
              continue
          colspan_match = re.search(r'colspan\s*=\s*["\']?(\d+)', cells[0][1], flags=re.I) if len(cells) == 1 else None
          if len(cells) == 1 and colspan_match and int(colspan_match.group(1)) >= 6:
              college = values[0]
              continue
          if any("专业名称" in v for v in values) and any("初试科目" in v for v in values):
              headers = values
              continue
          if not headers or len(values) < 2:
              continue
          subject = values[1]
          if "408" not in subject:
              continue
          padded = values + [""] * max(0, len(headers) - len(values))
          row = {headers[i]: padded[i] for i in range(min(len(headers), len(padded)))}
          records.append({
              "school": school,
              "school_id": school_id,
              "province": province,
              "college": college,
              "source_url": page_url,
              "detail_url": f"https://noobdream.com/schoolinfo/{school_id}" if school_id else "",
              "cells": values,
              "mapped": row,
          })

payload = {
    "page_title": page_titles[0] if page_titles else "",
    "province_pages": len(pages),
    "source_url": URL,
    "school_card_count": len(schools),
    "record_count": len(records),
    "unique_408_schools": len({r["school"] for r in records}),
    "schools": schools,
    "records": records,
}
OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k: payload[k] for k in ["page_title", "school_card_count", "record_count", "unique_408_schools"]}, ensure_ascii=False))
