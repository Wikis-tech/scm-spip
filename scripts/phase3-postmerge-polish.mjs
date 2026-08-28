import fs from 'node:fs';

const file = 'src/pages/Intelligence.tsx';
let source = fs.readFileSync(file, 'utf8');

const replaceRequired = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Unable to apply ${label}: source pattern not found`);
  source = source.replace(from, to);
};

// Diagnostics are useful during engineering, but they should never be exposed in the
// production Research workspace or continuously polled by normal staff sessions.
replaceRequired(
  `className={\`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer \${`,
  `className={\`hidden text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer \${`,
  'production diagnostics toggle hiding'
);
replaceRequired(
  `{showDiag && (`,
  `{import.meta.env.DEV && showDiag && (`,
  'production diagnostics panel guard'
);

// Do not manufacture organization facts when Apollo/server data is absent.
replaceRequired(`id: data.overview?.id || \`co-\${Date.now()}\`,`, `id: data.overview?.id || '',`, 'executive fallback id');
replaceRequired(`industry: data.overview?.industry || 'Energy & Services',`, `industry: data.overview?.industry || 'Information Not Found',`, 'executive fallback industry');
replaceRequired(`headquarters: data.overview?.headquarters || 'Lagos, Nigeria',`, `headquarters: data.overview?.headquarters || 'Information Not Found',`, 'executive fallback headquarters');
replaceRequired(`description: data.overview?.description || 'Dossier compiled dynamically via executive search index query.',`, `description: data.overview?.description || 'Information Not Found',`, 'executive fallback description');
replaceRequired(`setOutreachIndustry(data.overview?.industry || 'Energy & Services');`, `setOutreachIndustry(data.overview?.industry || '');`, 'outreach fallback industry');

// Preserve the Apollo organization identity selected by the user when compiling the dossier.
replaceRequired(
  `body: JSON.stringify({ companyName: company.name })`,
  `body: JSON.stringify({ companyName: company.name, companyId: company.id, domain: company.domain })`,
  'selected Apollo organization identity forwarding'
);

// Never invent a pipeline value from company revenue text. Relationship officers set
// opportunity value explicitly after qualification.
const fabricatedValueBlock = `    const cleanValue = result.overview.revenueValue.toLowerCase().includes('billion') \n      ? 1500000000 \n      : result.overview.revenueValue.toLowerCase().includes('trillion') \n        ? 5000000000 \n        : 250000000;\n\n`;
replaceRequired(fabricatedValueBlock, '', 'fabricated opportunity value removal');
replaceRequired(`      opportunityValue: cleanValue,\n`, '', 'fabricated opportunity assignment removal');

// Failed imports must not be presented as successful.
replaceRequired(
  `    } catch (err: any) {\n      setIsImported(true);\n    }`,
  `    } catch (err: any) {\n      console.error('[SPIP IMPORT] Prospect import failed:', err?.message || err);\n      setIsImported(false);\n      setErrorWord(err?.message || 'Unable to import this prospect. Please try again.');\n    }`,
  'import failure state correction'
);

fs.writeFileSync(file, source);
console.log('Applied Phase 3 production Research polish and data-integrity fixes.');
