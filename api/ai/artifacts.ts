import { generateArtifactV2 } from '../../src/server/phase6ArtifactRuntimeV2.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  try {
    const result = await generateArtifactV2(req);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('[PHASE 6 ARTIFACT ERROR]', error);
    return res.status(500).json({ error: 'The requested export could not be generated.' });
  }
}
