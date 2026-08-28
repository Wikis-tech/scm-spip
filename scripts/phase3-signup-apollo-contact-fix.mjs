import fs from 'node:fs';

const file = 'src/pages/Intelligence.tsx';
let source = fs.readFileSync(file, 'utf8');

if (source.includes('VERIFIED APOLLO CONTACT')) {
  source = source.replace('VERIFIED APOLLO CONTACT', 'APOLLO PERSON MATCH');
  fs.writeFileSync(file, source);
  console.log('Updated visible Apollo contact badge.');
} else {
  console.log('Apollo contact badge already updated; no change required.');
}
