import { createRequire } from 'node:module';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ExcelJS from 'exceljs-hardened';
import { authenticatePhase6, phase6Supabase } from './phase6AiRuntime.js';

const PRIVATE_BUCKET = 'spip-ai-private';
const MAX_ARTIFACT_CHARS = 120_000;
const nodeRequire = createRequire(import.meta.url);

type ArtifactFormat = 'docx' | 'pdf' | 'pptx' | 'xlsx' | 'txt';
type Block =
  | { type: 'heading'; text: string; level: number }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

function safeName(input: string, fallback: string) {
  const value = String(input || '').trim().replace(/[^a-zA-Z0-9._ -]+/g, '').replace(/\s+/g, ' ').slice(0, 100);
  return value || fallback;
}

function splitTableRow(line: string) {
  const value = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';
  let escaped = false;
  for (const char of value) {
    if (escaped) { current += char; escaped = false; }
    else if (char === '\\') escaped = true;
    else if (char === '|') { cells.push(current.trim()); current = ''; }
    else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function isSeparatorRow(line: string) {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseBlocks(content: string): Block[] {
  const lines = String(content || '').replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) { i += 1; continue; }

    if (line.includes('|') && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const headers = splitTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: 'heading', text: heading[2], level: heading[1].length });
      i += 1;
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.+)$/) || line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet) {
      blocks.push({ type: 'bullet', text: bullet[1] });
      i += 1;
      continue;
    }
    blocks.push({ type: 'paragraph', text: line });
    i += 1;
  }
  return blocks;
}

function wrapText(text: string, max = 88) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) { lines.push(current); current = word; }
    else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

async function renderDocx(title: string, content: string) {
  const children: Array<Paragraph | Table> = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: 'SCM Capital Asset Management', bold: true })], spacing: { after: 220 } }),
  ];
  for (const block of parseBlocks(content)) {
    if (block.type === 'heading') {
      children.push(new Paragraph({ text: block.text, heading: block.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2 }));
    } else if (block.type === 'paragraph') {
      children.push(new Paragraph({ children: [new TextRun({ text: block.text })], spacing: { after: 140 } }));
    } else if (block.type === 'bullet') {
      children.push(new Paragraph({ text: block.text, bullet: { level: 0 } }));
    } else {
      const allRows = [block.headers, ...block.rows];
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: allRows.map((row, rowIndex) => new TableRow({
          children: row.map((cell) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: cell, bold: rowIndex === 0 })] })],
          })),
        })),
      }));
    }
  }
  const doc = new Document({ creator: 'SCM Intelligence Copilot', title, sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

async function renderPdf(title: string, content: string) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 48;
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;
  const pdfSafe = (text: string) => text
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/•/g, '-').replace(/…/g, '...').replace(/[^\x20-\x7E\n]/g, '');
  const newPage = () => { page = pdf.addPage(pageSize); y = pageSize[1] - margin; };
  const ensureSpace = (height: number) => { if (y - height < margin) newPage(); };
  const add = (text: string, size = 10, isBold = false, indent = 0) => {
    for (const line of wrapText(pdfSafe(text), indent ? 82 : 90)) {
      if (y < 60) newPage();
      page.drawText(line, { x: margin + indent, y, size, font: isBold ? bold : regular, color: rgb(0.05, 0.1, 0.17) });
      y -= size + 5;
    }
    y -= 3;
  };
  const addTable = (headers: string[], rows: string[][]) => {
    const columnCount = Math.max(1, headers.length);
    const tableWidth = pageSize[0] - (margin * 2);
    const columnWidth = tableWidth / columnCount;
    const fontSize = columnCount > 4 ? 7 : 8.5;
    const lineHeight = fontSize + 3;
    const horizontalPadding = 5;
    const charsPerLine = Math.max(8, Math.floor((columnWidth - horizontalPadding * 2) / (fontSize * 0.52)));

    const drawRow = (cells: string[], header: boolean) => {
      const wrapped = headers.map((_, index) => wrapText(pdfSafe(cells[index] || ''), charsPerLine).slice(0, 8));
      const rowHeight = Math.max(24, Math.max(...wrapped.map((lines) => lines.length), 1) * lineHeight + 10);
      ensureSpace(rowHeight);
      const rowBottom = y - rowHeight;
      wrapped.forEach((lines, index) => {
        const x = margin + index * columnWidth;
        page.drawRectangle({
          x, y: rowBottom, width: columnWidth, height: rowHeight,
          color: header ? rgb(0.94, 0.96, 0.98) : rgb(1, 1, 1),
          borderColor: rgb(0.62, 0.68, 0.75), borderWidth: 0.7,
        });
        lines.forEach((line, lineIndex) => page.drawText(line, {
          x: x + horizontalPadding,
          y: y - 8 - fontSize - lineIndex * lineHeight,
          size: fontSize,
          font: header ? bold : regular,
          color: rgb(0.05, 0.1, 0.17),
        }));
      });
      y = rowBottom;
    };

    drawRow(headers, true);
    rows.forEach((row) => {
      if (y < margin + 30) {
        newPage();
        drawRow(headers, true);
      }
      drawRow(row, false);
    });
    y -= 12;
  };
  add(title, 18, true);
  add('SCM Capital Asset Management', 10, true);
  for (const block of parseBlocks(content)) {
    if (block.type === 'heading') add(block.text, block.level === 1 ? 14 : 12, true);
    else if (block.type === 'paragraph') add(block.text);
    else if (block.type === 'bullet') add(`- ${block.text}`, 10, false, 10);
    else addTable(block.headers, block.rows);
  }
  return Buffer.from(await pdf.save());
}

async function renderPptx(title: string, content: string) {
  // Vercel compiles this API entry as CommonJS. Loading the package through
  // createRequire selects its declared CJS export and, importantly, avoids
  // crashing every API route while the module is initialised.
  const pptxModule = nodeRequire('pptxgenjs');
  const PptxGenJS: any = pptxModule.default || pptxModule;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'SCM Intelligence Copilot';
  pptx.company = 'SCM Capital Asset Management';
  pptx.subject = 'SCM institutional draft';
  pptx.title = title;

  const cover = pptx.addSlide();
  cover.background = { color: '091B2D' };
  cover.addText(title, { x: 0.8, y: 2.0, w: 11.5, h: 1.1, fontSize: 28, bold: true, color: 'FFFFFF' });
  cover.addText('SCM Capital Asset Management', { x: 0.8, y: 3.2, w: 10.5, h: 0.35, fontSize: 14, color: 'E2E8F0' });
  cover.addShape(pptx.ShapeType.rect, { x: 0.8, y: 3.75, w: 1.5, h: 0.08, line: { color: 'B1191F' }, fill: { color: 'B1191F' } });

  const sections: Array<{ title: string; items: string[]; table?: { headers: string[]; rows: string[][] } }> = [];
  let current = { title: 'Overview', items: [] as string[] };
  for (const block of parseBlocks(content)) {
    if (block.type === 'heading') {
      if (current.items.length) sections.push(current);
      current = { title: block.text, items: [] };
    } else if (block.type === 'paragraph') current.items.push(block.text);
    else if (block.type === 'bullet') current.items.push(`• ${block.text}`);
    else {
      if (current.items.length) sections.push(current);
      sections.push({ title: current.title || 'Table', items: [], table: { headers: block.headers, rows: block.rows } });
      current = { title: 'Next', items: [] };
    }
  }
  if (current.items.length) sections.push(current);

  sections.slice(0, 20).forEach((section) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };
    slide.addText(section.title, { x: 0.7, y: 0.45, w: 12, h: 0.55, fontSize: 22, bold: true, color: '091B2D' });
    slide.addShape(pptx.ShapeType.line, { x: 0.7, y: 1.12, w: 12, h: 0, line: { color: 'B1191F', width: 2 } });
    if (section.table) {
      const tableRows = [section.table.headers, ...section.table.rows]
        .map((row) => row.map((cell) => ({ text: cell })));
      slide.addTable(tableRows, {
        x: 0.8, y: 1.5, w: 11.7, h: 4.8, border: { color: 'CBD5E1', pt: 1 },
        color: '334155', fontSize: 12, rowH: 0.45, fill: { color: 'FFFFFF' },
      });
    } else {
      const body = section.items.slice(0, 10).map((text) => ({
        text: text.startsWith('• ') ? text.slice(2) : text,
        options: { breakLine: true, bullet: text.startsWith('• ') ? { indent: 14 } : false },
      }));
      slide.addText(body, { x: 0.85, y: 1.5, w: 11.5, h: 5.2, fontSize: 16, color: '334155', valign: 'top', margin: 0.08, breakLine: false, paraSpaceAfter: 10 });
    }
    slide.addText('SCM Capital Asset Management', { x: 0.85, y: 7.05, w: 5, h: 0.2, fontSize: 8, color: '94A3B8' });
  });
  const data = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(data) ? data : Buffer.from(data as any);
}

async function renderXlsx(title: string, content: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SCM Intelligence Copilot';
  const sheet = workbook.addWorksheet('Copilot Output');
  sheet.columns = [{ width: 28 }, { width: 42 }, { width: 42 }, { width: 42 }];
  sheet.addRow(['SCM Capital Asset Management']);
  sheet.addRow([title]);
  sheet.addRow([]);
  for (const block of parseBlocks(content)) {
    if (block.type === 'heading') sheet.addRow([block.text]);
    else if (block.type === 'paragraph') sheet.addRow([block.text]);
    else if (block.type === 'bullet') sheet.addRow(['•', block.text]);
    else {
      sheet.addRow(block.headers);
      block.rows.forEach((row) => sheet.addRow(row));
      sheet.addRow([]);
    }
  }
  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data as any);
}

export async function renderArtifact(format: ArtifactFormat, title: string, content: string) {
  if (format === 'docx') return { buffer: await renderDocx(title, content), mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  if (format === 'pdf') return { buffer: await renderPdf(title, content), mime: 'application/pdf' };
  if (format === 'pptx') return { buffer: await renderPptx(title, content), mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
  if (format === 'xlsx') return { buffer: await renderXlsx(title, content), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  return { buffer: Buffer.from(content, 'utf8'), mime: 'text/plain; charset=utf-8' };
}

export async function generateArtifactV2(req: any) {
  const identity = await authenticatePhase6(req);
  if (!identity) return { status: 401, body: { error: 'Authentication required.' } };
  const format = String(req.body?.format || '').toLowerCase() as ArtifactFormat;
  if (!['docx','pdf','pptx','xlsx','txt'].includes(format)) return { status: 400, body: { error: 'Unsupported export format.' } };
  const conversationId = String(req.body?.conversationId || '').trim();
  const title = safeName(req.body?.title || 'SCM Intelligence Draft', 'SCM Intelligence Draft');
  let content = String(req.body?.content || '').trim();
  if (conversationId) {
    const { data: conversation } = await phase6Supabase.from('spip_ai_conversations').select('id').eq('id', conversationId).eq('user_id', identity.id).maybeSingle();
    if (!conversation) return { status: 404, body: { error: 'Conversation not found.' } };
    if (!content) {
      const { data: latest } = await phase6Supabase.from('spip_ai_messages').select('content').eq('conversation_id', conversationId).eq('user_id', identity.id).eq('role', 'assistant').order('created_at', { ascending: false }).limit(1).maybeSingle();
      content = String(latest?.content || '').trim();
    }
  }
  if (!content) return { status: 400, body: { error: 'There is no generated content to export.' } };
  if (content.length > MAX_ARTIFACT_CHARS) return { status: 413, body: { error: 'This draft is too large to export in one file.' } };

  const { buffer, mime } = await renderArtifact(format, title, content);
  const fileName = `${safeName(title, 'SCM-Intelligence-Draft').replace(/\s+/g, '-')}.${format}`;
  const storagePath = `${identity.id}/artifacts/${Date.now()}-${fileName}`;
  const { error: uploadError } = await phase6Supabase.storage.from(PRIVATE_BUCKET).upload(storagePath, buffer, { contentType: mime, upsert: false });
  if (uploadError) {
    console.error('[PHASE6 ARTIFACT STORAGE]', uploadError.message);
    return { status: 500, body: { error: 'The export could not be stored securely. Ensure Phase 6D database/storage repair has been applied.' } };
  }
  const { data: artifact, error: insertError } = await phase6Supabase.from('spip_ai_artifacts').insert({ user_id: identity.id, conversation_id: conversationId || null, artifact_type: format, title, storage_path: storagePath, mime_type: mime, byte_size: buffer.byteLength, metadata: { generatedBy: 'SCM Intelligence Copilot', renderer: 'v2' } }).select('id').single();
  if (insertError) {
    await phase6Supabase.storage.from(PRIVATE_BUCKET).remove([storagePath]);
    console.error('[PHASE6 ARTIFACT RECORD]', insertError.code, insertError.message);
    return { status: 500, body: { error: 'The export record could not be created. Ensure the Phase 6 AI schema is installed.' } };
  }
  const { data: signed, error: signedError } = await phase6Supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(storagePath, 300);
  if (signedError || !signed?.signedUrl) return { status: 500, body: { error: 'The export was created but a secure download link could not be issued.' } };
  return { status: 201, body: { id: artifact.id, format, title, fileName, signedUrl: signed.signedUrl } };
}
