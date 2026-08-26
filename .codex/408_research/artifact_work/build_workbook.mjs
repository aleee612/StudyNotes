import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const workDir = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(workDir, "..", "workbook_data.json");
const outputDir = path.resolve(workDir, "..", "..", "..", "outputs", "408-2026-all-schools");
const previewDir = path.join(outputDir, "previews");
const outputPath = path.join(outputDir, "2026届408院校录取分数汇总.xlsx");
const data = JSON.parse(await fs.readFile(dataPath, "utf8"));

await fs.mkdir(previewDir, { recursive: true });

const wb = Workbook.create();
const overview = wb.worksheets.add("概览");
const ordinary = wb.worksheets.add("普通一志愿");
const special = wb.worksheets.add("专项调剂非全");
const schoolsSheet = wb.worksheets.add("院校目录");
const allDetail = wb.worksheets.add("全量明细");
const sources = wb.worksheets.add("来源与核验");
const definitions = wb.worksheets.add("口径说明");

const COLORS = {
  navy: "#17365D",
  blue: "#2F75B5",
  teal: "#008C95",
  paleBlue: "#DDEBF7",
  paleTeal: "#DDEFEF",
  paleYellow: "#FFF2CC",
  paleRed: "#FCE4D6",
  paleGreen: "#E2F0D9",
  gray: "#E7E6E6",
  darkGray: "#595959",
  white: "#FFFFFF",
};

function styleTitle(sheet, range, text) {
  range.merge();
  range.values = [[text]];
  range.format = {
    fill: COLORS.navy,
    font: { color: COLORS.white, bold: true, size: 18 },
    verticalAlignment: "center",
    horizontalAlignment: "left",
  };
  range.format.rowHeight = 34;
}

function styleHeader(range) {
  range.format = {
    fill: COLORS.blue,
    font: { color: COLORS.white, bold: true },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "outside", style: "thin", color: "#A6A6A6" },
  };
  range.format.rowHeight = 30;
}

function applyBaseSheetStyle(sheet) {
  sheet.showGridLines = false;
}

const detailHeaders = [
  "记录ID", "省份", "学校", "学院/培养单位", "专业/方向", "初试科目", "学习方式", "类别",
  "复试线原文", "复试线总分(解析)", "复试人数原文", "复试人数(首个数字)", "进复试分数原文", "进复试均分",
  "录取人数原文", "录取人数(首个数字)", "拟录取分数原文", "拟录取平均分", "拟录取最低分", "拟录取最高分",
  "解析方式", "数据状态", "置信级别", "数字来源", "院校详情来源", "院校/学院官网入口", "原始单元格数", "原始行",
];

function rowToArray(row) {
  return [
    row.record_id, row.province, row.school, row.college, row.major, row.subjects, row.study_mode, row.category,
    row.reexam_line_raw, row.reexam_line_total, row.reexam_count_raw, row.reexam_count, row.reexam_score_raw, row.reexam_avg,
    row.admit_count_raw, row.admitted_count, row.admit_score_raw, row.admit_avg, row.admit_min, row.admit_max,
    row.parse_method, row.data_status, row.confidence, row.numeric_source, row.school_detail_source, row.official_site,
    row.raw_cell_count, row.raw_cells,
  ];
}

function writeDetailSheet(sheet, title, note, rows, tableName) {
  applyBaseSheetStyle(sheet);
  styleTitle(sheet, sheet.getRange("A1:AB1"), title);
  sheet.getRange("A2:AB2").merge();
  sheet.getRange("A2").values = [[note]];
  sheet.getRange("A2:AB2").format = {
    fill: COLORS.paleBlue,
    font: { color: COLORS.darkGray, italic: true },
    wrapText: true,
    verticalAlignment: "center",
  };
  sheet.getRange("A2:AB2").format.rowHeight = 32;
  sheet.getRange("A4:AB4").values = [detailHeaders];
  styleHeader(sheet.getRange("A4:AB4"));
  const startRow = 5;
  const endRow = startRow + rows.length - 1;
  sheet.getRange(`A${startRow}:AB${endRow}`).values = rows.map(rowToArray);
  const table = sheet.tables.add(`A4:AB${endRow}`, true, tableName);
  table.style = "TableStyleMedium2";
  table.showFilterButton = true;
  sheet.freezePanes.freezeRows(4);
  sheet.freezePanes.freezeColumns(3);

  sheet.getRange(`A${startRow}:A${endRow}`).format.numberFormat = "0";
  for (const column of ["J", "L", "P", "AA"]) {
    sheet.getRange(`${column}${startRow}:${column}${endRow}`).format.numberFormat = "0";
  }
  for (const column of ["N", "R", "S", "T"]) {
    sheet.getRange(`${column}${startRow}:${column}${endRow}`).format.numberFormat = "0.0";
  }
  sheet.getRange(`A${startRow}:AB${endRow}`).format.verticalAlignment = "center";
  sheet.getRange(`D${startRow}:E${endRow}`).format.wrapText = true;
  sheet.getRange(`G${startRow}:I${endRow}`).format.wrapText = true;
  sheet.getRange(`K${startRow}:Q${endRow}`).format.wrapText = true;
  sheet.getRange(`U${startRow}:V${endRow}`).format.wrapText = true;

  const widths = {
    A: 9, B: 10, C: 20, D: 30, E: 27, F: 12, G: 18, H: 16, I: 18, J: 13,
    K: 18, L: 14, M: 20, N: 12, O: 19, P: 14, Q: 22, R: 13, S: 13, T: 13,
    U: 17, V: 28, W: 10, X: 38, Y: 38, Z: 38, AA: 12, AB: 65,
  };
  for (const [column, width] of Object.entries(widths)) {
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  }
  sheet.getRange(`R${startRow}:R${endRow}`).conditionalFormats.add("colorScale", {
    colors: ["#E2F0D9", "#FFF2CC", "#F4B084"],
    thresholds: ["min", "50%", "max"],
  });
  sheet.getRange(`V${startRow}:V${endRow}`).conditionalFormats.add("containsText", {
    text: "缺",
    format: { fill: COLORS.paleRed, font: { color: "#9C0006" } },
  });
  sheet.getRange(`V${startRow}:V${endRow}`).conditionalFormats.add("containsText", {
    text: "可用",
    format: { fill: COLORS.paleGreen, font: { color: "#006100" } },
  });
  sheet.getRange(`W${startRow}:W${endRow}`).conditionalFormats.add("containsText", {
    text: "D",
    format: { fill: COLORS.paleRed, font: { bold: true, color: "#9C0006" } },
  });
}

writeDetailSheet(
  ordinary,
  "2026届408院校录取数据｜普通一志愿主表",
  "仅保留未标明调剂、专项、补录或非全日制的记录；“未标明”不等于官方明确确认，使用前请查看数据状态和来源。",
  data.ordinary_rows,
  "OrdinaryAdmissionsTable",
);

writeDetailSheet(
  special,
  "2026届408院校录取数据｜专项、调剂与非全",
  "该表包含文本中出现调剂、专项、补录或非全日制的记录；人数列默认只解析第一个数字，完整口径请看原文列。",
  data.special_rows,
  "SpecialAdmissionsTable",
);

writeDetailSheet(
  allDetail,
  "2026届408院校录取数据｜全量明细",
  "共收录全部学校—学院—专业/方向记录。数字来源为公开二手汇总，官网入口用于复核；异常行不会被静默修正。",
  data.all_rows,
  "AllAdmissionsTable",
);

applyBaseSheetStyle(schoolsSheet);
styleTitle(schoolsSheet, schoolsSheet.getRange("A1:L1"), "2026届408院校目录与覆盖情况");
schoolsSheet.getRange("A2:L2").merge();
schoolsSheet.getRange("A2").values = [["院校分母：2026录取数据页中初试科目文本含“408”的招生单位；统计截至2026-08-19。院校均分为各专业已公布均分的未加权平均。"]];
schoolsSheet.getRange("A2:L2").format = { fill: COLORS.paleBlue, font: { italic: true, color: COLORS.darkGray }, wrapText: true };
schoolsSheet.getRange("A2:L2").format.rowHeight = 32;
const schoolHeaders = ["省份", "学校", "官网入口", "数字来源", "院校详情来源", "408记录数", "有录取均分记录", "专业均分均值(未加权)", "已知最低分", "已知最高分", "缺均分记录", "官网入口状态"];
schoolsSheet.getRange("A4:L4").values = [schoolHeaders];
styleHeader(schoolsSheet.getRange("A4:L4"));
const schoolEnd = 4 + data.schools.length;
schoolsSheet.getRange(`A5:E${schoolEnd}`).values = data.schools.map(row => [row.province, row.school, row.official_site, row.numeric_source, row.school_detail_source]);
const detailStart = 5;
const detailEnd = 4 + data.all_rows.length;
const schoolFormulas = data.schools.map((_, idx) => {
  const r = idx + 5;
  return [
    `=COUNTIF('全量明细'!$C$${detailStart}:$C$${detailEnd},B${r})`,
    `=COUNTIFS('全量明细'!$C$${detailStart}:$C$${detailEnd},B${r},'全量明细'!$R$${detailStart}:$R$${detailEnd},">0")`,
    `=IF(G${r}=0,"",SUMIFS('全量明细'!$R$${detailStart}:$R$${detailEnd},'全量明细'!$C$${detailStart}:$C$${detailEnd},B${r})/G${r})`,
    `=IF(G${r}=0,"",MINIFS('全量明细'!$S$${detailStart}:$S$${detailEnd},'全量明细'!$C$${detailStart}:$C$${detailEnd},B${r},'全量明细'!$S$${detailStart}:$S$${detailEnd},">0"))`,
    `=IF(G${r}=0,"",MAXIFS('全量明细'!$T$${detailStart}:$T$${detailEnd},'全量明细'!$C$${detailStart}:$C$${detailEnd},B${r}))`,
    `=F${r}-G${r}`,
    `=IF(C${r}<>"","有官网入口","缺官网入口")`,
  ];
});
schoolsSheet.getRange(`F5:L${schoolEnd}`).formulas = schoolFormulas;
const schoolTable = schoolsSheet.tables.add(`A4:L${schoolEnd}`, true, "SchoolCoverageTable");
schoolTable.style = "TableStyleMedium2";
schoolsSheet.freezePanes.freezeRows(4);
schoolsSheet.freezePanes.freezeColumns(2);
schoolsSheet.getRange(`F5:G${schoolEnd}`).format.numberFormat = "0";
schoolsSheet.getRange(`H5:J${schoolEnd}`).format.numberFormat = "0.0";
schoolsSheet.getRange(`K5:K${schoolEnd}`).format.numberFormat = "0";
schoolsSheet.getRange(`C5:E${schoolEnd}`).format = { wrapText: true, font: { size: 9 }, verticalAlignment: "center" };
schoolsSheet.getRange(`A5:L${schoolEnd}`).format.rowHeight = 34;
schoolsSheet.getRange(`F5:L${schoolEnd}`).format.horizontalAlignment = "center";
const schoolWidths = [11, 22, 40, 42, 42, 12, 16, 20, 13, 13, 13, 16];
for (let i = 0; i < schoolWidths.length; i++) {
  schoolsSheet.getRangeByIndexes(0, i, schoolEnd, 1).format.columnWidth = schoolWidths[i];
}
schoolsSheet.getRange(`K5:K${schoolEnd}`).conditionalFormats.add("cellIs", {
  operator: "greaterThan",
  formula: 0,
  format: { fill: COLORS.paleYellow, font: { color: "#9C6500" } },
});
schoolsSheet.getRange(`L5:L${schoolEnd}`).conditionalFormats.add("containsText", {
  text: "缺",
  format: { fill: COLORS.paleRed, font: { color: "#9C0006" } },
});

applyBaseSheetStyle(overview);
styleTitle(overview, overview.getRange("A1:N1"), "2026届全国408院校录取与分数概览");
overview.getRange("A2:N2").merge();
overview.getRange("A2").values = [["完整数据库见“普通一志愿”“专项调剂非全”和“全量明细”。复试线、最低录取分、拟录取平均分是三个不同指标。"]];
overview.getRange("A2:N2").format = { fill: COLORS.paleBlue, font: { italic: true, color: COLORS.darkGray }, wrapText: true };
overview.getRange("A2:N2").format.rowHeight = 30;

const cards = [
  { label: "408院校数", rangeLabel: "A5:B5", rangeValue: "A6:B7", formula: `=COUNTA('院校目录'!$B$5:$B$${schoolEnd})`, format: "0" },
  { label: "专业/方向记录", rangeLabel: "C5:D5", rangeValue: "C6:D7", formula: `=COUNTA('全量明细'!$A$${detailStart}:$A$${detailEnd})`, format: "0" },
  { label: "可解析拟录取均分", rangeLabel: "E5:F5", rangeValue: "E6:F7", formula: `=COUNT('全量明细'!$R$${detailStart}:$R$${detailEnd})`, format: "0" },
  { label: "均分覆盖率", rangeLabel: "G5:H5", rangeValue: "G6:H7", formula: `=COUNT('全量明细'!$R$${detailStart}:$R$${detailEnd})/COUNTA('全量明细'!$A$${detailStart}:$A$${detailEnd})`, format: "0.0%" },
  { label: "普通/未标明记录", rangeLabel: "I5:J5", rangeValue: "I6:J7", formula: `=COUNTA('普通一志愿'!$A$5:$A$${4 + data.ordinary_rows.length})`, format: "0" },
  { label: "专项调剂非全记录", rangeLabel: "K5:L5", rangeValue: "K6:L7", formula: `=COUNTA('专项调剂非全'!$A$5:$A$${4 + data.special_rows.length})`, format: "0" },
  { label: "院校官网入口覆盖", rangeLabel: "M5:N5", rangeValue: "M6:N7", formula: `=COUNTIF('院校目录'!$L$5:$L$${schoolEnd},"有官网入口")/COUNTA('院校目录'!$B$5:$B$${schoolEnd})`, format: "0.0%" },
];
for (const card of cards) {
  overview.getRange(card.rangeLabel).merge();
  overview.getRange(card.rangeLabel.split(":")[0]).values = [[card.label]];
  overview.getRange(card.rangeLabel).format = { fill: COLORS.teal, font: { color: COLORS.white, bold: true }, horizontalAlignment: "center", verticalAlignment: "center" };
  overview.getRange(card.rangeValue).merge();
  const anchor = card.rangeValue.split(":")[0];
  overview.getRange(anchor).formulas = [[card.formula]];
  overview.getRange(card.rangeValue).format = { fill: COLORS.paleTeal, font: { color: COLORS.navy, bold: true, size: 18 }, horizontalAlignment: "center", verticalAlignment: "center", numberFormat: card.format, borders: { preset: "outside", style: "thin", color: "#A6A6A6" } };
}

overview.getRange("A10:F10").merge();
overview.getRange("A10").values = [["数据质量与使用提示"]];
overview.getRange("A10:F10").format = { fill: COLORS.navy, font: { color: COLORS.white, bold: true } };
const qualityRows = [
  ["拟录取分数区间可解析", `=COUNT('全量明细'!$R$${detailStart}:$R$${detailEnd})`, "条", "平均分、最低分和最高分均可直接筛选"],
  ["拟录取分数缺失", `=COUNTA('全量明细'!$A$${detailStart}:$A$${detailEnd})-COUNT('全量明细'!$R$${detailStart}:$R$${detailEnd})`, "条", "原始来源未提供或格式无法可靠解析"],
  ["需复核/类别混合", `=COUNTIF('全量明细'!$W$${detailStart}:$W$${detailEnd},"C")+COUNTIF('全量明细'!$W$${detailStart}:$W$${detailEnd},"D")`, "条", "查看原文列，不要只使用首个数字"],
  ["官网入口缺失", `=COUNTIF('院校目录'!$L$5:$L$${schoolEnd},"缺官网入口")`, "所", "可从学校研究生院主页继续人工检索"],
  ["核心提醒", null, "", "“专业均分均值”不是学校官方总均分；不同专业不可直接合并比较"],
];
overview.getRange("A11:D15").values = qualityRows.map(row => [row[0], null, row[2], row[3]]);
for (let i = 0; i < qualityRows.length; i++) {
  if (qualityRows[i][1]) overview.getRange(`B${11 + i}`).formulas = [[qualityRows[i][1]]];
}
overview.getRange("A11:D15").format.borders = { preset: "inside", style: "thin", color: "#D9E1F2" };
overview.getRange("A11:A15").format.font = { bold: true, color: COLORS.navy };
overview.getRange("B11:B14").format.numberFormat = "0";
overview.getRange("D11:D15").format.wrapText = true;

overview.getRange("H10:N10").merge();
overview.getRange("H10").values = [["地区覆盖（院校数）"]];
overview.getRange("H10:N10").format = { fill: COLORS.navy, font: { color: COLORS.white, bold: true } };
const provinces = [...new Set(data.schools.map(row => row.province))].sort((a, b) => a.localeCompare(b, "zh-CN"));
overview.getRange(`H11:H${10 + provinces.length}`).values = provinces.map(value => [value]);
overview.getRange(`I11:I${10 + provinces.length}`).formulas = provinces.map((_, idx) => [`=COUNTIF('院校目录'!$A$5:$A$${schoolEnd},H${11 + idx})`]);
overview.getRange(`H11:I${10 + provinces.length}`).format.borders = { preset: "inside", style: "thin", color: "#D9E1F2" };
overview.getRange(`I11:I${10 + provinces.length}`).format.numberFormat = "0";
overview.getRange(`I11:I${10 + provinces.length}`).conditionalFormats.add("dataBar", { color: COLORS.blue, gradient: true });
overview.getRange("K11:N16").values = [
  ["推荐筛选顺序", null, null, null],
  ["1", "普通一志愿", "省份/学校/专业", "先排除调剂与专项混合"],
  ["2", "拟录取最低分", "拟录取平均分", "观察录取区间而非只看复试线"],
  ["3", "录取人数原文", "数据状态", "人数含加号时必须看原文"],
  ["4", "数字来源", "官网入口", "对目标院校做最终官方复核"],
  ["注意", "跨校分数可比", "但复试权重不同", "本表只比较初试总分"],
];
overview.getRange("K11:N11").merge();
overview.getRange("K11:N11").format = { fill: COLORS.paleYellow, font: { bold: true, color: "#9C6500" } };
overview.getRange("K12:N16").format = { wrapText: true, borders: { preset: "inside", style: "thin", color: "#E7E6E6" } };
overview.freezePanes.freezeRows(2);
for (const col of ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"]) {
  overview.getRange(`${col}:${col}`).format.columnWidth = col === "D" || col === "N" ? 24 : 13;
}

applyBaseSheetStyle(sources);
styleTitle(sources, sources.getRange("A1:H1"), "来源层级与官方抽样核验");
sources.getRange("A2:H2").merge();
sources.getRange("A2").values = [["全量数字来源为公开二手汇总；本表记录官方抽样核验，不代表1248条均已逐项官方复算。官网入口与数字直接出处必须区分。"]];
sources.getRange("A2:H2").format = { fill: COLORS.paleYellow, font: { color: "#9C6500", bold: true }, wrapText: true };
sources.getRange("A2:H2").format.rowHeight = 34;
const sourceHeaders = ["核验类型", "学校/专业", "官方证据URL", "官方观察值", "二手汇总值", "核验结论", "覆盖范围", "备注"];
sources.getRange("A4:H4").values = [sourceHeaders];
styleHeader(sources.getRange("A4:H4"));
const sourceRows = [
  ["录取成绩逐人复算", "南开大学 计算机科学与技术", "https://cc.nankai.edu.cn/2026/0401/c13297a597350/page.htm", "拟录取4人；初试418、387、370、366；均分385.25", "4人；385[366-418]", "吻合（均分取整）", "普通一志愿", "官方页面明确标注是否拟录取"],
  ["复试线核验", "北京工业大学 081200计算机科学与技术", "https://yanzhao.bjut.edu.cn/info/1025/18011.htm", "复试线336", "复试线336", "吻合", "复试线", "同校085404二手表存在列错位，已在全量明细标异常"],
  ["复试线核验", "南京邮电大学 081200计算机科学与技术", "https://yzb.njupt.edu.cn/2026/0319/c7797a298050/page.htm", "复试线303", "复试线303", "吻合", "复试线", "录取均分仍来自二手汇总"],
  ["408科目核验", "中国科学院计算技术研究所 085404", "https://www.ict.ac.cn/xwgg/tzgg/202507/t20250707_7881009.html", "2026初试科目含408", "22408", "吻合", "招生目录", "不用于证明录取均分"],
  ["全量数字来源", "208所院校、1248条记录", "https://noobdream.com/zexiao/", "—", "2026录取数据汇总", "二手来源", "全量", "当前页面面向2027择校，使用最近一届2026录取数据"],
];
sources.getRange(`A5:H${4 + sourceRows.length}`).values = sourceRows;
const sourceTable = sources.tables.add(`A4:H${4 + sourceRows.length}`, true, "VerificationSourcesTable");
sourceTable.style = "TableStyleMedium2";
sources.getRange(`A5:H${4 + sourceRows.length}`).format.wrapText = true;
sources.getRange(`A5:H${4 + sourceRows.length}`).format.verticalAlignment = "top";
for (const [col, width] of Object.entries({ A: 18, B: 32, C: 55, D: 38, E: 28, F: 20, G: 18, H: 42 })) {
  sources.getRange(`${col}:${col}`).format.columnWidth = width;
}
sources.freezePanes.freezeRows(4);

applyBaseSheetStyle(definitions);
styleTitle(definitions, definitions.getRange("A1:H1"), "统计口径、字段定义与限制");
definitions.getRange("A3:B3").values = [["主题", "说明"]];
styleHeader(definitions.getRange("A3:B3"));
const definitionRows = [
  ["26届定义", "指2026年硕士研究生招生、2026年拟录取/入学结果。"],
  ["408院校分母", "在数据页中至少一个专业/方向的初试科目文本包含408；学校只有部分专业考408时，仅收录对应记录。"],
  ["拟录取平均分", "录取考生初试总分的平均值，不是复试线，也不是加权后的入学总成绩。原文常写为“平均分[最低分-最高分]”。"],
  ["复试线", "优先解析复试线原文中的第一个三位数；单科线仍保留在原文。NC、无或明显两位数不会强行当作总分线。"],
  ["录取人数", "“首个数字”只为便于筛选。遇到“56+3专项”“3+14调剂”等，必须以录取人数原文为准。"],
  ["普通一志愿主表", "文本中未出现调剂、专项、补录或非全日制标记的记录。由于二手来源可能省略标签，因此属于“普通/未标明”，不是官方逐条确认。"],
  ["专项调剂非全", "只要学院、专业、复试人数、录取人数或录取分数字段出现相关关键词，就移入该表；混合行不拆分推算。"],
  ["置信等级B", "标准8列结构且拟录取分数能稳定解析；数字仍属于二手汇总，目标院校报考前应复核官方公告。"],
  ["置信等级C", "可解析部分数字，但存在类别混合、合并单元格、列错位或复杂文本。"],
  ["置信等级D", "拟录取分数缺失或文本无法可靠解析。"],
  ["院校均值", "院校目录中的“专业均分均值”对各专业已知平均分做未加权平均，不等于学校全部录取考生的加权平均。"],
  ["官方入口", "来自院校或学院官网链接，仅作为继续核验入口；除“来源与核验”中明确列出的样本外，不表示数字已由官网逐项确认。"],
  ["隐私处理", "工作簿只保存学校/专业级汇总，不汇总考生姓名、考号等个人信息。"],
  ["更新时间", "数据抓取与工作簿生成日期：2026-08-19。网页后续撤稿、补录或更正不会自动同步。"],
];
definitions.getRange(`A4:B${3 + definitionRows.length}`).values = definitionRows;
definitions.getRange(`A4:A${3 + definitionRows.length}`).format = { fill: COLORS.paleBlue, font: { bold: true, color: COLORS.navy }, verticalAlignment: "top" };
definitions.getRange(`B4:B${3 + definitionRows.length}`).format = { wrapText: true, verticalAlignment: "top" };
definitions.getRange(`A3:B${3 + definitionRows.length}`).format.borders = { preset: "inside", style: "thin", color: "#D9E1F2" };
definitions.getRange("A:A").format.columnWidth = 24;
definitions.getRange("B:B").format.columnWidth = 110;
definitions.getRange(`A4:B${3 + definitionRows.length}`).format.rowHeight = 38;
definitions.freezePanes.freezeRows(3);

const overviewInspect = await wb.inspect({
  kind: "table",
  range: "概览!A1:N20",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 14,
  maxChars: 8000,
});
console.log(overviewInspect.ndjson);

const schoolInspect = await wb.inspect({
  kind: "table",
  range: "院校目录!A1:L12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 12,
  maxChars: 6000,
});
console.log(schoolInspect.ndjson);

const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
  maxChars: 5000,
});
console.log(errors.ndjson);

const renderSpecs = [
  ["概览", "A1:N42", "overview.png"],
  ["普通一志愿", "A1:AB18", "ordinary.png"],
  ["专项调剂非全", "A1:AB18", "special.png"],
  ["院校目录", "A1:L28", "schools.png"],
  ["全量明细", "A1:AB18", "all_detail.png"],
  ["来源与核验", "A1:H12", "sources.png"],
  ["口径说明", "A1:H18", "definitions.png"],
];
for (const [sheetName, range, fileName] of renderSpecs) {
  const preview = await wb.render({ sheetName, range, scale: 1.2, format: "png" });
  await fs.writeFile(path.join(previewDir, fileName), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, previewDir, sheets: renderSpecs.map(item => item[0]) }));
