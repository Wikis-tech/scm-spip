import {
  authenticatePhase6,
  deleteUserConversation,
  getUserConversation,
  listUserConversations,
  providerStatus,
} from '../../src/server/phase6AiRuntime';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const identity = await authenticatePhase6(req);
  if (!identity) return res.status(401).json({ error: 'Authentication required.' });

  const raw = req.query?.path;
  const parts = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(String);
  const path = parts.join('/');

  try {
    if (path === 'status' && req.method === 'GET') {
      const configured = providerStatus();
      return res.json({
        ready: configured.some((provider) => provider.configured),
        providers: configured,
        privacy: {
          conversationIsolation: 'per-user',
          directBrowserDatabaseAccess: false,
          confidentialRoutingRequiresApproval: true,
        },
      });
    }

    if (path === 'conversations' && req.method === 'GET') {
      return res.json(await listUserConversations(identity));
    }

    if (parts[0] === 'conversations' && parts[1] && req.method === 'GET') {
      const conversation = await getUserConversation(identity, parts[1]);
      return conversation ? res.json(conversation) : res.status(404).json({ error: 'Conversation not found.' });
    }

    if (parts[0] === 'conversations' && parts[1] && req.method === 'DELETE') {
      await deleteUserConversation(identity, parts[1]);
      return res.json({ ok: true });
    }

    return res.status(404).json({ error: 'Phase 6 AI endpoint not found.' });
  } catch (error: any) {
    return res.status(500).json({ error: String(error?.message || 'Phase 6 AI request failed.').slice(0, 500) });
  }
}
