import fs from 'node:fs';

const path = 'src/server/phase2Routes.ts';
let source = fs.readFileSync(path, 'utf8');
const marker = "app.get('/api/admin/executive-dashboard-summary'";
const start = source.indexOf(marker);
if (start < 0) throw new Error('Executive summary route was not generated');
const endMarker = "  // Canonical user directory.";
const end = source.indexOf(endMarker, start);
if (end < 0) throw new Error('Could not locate the end of the executive route block');

let block = source.slice(start, end);
block = block.replace(
  "const safeRows = async (table: string, columns = '*') => {",
  "const safeRows = async (table: string, columns = '*'): Promise<any[]> => {"
);
block = block.replace(
  '        return data || [];',
  '        return (data as any[]) || [];'
);

source = source.slice(0, start) + block + source.slice(end);
fs.writeFileSync(path, source);
console.log('Phase 1/2 TypeScript stabilization applied.');
