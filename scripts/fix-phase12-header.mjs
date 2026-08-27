import fs from 'node:fs';

const path = 'src/components/Header.tsx';
let source = fs.readFileSync(path, 'utf8');

source = source.replace(
`        {/* User Role Authorization Signifier */}\n        <div className="flex items-center text-slate-550 border border-slate-200/80 px-2 py-1 rounded bg-slate-50 select-none">\n          {currentUser.role === 'Director' || currentUser.role === 'Admin' ? (\n            <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-wide flex items-center gap-1">\n              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Writing Allowed\n            </span>\n          ) : (\n            <span className="text-amber-600 font-bold text-[10px] uppercase tracking-wide flex items-center gap-1">\n              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Standard RM Role\n            </span>\n          )}\n        </div>`,
`        {/* User Role Authorization Signifier */}\n        <div className="flex items-center text-slate-550 border border-slate-200/80 px-2 py-1 rounded bg-slate-50 select-none">\n          {currentUser.permissionLevel === 'SUPER_ADMIN' ? (\n            <span className="text-red-700 font-bold text-[10px] uppercase tracking-wide flex items-center gap-1">\n              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Super Admin\n            </span>\n          ) : currentUser.permissionLevel === 'HOD_ADMIN' ? (\n            <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-wide flex items-center gap-1">\n              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> HOD Admin\n            </span>\n          ) : (\n            <span className="text-amber-600 font-bold text-[10px] uppercase tracking-wide flex items-center gap-1">\n              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Staff Access\n            </span>\n          )}\n        </div>`
);

fs.writeFileSync(path, source);
console.log('Phase 1 permission header alignment applied.');
