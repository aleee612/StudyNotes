import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = "D:/Obsidian Vault/outputs/408-2026-all-schools/2026届408院校录取分数汇总.xlsx";
const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("普通一志愿");
const values = sheet.getUsedRange(true).values;
const headers = values[3];
const col = Object.fromEntries(headers.map((value, index) => [value, index]));
const majorPattern = /计算机|软件|人工智能|网络空间|网安|大数据|智能科学|电子信息/;
const rows = values.slice(4).filter(row => {
  const avg = Number(row[col["拟录取平均分"]]);
  const count = Number(row[col["录取人数(首个数字)"]]);
  const major = String(row[col["专业/方向"]] ?? "");
  const confidence = String(row[col["置信级别"]] ?? "");
  const province = String(row[col["省份"]] ?? "");
  return /上海|江苏|浙江|安徽/.test(province) && majorPattern.test(major) && Number.isFinite(avg) && avg >= 285 && avg <= 360 && Number.isFinite(count) && count >= 5 && confidence === "B";
}).map(row => ({
  province: row[col["省份"]],
  school: row[col["学校"]],
  college: row[col["学院/培养单位"]],
  major: row[col["专业/方向"]],
  subjects: row[col["初试科目"]],
  category: row[col["类别"]],
  line: row[col["复试线总分(解析)"]],
  count: row[col["录取人数(首个数字)"]],
  avg: row[col["拟录取平均分"]],
  min: row[col["拟录取最低分"]],
  max: row[col["拟录取最高分"]],
}));
rows.sort((a, b) => a.avg - b.avg || b.count - a.count);
const bands = [
  { name: "低风险参考", min: 285, max: 315 },
  { name: "主攻参考", min: 316, max: 338 },
  { name: "冲刺参考", min: 339, max: 360 },
].map(band => ({
  ...band,
  rows: rows
    .filter(row => row.avg >= band.min && row.avg <= band.max && row.count >= 10 && /11408/.test(String(row.subjects)))
    .sort((a, b) => b.count - a.count || a.avg - b.avg)
    .slice(0, 35),
}));
const all11408 = rows.filter(row => /11408/.test(String(row.subjects))).sort((a, b) => a.avg - b.avg || b.count - a.count);
console.log(JSON.stringify({ count: rows.length, all11408, bands }, null, 2));
