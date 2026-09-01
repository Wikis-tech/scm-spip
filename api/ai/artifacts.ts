import { generateArtifact } from '../../src/server/phase6ArtifactRuntime.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  try {
    const result = await generateArtifact(req);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('[PHASE 6 ARTIFACT ERROR]', error);
    return res.status(500).json({ error: 'The requested export could not be generated.' });
  }
}
