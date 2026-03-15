#!/usr/bin/env node
/**
 * knowledge/web 知识库数据质量检查与清洗脚本
 * 策略：宁可误伤，不要错放——凡疑似脏数据一律清理，优先保证数据纯净。
 *
 * 用法:
 *   node scripts/clean-knowledge.mjs              # 仅检查并输出报告
 *   node scripts/clean-knowledge.mjs --fix        # 检查并应用激进清洗
 *   node scripts/clean-knowledge.mjs --report     # 检查并输出 JSON 报告到 knowledge-report.json
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_WEB = path.join(__dirname, "..", "knowledge", "web");

// ---------------------------------------------------------------------------
// 脏数据模式（基于随机抽查归纳）
// ---------------------------------------------------------------------------

const PATTERNS = {
  // 空占位：链接/术语被剥离后留下的顿号或冒号+顿号
  emptyPlaceholder: {
    regex: /[：:]\s*、|、\s*、|、\s*等/g,
    description: "空占位（顿号/冒号+顿号）",
  },
  // 表格中空单元格（|  |  |）
  emptyTablePlaceholder: {
    regex: /\|\s*\|\s*\|/g,
    description: "表格空单元格",
  },
  // 连续 4 个及以上空格（多为缺失词留下的空隙；3 空格常见于代码缩进故不报）
  multipleSpaces: {
    regex: /[^\s]\s{4,}[^\s]|\s{4,}$/gm,
    description: "连续多空格（可能缺失词语）",
  },
  // 行首“空格+顿号+冒号”的定义列表项（术语缺失）
  emptyDefinitionTerm: {
    regex: /^\s{1,3}-\s*:\s+/gm,
    description: "定义列表项术语缺失（`  - :` 前应有术语）",
  },
  // 表格行中仅含空格的单元格（|   |   |）
  emptyTableCells: {
    regex: /^\|(\s*\|\s*)+\|$/gm,
    description: "整行表格单元格均为空",
  },
  // 常见笔误（--fix 时会自动替换）
  typos: [
    { regex: /\briangle\b/g, fix: "triangle", description: "拼写: riddle -> triangle" },
    { regex: /\bStrict_mode\b/g, fix: "严格模式", description: "Strict_mode -> 严格模式" },
  ],
  // 句末单字“例”（多为“例如”被截断）
  truncatedExample: {
    regex: /[。，]\s*例\s*$/gm,
    description: "可能截断的“例如”",
  },
  // 仅在前 N 行内检测，避免正文中的 ---（水平线、代码）被误判
  frontmatterNoNewline: {
    maxLines: 15,
    regex: /^---\r?\n[\s\S]*?---[^\r\n\-\s]/,
    description: "frontmatter 闭合 --- 后无换行",
  },
};

// ---------------------------------------------------------------------------
// 扫描 knowledge/web 下所有 .md 文件
// ---------------------------------------------------------------------------

async function findMarkdownFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(full)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// 对单个文件做检查，返回问题列表
// ---------------------------------------------------------------------------

function checkFile(content, filePath) {
  const issues = [];
  const lines = content.split(/\r?\n/);
  const relPath = path.relative(path.join(KNOWLEDGE_WEB, ".."), filePath);

  // 空占位
  for (const m of content.matchAll(PATTERNS.emptyPlaceholder.regex)) {
    const lineNum = content.slice(0, m.index).split(/\r?\n/).length;
    issues.push({
      file: relPath,
      line: lineNum,
      category: "empty_placeholder",
      description: PATTERNS.emptyPlaceholder.description,
      snippet: (lines[lineNum - 1] || "").trim().slice(0, 80),
    });
  }

  // 多空格
  for (const m of content.matchAll(PATTERNS.multipleSpaces.regex)) {
    const lineNum = content.slice(0, m.index).split(/\r?\n/).length;
    issues.push({
      file: relPath,
      line: lineNum,
      category: "multiple_spaces",
      description: PATTERNS.multipleSpaces.description,
      snippet: (lines[lineNum - 1] || "").trim().slice(0, 80),
    });
  }

  // 空定义术语
  for (const m of content.matchAll(PATTERNS.emptyDefinitionTerm.regex)) {
    const lineNum = content.slice(0, m.index).split(/\r?\n/).length;
    issues.push({
      file: relPath,
      line: lineNum,
      category: "empty_definition_term",
      description: PATTERNS.emptyDefinitionTerm.description,
      snippet: (lines[lineNum - 1] || "").trim().slice(0, 80),
    });
  }

  // 空表格行
  for (const m of content.matchAll(PATTERNS.emptyTableCells.regex)) {
    const lineNum = content.slice(0, m.index).split(/\r?\n/).length;
    issues.push({
      file: relPath,
      line: lineNum,
      category: "empty_table_row",
      description: PATTERNS.emptyTableCells.description,
      snippet: (lines[lineNum - 1] || "").trim().slice(0, 80),
    });
  }

  // 表格空单元格
  for (const m of content.matchAll(PATTERNS.emptyTablePlaceholder.regex)) {
    const lineNum = content.slice(0, m.index).split(/\r?\n/).length;
    issues.push({
      file: relPath,
      line: lineNum,
      category: "empty_table_cell",
      description: PATTERNS.emptyTablePlaceholder.description,
      snippet: (lines[lineNum - 1] || "").trim().slice(0, 80),
    });
  }

  // 截断的“例”
  for (const m of content.matchAll(PATTERNS.truncatedExample.regex)) {
    const lineNum = content.slice(0, m.index).split(/\r?\n/).length;
    issues.push({
      file: relPath,
      line: lineNum,
      category: "truncated_example",
      description: PATTERNS.truncatedExample.description,
      snippet: (lines[lineNum - 1] || "").trim().slice(0, 80),
    });
  }

  // frontmatter 粘连（只在前 N 行内检测，减少误报）
  const head = lines.slice(0, PATTERNS.frontmatterNoNewline.maxLines).join("\n");
  if (PATTERNS.frontmatterNoNewline.regex.test(head)) {
    issues.push({
      file: relPath,
      line: 1,
      category: "frontmatter_no_newline",
      description: PATTERNS.frontmatterNoNewline.description,
      snippet: "(文件首部)",
    });
  }

  // 笔误（仅记录，--fix 时再替换）
  for (const { regex, fix, description } of PATTERNS.typos) {
    for (const m of content.matchAll(regex)) {
      const lineNum = content.slice(0, m.index).split(/\r?\n/).length;
      issues.push({
        file: relPath,
        line: lineNum,
        category: "typo",
        description,
        snippet: (lines[lineNum - 1] || "").trim().slice(0, 80),
        fix,
        match: m[0],
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 激进清洗 + RAG 优化：修 frontmatter、减误伤、清空占位
// - frontmatter 结束 --- 后强制换行，避免与正文粘连
// - 多空格仅 4+ -> 2（保留代码块 2 格缩进）
// - 无术语的「  - : 描述」改为「  - 描述」，仅「  - : 」的行删除
// - 空表格行删除，空单元格用 — 占位；孤立顿号、纯标点行、BOM、多余换行清理
// ---------------------------------------------------------------------------

function applyAggressiveFixes(content, filePath) {
  let next = content;
  // 0. 去掉 BOM
  if (next.charCodeAt(0) === 0xfeff) next = next.slice(1);

  // 1. frontmatter 优化：闭合 --- 与正文粘连时拆成「单独一行 ---」+ 空行 + 正文
  next = next.replace(/^(---\r?\n[\s\S]*?)\s---([^\r\n\-])/m, "$1\n---\n\n$2");
  // 闭合 --- 后紧跟空格+同行正文（如 "--- **`console`**"）-> 换行后保留正文
  next = next.replace(/(^---\r?\n[\s\S]*?)--- (\s+[^\r\n]*)(\r?\n|$)/m, "$1---\n\n$2$3");
  // 已写成「某行末尾 ---\n\n」的，把 --- 提到单独一行
  next = next.replace(/(\S) ---\r?\n\r?\n/g, "$1\n---\n\n");

  // 2. 连续 4+ 空格 -> 2 空格（不压 2 格代码缩进，减少误伤）
  next = next.replace(/([^\s])(\s{4,})([^\s])/g, "$1  $3");
  next = next.replace(/([^\s])(\s{4,})$/gm, "$1  ");

  // 3. 笔误
  for (const { regex, fix } of PATTERNS.typos) {
    next = next.replace(regex, fix);
  }

  // 4. 空占位：、、 -> 、；、 等 -> 等；：、 -> ：；行首/行尾孤立顿号删掉
  next = next.replace(/、(\s*、)+/g, "、");
  next = next.replace(/、\s*等\b/g, "等");
  next = next.replace(/[：:]\s*、/g, (m) => m.charAt(0));
  next = next.replace(/^、\s*/gm, "");
  next = next.replace(/\s*、$/gm, "");
  // 冒号/逗号后孤立的「 或。」「 或，」删掉（缺词残留）
  next = next.replace(/([：,])\s*或([。，])/g, "$1$2");
  // 「、标头」「 、标头」->「 标头」
  next = next.replace(/、\s*标头/g, " 标头");
  // 「、 属性」「、属性」「、 所」「、所」等：顿号+（可选空格）+属性/所 多为空占位，去掉顿号
  next = next.replace(/、\s*属性/g, " 属性");
  next = next.replace(/、\s*所/g, " 所");
  // 句末缺词「X：。」（如「方法包括：。」）->「X。」
  next = next.replace(/([\u4e00-\u9fff])：\s*。(?=\s|$)/g, "$1。");

  // 5. 截断的「例」->「例如」
  next = next.replace(/([。，])\s*例\s*$/gm, "$1 例如");

  // 6. 表格：空单元格 -> —；整行空表格 -> 删除该行
  while (/\|\s+\|/.test(next)) next = next.replace(/\|\s+\|/g, "| — |");
  next = next.replace(/^\|(\s*\|\s*)+\|$/gm, "");

  // 7. 脏定义行：`  - : 描述` -> `  - 描述`；仅 `  - : ` 无内容 -> 整行删除
  next = next.replace(/^(\s{1,3})-\s*:\s+(.*)$/gm, (_, indent, rest) =>
    rest.trim() ? `${indent}- ${rest.trim()}` : ""
  );

  // 8. 仅由标点/空白组成的行整行删除
  next = next.replace(/^\s*[、：:]\s*$/gm, "");
  next = next.replace(/^\s*、+\s*$/gm, "");

  // 9. 连续 3+ 换行 -> 2；文件末尾至多一个换行
  next = next.replace(/\n{4,}/g, "\n\n\n");
  next = next.replace(/\n{3,}/g, "\n\n");
  next = next.replace(/\n+$/, "\n");

  // 10. 再次收紧连续空行
  next = next.replace(/\n{3,}/g, "\n\n");
  next = next.replace(/\n+$/, "\n");

  return next;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const doFix = args.includes("--fix");
  const doReport = args.includes("--report");

  const knowledgeDir = KNOWLEDGE_WEB;
  try {
    await fs.access(knowledgeDir);
  } catch {
    console.error("❌ 未找到目录: " + knowledgeDir);
    process.exit(1);
  }

  const files = await findMarkdownFiles(knowledgeDir);
  const allIssues = [];
  let fixedCount = 0;

  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf-8");
    const issues = checkFile(content, filePath);
    allIssues.push(...issues.map((i) => ({ ...i, absolutePath: filePath })));

    if (doFix) {
      const newContent = applyAggressiveFixes(content, filePath);
      if (newContent !== content) {
        await fs.writeFile(filePath, newContent, "utf-8");
        fixedCount++;
      }
    }
  }

  // 按类别统计
  const byCategory = {};
  for (const i of allIssues) {
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
  }

  console.log("\n" + "=".repeat(50));
  console.log("knowledge/web 数据质量检查报告");
  console.log("=".repeat(50));
  console.log("扫描文件数:", files.length);
  console.log("发现问题数:", allIssues.length);
  console.log("按类别:", JSON.stringify(byCategory, null, 2));
  if (doFix) console.log("已自动修复文件数:", fixedCount);
  console.log("=".repeat(50));

  if (allIssues.length > 0) {
    console.log("\n前 30 条问题预览（文件:行 | 类别 | 片段）:\n");
    allIssues.slice(0, 30).forEach((i) => {
      console.log(`${i.file}:${i.line} | ${i.category} | ${i.snippet || "-"}`);
    });
  }

  if (doReport) {
    const reportPath = path.join(__dirname, "..", "knowledge-report.json");
    await fs.writeFile(
      reportPath,
      JSON.stringify(
        {
          scannedAt: new Date().toISOString(),
          totalFiles: files.length,
          totalIssues: allIssues.length,
          byCategory,
          issues: allIssues.map(({ absolutePath, ...rest }) => rest),
        },
        null,
        2
      ),
      "utf-8"
    );
    console.log("\n📄 完整报告已写入: " + reportPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
