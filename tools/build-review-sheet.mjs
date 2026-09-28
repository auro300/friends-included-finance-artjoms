import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/a/Documents/codex/friends-included-artjoms/outputs/review-sheet";
const workbook = Workbook.create();
const bodyFont = "Arial";

const definitions = [
  {
    name: "Sales",
    headers: [
      "Reference", "Submission time", "Salesperson", "Customer", "Project", "Description", "Amount",
      "Proposed Richard %", "Proposed Anastasia %", "Proposed Jean-Claude %",
      "Approved Richard %", "Approved Anastasia %", "Approved Jean-Claude %",
      "Richard earned", "Anastasia earned", "Jean-Claude earned", "Total commission",
      "Status", "Source", "Notification",
    ],
    widths: [14, 22, 18, 22, 12, 38, 15, 20, 22, 24, 20, 22, 24, 18, 20, 22, 18, 16, 14, 18],
  },
  {
    name: "Expenses",
    headers: [
      "Reference", "Submission time", "Reporter", "Description", "Category", "Amount",
      "Proposed allocation", "Final allocation", "Status", "Source", "Notification",
    ],
    widths: [14, 22, 18, 42, 16, 15, 24, 22, 20, 14, 18],
  },
];

for (const definition of definitions) {
  const sheet = workbook.worksheets.add(definition.name);
  const lastColumn = String.fromCharCode(64 + definition.headers.length);
  const header = sheet.getRange(`A1:${lastColumn}1`);
  header.values = [definition.headers];
  header.format = {
    fill: "#E8EAED",
    font: { name: bodyFont, size: 10, bold: true, color: "#202124" },
    verticalAlignment: "center",
    horizontalAlignment: "center",
    wrapText: true,
    borders: { preset: "outside", style: "thin", color: "#DADCE0" },
  };
  header.format.rowHeight = 34;
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = true;
  definition.widths.forEach((width, index) => {
    sheet.getCell(0, index).format.columnWidth = width;
  });
}

workbook.recalculate();
await fs.mkdir(outputDir, { recursive: true });

const sheetSummary = await workbook.inspect({
  kind: "sheet,region",
  maxChars: 4000,
  tableMaxRows: 4,
  tableMaxCols: 20,
});
await fs.writeFile(`${outputDir}/inspection.ndjson`, sheetSummary.ndjson, "utf8");

for (const definition of definitions) {
  const preview = await workbook.render({ sheetName: definition.name, range: `A1:${String.fromCharCode(64 + definition.headers.length)}4`, scale: 1 });
  await fs.writeFile(`${outputDir}/${definition.name.toLowerCase()}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/Friends Included Review Copy.xlsx`);
