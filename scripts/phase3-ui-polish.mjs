import fs from 'fs';

const path = 'src/pages/AdminDashboard.tsx';
let s = fs.readFileSync(path, 'utf8');
const swaps = [
  ['Enterprise Control Deck', 'Administration'],
  ['SCM Leads Suspendd', 'Active Prospects'],
  ['AI Search Analytics', 'Research Analytics'],
  ['Security Event Log', 'Audit Events'],
  ['Supabase DB Host', 'Data Service'],
  ["{summary?.systemHealth.databaseConnected ? 'ONLINE' : 'FALLBACK'}", "{summary?.systemHealth.databaseConnected ? 'ONLINE' : 'UNAVAILABLE'}"],
  ['Control Navigation Menu', 'Administration Navigation'],
];
for (const [from, to] of swaps) s = s.split(from).join(to);

// Make the administration content visually consistent with the light SPIP shell while
// retaining the dark burgundy governance header as the primary visual anchor.
s = s
  .replace('className="space-y-6 select-none font-sans" id="scm-admin-panel"', 'className="space-y-6 font-sans" id="scm-admin-panel"')
  .replace('className="grid grid-cols-2 lg:grid-cols-5 gap-4"', 'className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4"')
  .replaceAll('bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl', 'bg-white border border-slate-200 p-4 rounded-2xl shadow-sm')
  .replaceAll('text-2xl font-black text-white block mt-1 font-display', 'text-2xl font-black text-slate-900 block mt-1 font-display')
  .replaceAll('p-2.5 bg-slate-800 rounded-lg', 'p-2.5 bg-slate-100 rounded-xl')
  .replace('className="flex border-b border-slate-850"', 'className="flex overflow-x-auto border-b border-slate-200 bg-white rounded-t-xl px-1"')
  .replaceAll("'border-transparent text-slate-400 hover:text-white'", "'border-transparent text-slate-500 hover:text-slate-900'")
  .replace('className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-slate-750"', 'className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-[#8c1018] focus:ring-2 focus:ring-red-100"')
  .replaceAll('bg-slate-900 border border-slate-800 px-3 rounded-lg', 'bg-white border border-slate-200 px-3 rounded-xl')
  .replaceAll('bg-transparent text-slate-200 text-xs border-none outline-none cursor-pointer py-1 font-medium', 'bg-transparent text-slate-700 text-xs border-none outline-none cursor-pointer py-2 font-semibold')
  .replace('className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden"', 'className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"')
  .replace('className="border-b border-slate-850 bg-slate-950/40 text-slate-400 uppercase tracking-wider text-[9px] font-black"', 'className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[9px] font-black"')
  .replace('className="divide-y divide-slate-850 text-xs text-slate-300"', 'className="divide-y divide-slate-100 text-xs text-slate-700"')
  .replaceAll('hover:bg-slate-900/20', 'hover:bg-slate-50')
  .replaceAll('font-bold text-white block flex items-center gap-1', 'font-bold text-slate-900 block flex items-center gap-1')
  .replaceAll('font-semibold text-slate-200', 'font-semibold text-slate-700');

fs.writeFileSync(path, s);
console.log('Phase 3 administration UI polish applied.');
