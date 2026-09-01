import { createHash } from 'node:crypto';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import PptxGenJS from 'pptxgenjs-plus';
import ExcelJS from 'exceljs-hardened';
import mammoth from 'mammoth';
import { authenticatePhase6, phase6Supabase } from './phase6AiRuntime';

const PRIVATE_BUCKET = 'spip-ai-private';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_ARTIFACT_CHARS = 120_000;

type ArtifactFormat = 'docx' | 'pdf' | 'pptx' | 'xlsx' | 'txt';

type Section = {
  heading?: string;
  paragraphs: string[];
  bullets: string[];
};

function safeName(input: string, fallback: string) {
  const value = String(input || '').trim().replace(/[^a-zA-Z0-9._ -]+/g, '').replace(/\s+/g, ' ').slice(0, 100);
  return value || fallback;
}

function extensionForMime(mime: string, filename: string) {
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (ext) return ext;
  if (mime.includes('wordprocessingml')) return 'docx';
  if (mime.includes('spreadsheetml')) return 'xlsx';
  if (mime.includes('csv')) return 'csv';
  if (mime.includes('json')) return 'json';
  if (mime.startsWith('text/')) return 'txt';
  return 'bin';
}

function parseSections(content: string): Section[] {
  const lines = String(content || '').replace(/\r/g, '').split('\n');
  const sections: Section[] = [];
  let current: Section = { paragraphs: [], bullets: [] };

  const flush = () => {
    if (current.heading || current.paragraphs.length || current.bullets.length) sections.push(current);
    current = { paragraphs: [], bullets: [] };
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^#{1,4}\s+(.+)/) || line.match(/^([A-Z][A-Z0-9 &/():,'’-]{4,})$/);
    if (heading) {
      flush();
      current.heading = heading[1] || heading[0];
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.+)/) || line.match(/^\d+[.)]\s+(.+)/);
    if (bullet) current.bullets.push(bullet[1]);
    else current.paragraphs.push(line);
  }
  flush();
  return sections.length ? sections : [{ paragraphs: [content], bullets: [] }];
}

function wrapText(text: string, max = 88) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

async function renderDocx(title: string, content: string) {
  const sections = parseSections(content);
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: 'SCM Capital Asset Management', bold: true, size: 20 })], spacing: { after: 220 } }),
  ];

  for (const section of sections) {
    if (section.heading) children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));
    for (const text of section.paragraphs) children.push(new Paragraph({ children: [new TextRun({ text, size: 22 })], spacing: { after: 160 } }));
    for (const bullet of section.bullets) children.push(new Paragraph({ text: bullet, bullet: { level: 0 }, spacing: { after: 80 } }));
  }

  const doc = new Document({
    creator: 'SCM Intelligence Copilot',
    title,
    description: 'Draft generated within SCM Prospect Intelligence Platform',
    sections: [{ properties: {}, headers: {}, footers: {}, children }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

async function renderPdf(title: string, content: string) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 54;
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;

  const addLine = (text: string, size = 10.5, isBold = false, gap = 15) => {
    if (y < margin + 30) {
      page = pdf.addPage(pageSize);
      y = pageSize[1] - margin;
    }
    page.drawText(text, { x: margin, y, size, font: isBold ? bold : regular, color: rgb(0.08, 0.12, 0.18) });
    y -= gap;
  };

  addLine(title, 18, true, 26);
  addLine('SCM Capital Asset Management', 10, true, 24);
  for (const section of parseSections(content)) {
    if (section.heading) {
      y -= 6;
      for (const line of wrapText(section.heading, 62)) addLine(line, 12.5, true, 18);
    }
    for (const paragraph of section.paragraphs) {
      for (const line of wrapText(paragraph, 92)) addLine(line, 10.5, false, 14);
      y -= 6;
    }
    for (const bullet of section.bullets) {
      for (const line of wrapText(`• ${bullet}`, 88)) addLine(line, 10.5, false, 14);
    }
  }
  return Buffer.from(await pdf.save());
}

async function renderPptx(title: string, content: string) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'SCM Intelligence Copilot';
  pptx.subject = 'SCM Capital Asset Management draft';
  pptx.title = title;
  pptx.company = 'SCM Capital Asset Management';
  pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos' };

  const cover = pptx.addSlide();
  cover.background = { color: '091B2D' };
  cover.addText(title, { x: 0.8, y: 2.0, w: 11.6, h: 1.0, fontFace: 'Aptos Display', fontSize: 28, bold: true, color: 'FFFFFF' });
  cover.addText('SCM Capital Asset Management', { x: 0.8, y: 3.1, w: 11.5, h: 0.4, fontSize: 14, color: 'D7DEE8' });
  cover.addShape(pptx.ShapeType.rect, { x: 0.8, y: 3.8, w: 1.4, h: 0.08, line: { color: 'B1191F' }, fill: { color: 'B1191F' } });

  parseSections(content).slice(0, 18).forEach((section, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };
    slide.addText(section.heading || `Section ${index + 1}`, { x: 0.7, y: 0.55, w: 12.0, h: 0.55, fontSize: 22, bold: true, color: '091B2D' });
    slide.addShape(pptx.ShapeType.line, { x: 0.7, y: 1.2, w: 12.0, h: 0, line: { color: 'B1191F', width: 2 } });
    const body = [
      ...section.paragraphs.map((text) => ({ text, options: { bullet: false, breakLine: true } })),
      ...section.bullets.map((text) => ({ text, options: { bullet: { indent: 16 }, breakLine: true } })),
    ];
    slide.addText(body.length ? body : [{ text: 'No additional content supplied.', options: {} }], {
      x: 0.9, y: 1.55, w: 11.5, h: 5.2, fontSize: 16, color: '334155', breakLine: false,
      margin: 0.08, valign: 'top', paraSpaceAfter: 10,
    });
    slide.addText('SCM Capital Asset Management', { x: 0.9, y: 7.05, w: 5, h: 0.2, fontSize: 8, color: '94A3B8' });
  });

  const data = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(data) ? data : Buffer.from(data as any);
}

async function renderXlsx(title: string, content: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SCM Intelligence Copilot';
  const sheet = workbook.addWorksheet('Copilot Output');
  sheet.columns = [{ width: 18 }, { width: 100 }];
  sheet.addRow(['SCM Capital Asset Management']);
  sheet.addRow([title]);
  sheet.addRow([]);
  for (const section of parseSections(content)) {
    if (section.heading) sheet.addRow([section.heading]);
    section.paragraphs.forEach((p) => sheet.addRow([p]));
    section.bullets.forEach((b) => sheet.addRow(['•', b]));
    sheet.addRow([]);
  }
  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data as any);
}

async function renderArtifact(format: ArtifactFormat, title: string, content: string) {
  switch (format) {
    case 'docx': return { buffer: await renderDocx(title, content), mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    case 'pdf': return { buffer: await renderPdf(title, content), mime: 'application/pdf' };
    case 'pptx': return { buffer: await renderPptx(title, content), mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
    case 'xlsx': return { buffer: await renderXlsx(title, content), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    default: return { buffer: Buffer.from(content, 'utf8'), mime: 'text/plain; charset=utf-8' };
  }
}

export async function generateArtifact(req: any) {
  const identity = await authenticatePhase6(req);
  if (!identity) return { status: 401, body: { error: 'Authentication required.' } };

  const format = String(req.body?.format || '').toLowerCase() as ArtifactFormat;
  if (!['docx', 'pdf', 'pptx', 'xlsx', 'txt'].includes(format)) return { status: 400, body: { error: 'Unsupported export format.' } };
  const conversationId = String(req.body?.conversationId || '').trim();
  const title = safeName(req.body?.title || 'SCM Intelligence Draft', 'SCM Intelligence Draft');
  let content = String(req.body?.content || '').trim();

  if (conversationId) {
    const { data: conversation } = await phase6Supabase.from('spip_ai_conversations').select('id').eq('id', conversationId).eq('user_id', identity.id).maybeSingle();
    if (!conversation) return { status: 404, body: { error: 'Conversation not found.' } };
    if (!content) {
      const { data: latest } = await phase6Supabase
        .from('spip_ai_messages').select('content')
        .eq('conversation_id', conversationId).eq('user_id', identity.id).eq('role', 'assistant')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      content = String(latest?.content || '').trim();
    }
  }

  if (!content) return { status: 400, body: { error: 'There is no generated content to export.' } };
  if (content.length > MAX_ARTIFACT_CHARS) return { status: 413, body: { error: 'This draft is too large to export in one file.' } };

  const { buffer, mime } = await renderArtifact(format, title, content);
  const fileName = `${safeName(title, 'SCM-Intelligence-Draft').replace(/\s+/g, '-')}.${format}`;
  const storagePath = `${identity.id}/artifacts/${Date.now()}-${fileName}`;
  const { error: uploadError } = await phase6Supabase.storage.from(PRIVATE_BUCKET).upload(storagePath, buffer, { contentType: mime, upsert: false });
  if (uploadError) return { status: 500, body: { error: 'The export could not be stored securely.' } };

  const { data: artifact, error: insertError } = await phase6Supabase.from('spip_ai_artifacts').insert({
    user_id: identity.id, conversation_id: conversationId || null, artifact_type: format, title,
    storage_path: storagePath, mime_type: mime, byte_size: buffer.byteLength,
    metadata: { generatedBy: 'SCM Intelligence Copilot' },
  }).select('id').single();
  if (insertError) {
    await phase6Supabase.storage.from(PRIVATE_BUCKET).remove([storagePath]);
    return { status: 500, body: { error: 'The export record could not be created.' } };
  }

  const { data: signed } = await phase6Supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(storagePath, 300);
  return { status: 201, body: { id: artifact.id, format, title, fileName, signedUrl: signed?.signedUrl || null } };
}

async function extractDocument(buffer: Buffer, filename: string, mimeType: string) {
  const ext = extensionForMime(mimeType, filename);
  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const parts: string[] = [];
    workbook.eachSheet((sheet) => {
      const rows: string[] = [];
      sheet.eachRow({ includeEmpty: false }, (row) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        rows.push(values.map((value: any) => {
          if (value == null) return '';
          if (typeof value === 'object' && 'text' in value) return String(value.text || '');
          if (typeof value === 'object' && 'result' in value) return String(value.result ?? '');
          return String(value);
        }).join(','));
      });
      parts.push(`SHEET: ${sheet.name}\n${rows.join('\n')}`);
    });
    return parts.join('\n\n').trim();
  }
  if (['txt', 'md', 'csv', 'json'].includes(ext) || mimeType.startsWith('text/')) return buffer.toString('utf8').trim();
  throw new Error('This file type is not yet extractable. Use DOCX, XLSX, CSV, TXT, MD or JSON as source material.');
}

export async function ingestDocument(req: any) {
  const identity = await authenticatePhase6(req);
  if (!identity) return { status: 401, body: { error: 'Authentication required.' } };

  const filename = safeName(req.body?.filename || 'source.txt', 'source.txt');
  const mimeType = String(req.body?.mimeType || 'application/octet-stream').slice(0, 160);
  const base64 = String(req.body?.base64 || '');
  const workspaceId = String(req.body?.workspaceId || '').trim() || null;
  const conversationId = String(req.body?.conversationId || '').trim() || null;
  if (!base64) return { status: 400, body: { error: 'No file data received.' } };

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) return { status: 413, body: { error: 'Source files must be smaller than 5 MB.' } };
  if (conversationId) {
    const { data: conversation } = await phase6Supabase.from('spip_ai_conversations').select('id').eq('id', conversationId).eq('user_id', identity.id).maybeSingle();
    if (!conversation) return { status: 404, body: { error: 'Conversation not found.' } };
  }

  let extractedText = '';
  try {
    extractedText = (await extractDocument(buffer, filename, mimeType)).slice(0, 80_000);
  } catch (error: any) {
    return { status: 415, body: { error: String(error?.message || 'Unsupported source document.') } };
  }

  const hash = createHash('sha256').update(buffer).digest('hex');
  const storagePath = `${identity.id}/documents/${Date.now()}-${filename.replace(/\s+/g, '-')}`;
  const { error: uploadError } = await phase6Supabase.storage.from(PRIVATE_BUCKET).upload(storagePath, buffer, { contentType: mimeType, upsert: false });
  if (uploadError) return { status: 500, body: { error: 'The source document could not be stored securely.' } };

  const { data: document, error: insertError } = await phase6Supabase.from('spip_ai_documents').insert({
    user_id: identity.id, workspace_id: workspaceId, conversation_id: conversationId, filename,
    mime_type: mimeType, storage_path: storagePath, byte_size: buffer.byteLength, sha256: hash,
    extracted_text: extractedText, extraction_status: 'READY',
  }).select('id, filename, mime_type, byte_size, extraction_status').single();

  if (insertError) {
    await phase6Supabase.storage.from(PRIVATE_BUCKET).remove([storagePath]);
    return { status: 500, body: { error: 'The source document could not be indexed.' } };
  }

  return { status: 201, body: { document, extractedCharacters: extractedText.length } };
}
