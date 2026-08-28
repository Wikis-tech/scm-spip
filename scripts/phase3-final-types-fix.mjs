import fs from 'node:fs';

const path = 'src/pages/ManagementReports.tsx';
let source = fs.readFileSync(path, 'utf8');
const before = `{cards.map(({ label, value, icon: Icon }) => <Kpi key={label} label={label} value={value} icon={Icon} />)}`;
const after = `{cards.map(({ label, value, icon: Icon }) => <React.Fragment key={label}><Kpi label={label} value={value} icon={Icon} /></React.Fragment>)}`;

if (source.includes(before)) {
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
  console.log('Applied ManagementReports JSX key compatibility fix.');
} else if (source.includes(after)) {
  console.log('ManagementReports JSX key compatibility fix already applied.');
} else {
  throw new Error('Could not locate the ManagementReports KPI map expression.');
}
