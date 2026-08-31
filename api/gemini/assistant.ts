import { runPhase6Assistant } from '../../src/server/phase6AiRuntime';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const result = await runPhase6Assistant(req);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(result.status).json(result.body);
}
