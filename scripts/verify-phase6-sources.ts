import { Document, Packer, Paragraph } from 'docx';
import ExcelJS from 'exceljs-hardened';
import PptxGenJS from '@lofcz/pptxgenjs';
import { extractDocument } from '../src/server/phase6ArtifactRuntime.js';

async function fixtures() {
  const docx = Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('FCMB document source')] }] })));
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Prospects').addRow(['FCMB', 'Meeting']);
  const xlsx = Buffer.from(await workbook.xlsx.writeBuffer() as any);
  const deck = new PptxGenJS();
  deck.addSlide().addText('FCMB presentation source', { x: 1, y: 1, w: 8, h: 1 });
  const pptxData = await deck.write({ outputType: 'nodebuffer' });
  const pptx = Buffer.isBuffer(pptxData) ? pptxData : Buffer.from(pptxData as any);
  return { docx, xlsx, pptx };
}

async function main() {
  const generated = await fixtures();
  const cases = [
    ['source.docx', generated.docx, 'application/octet-stream', 'FCMB document source'],
    ['source.xlsx', generated.xlsx, '', 'FCMB,Meeting'],
    ['source.pptx', generated.pptx, 'application/octet-stream', 'FCMB presentation source'],
    ['source.csv', Buffer.from('company,status\nFCMB,Prospect'), '', 'FCMB,Prospect'],
    ['source.md', Buffer.from('# FCMB fact sheet'), '', 'FCMB fact sheet'],
    ['source.json', Buffer.from('{"company":"FCMB"}'), '', 'FCMB'],
  ] as const;
  for (let pass = 1; pass <= 4; pass += 1) {
    for (const [name, buffer, mime, expected] of cases) {
      const text = await extractDocument(buffer, name, mime);
      if (!text.includes(expected)) throw new Error(`${name} extraction failed`);
      console.log(`pass=${pass} source=${name} chars=${text.length}`);
    }
  }
}

void main();
