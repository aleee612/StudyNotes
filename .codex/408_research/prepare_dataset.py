import json
import re
from pathlib import Path


ROOT = Path(__file__).parent
RAW_PATH = ROOT / "nnuo_408.json"
SITES_PATH = ROOT / "official_sites.json"
OUT_PATH = ROOT / "workbook_data.json"


def first_value(mapping, keys):
    for key in keys:
        value = mapping.get(key)
        if value not in (None, ""):
            return str(value)
    return ""


def first_three_digit(text):
    match = re.search(r"(?<!\d)([2-4]\d{2}(?:\.\d+)?)(?!\d)", text or "")
    return float(match.group(1)) if match else None


def parse_score_triplet(text):
    text = (text or "").replace("—", "-").replace("–", "-").replace("~", "-")
    if not text or "N诺" in text or text in {"NC", "无", "暂无"}:
        return None, None, None, "缺失"
    patterns = re.findall(r"([2-4]\d{2}(?:\.\d+)?)\s*\[\s*([2-4]\d{2}(?:\.\d+)?)\s*-\s*([2-4]\d{2}(?:\.\d+)?)\s*\]", text)
    if patterns:
        avg, low, high = map(float, patterns[0])
        return avg, low, high, "区间解析" if len(patterns) == 1 else "多组数据取首组"
    numbers = re.findall(r"(?<!\d)([2-4]\d{2}(?:\.\d+)?)(?!\d)", text)
    if len(numbers) == 1:
        value = float(numbers[0])
        return value, value, value, "单值"
    return None, None, None, "复杂文本未解析"


def parse_count(text):
    if not text or "N诺" in text or text in {"无", "暂无"}:
        return None
    match = re.search(r"(?<!\d)(\d{1,4})(?!\d)", text)
    return int(match.group(1)) if match else None


raw = json.loads(RAW_PATH.read_text(encoding="utf-8"))
sites_payload = json.loads(SITES_PATH.read_text(encoding="utf-8")) if SITES_PATH.exists() else {"results": {}}

official_sites = {}
for school, candidates in sites_payload.get("results", {}).items():
    official_sites[school] = candidates[0]["url"] if candidates else ""

rows = []
for index, record in enumerate(raw["records"], start=1):
    mapped = record.get("mapped", {})
    cells = record.get("cells", [])
    if len(cells) == 8:
        major, subjects, line_raw, reexam_count_raw, reexam_score_raw, subject_avg_raw, admit_count_raw, admit_score_raw = cells
    else:
        major = first_value(mapped, ["专业名称"]) or (cells[0] if cells else "")
        subjects = first_value(mapped, ["初试科目"]) or (cells[1] if len(cells) > 1 else "")
        line_raw = first_value(mapped, ["分数线"])
        reexam_count_raw = first_value(mapped, ["复试人数"])
        reexam_score_raw = first_value(mapped, ["进复试总分均分", "复试总分均分", "复试均分", "进批总分均分"])
        subject_avg_raw = first_value(mapped, ["进复试单科均分", "复试单科均分", "单科均分"])
        admit_count_raw = first_value(mapped, ["拟录取人数", "录取人数", "预计招生人数"])
        admit_score_raw = first_value(mapped, ["拟录取分数", "录取分数", "录取平均分数", "拟录取均分"])

    avg_score, min_score, max_score, parse_method = parse_score_triplet(admit_score_raw)
    reexam_avg, reexam_min, reexam_max, _ = parse_score_triplet(reexam_score_raw)
    line_score = first_three_digit(line_raw)
    admitted_count = parse_count(admit_count_raw)
    reexam_count = parse_count(reexam_count_raw)

    combined = "|".join([record.get("college", ""), major, admit_count_raw, admit_score_raw, reexam_count_raw])
    study_mode = "非全日制" if "非全" in combined else ("全日制" if "全日制" in combined else "未标明（通常全日制）")
    flags = []
    if "调剂" in combined:
        flags.append("含调剂")
    if any(word in combined for word in ["专项", "士兵", "骨干", "少干", "退役", "强军"]):
        flags.append("含专项")
    if "补录" in combined:
        flags.append("含补录")
    category = "；".join(flags) if flags else "普通/未标明"

    status_parts = []
    if avg_score is None:
        status_parts.append("缺拟录取分")
    if admitted_count is None:
        status_parts.append("缺人数")
    if len(cells) != 8:
        status_parts.append("合并单元格需复核")
    if line_raw and line_score is None and line_raw not in {"NC", "无", "暂无"}:
        status_parts.append("复试线疑似缺失/错位")
    if "[" in reexam_count_raw and "]" in reexam_count_raw:
        status_parts.append("复试列疑似错位")
    if parse_method in {"多组数据取首组", "复杂文本未解析"}:
        status_parts.append(parse_method)
    if flags:
        status_parts.append("类别混合")
    data_status = "；".join(status_parts) if status_parts else "可用（二手汇总）"
    confidence = "B" if not status_parts else ("C" if avg_score is not None else "D")

    rows.append({
        "record_id": index,
        "province": record.get("province", ""),
        "school": record.get("school", ""),
        "college": record.get("college", ""),
        "major": major,
        "subjects": subjects,
        "study_mode": study_mode,
        "category": category,
        "reexam_line_raw": line_raw,
        "reexam_line_total": line_score,
        "reexam_count_raw": reexam_count_raw,
        "reexam_count": reexam_count,
        "reexam_score_raw": reexam_score_raw,
        "reexam_avg": reexam_avg,
        "reexam_min": reexam_min,
        "reexam_max": reexam_max,
        "subject_avg_raw": subject_avg_raw,
        "admit_count_raw": admit_count_raw,
        "admitted_count": admitted_count,
        "admit_score_raw": admit_score_raw,
        "admit_avg": avg_score,
        "admit_min": min_score,
        "admit_max": max_score,
        "parse_method": parse_method,
        "data_status": data_status,
        "confidence": confidence,
        "numeric_source": record.get("source_url", ""),
        "school_detail_source": record.get("detail_url", ""),
        "official_site": official_sites.get(record.get("school", ""), ""),
        "raw_cell_count": len(cells),
        "raw_cells": " | ".join(cells),
    })

seen = set()
deduped = []
for row in rows:
    key = (
        row["province"], row["school"], row["college"], row["major"], row["subjects"],
        row["reexam_line_raw"], row["admit_count_raw"], row["admit_score_raw"],
    )
    if key in seen:
        continue
    seen.add(key)
    row["record_id"] = len(deduped) + 1
    deduped.append(row)

school_map = {}
for row in deduped:
    entry = school_map.setdefault(row["school"], {
        "province": row["province"],
        "school": row["school"],
        "official_site": row["official_site"],
        "numeric_source": row["numeric_source"],
        "school_detail_source": row["school_detail_source"],
    })
    if not entry["official_site"] and row["official_site"]:
        entry["official_site"] = row["official_site"]

ordinary = [row for row in deduped if row["study_mode"] != "非全日制" and row["category"] == "普通/未标明"]
special = [row for row in deduped if row not in ordinary]

payload = {
    "as_of_date": "2026-08-19",
    "scope_note": "2027择校页汇总的2026年统考录取数据；筛选初试科目文本含408的专业。",
    "source_school_count": raw["unique_408_schools"],
    "all_rows": deduped,
    "ordinary_rows": ordinary,
    "special_rows": special,
    "schools": sorted(school_map.values(), key=lambda x: (x["province"], x["school"])),
}
OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({
    "schools": len(payload["schools"]),
    "all_rows": len(deduped),
    "ordinary_rows": len(ordinary),
    "special_rows": len(special),
    "rows_with_admit_avg": sum(row["admit_avg"] is not None for row in deduped),
    "rows_with_official_site": sum(bool(school["official_site"]) for school in payload["schools"]),
}, ensure_ascii=False))
