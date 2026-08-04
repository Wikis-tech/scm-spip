import { db, createPool } from "./src/db/index.ts";
import { notifications, discoveredLeads, users } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

async function simulateNotifications(userId: string, role: string, email: string) {
  console.log(`\nSimulating GET /api/notifications for userId=${userId}, role=${role}, email=${email}`);
  try {
    const dbNotifs = await db.select().from(notifications);
    console.log(`Retrieved ${dbNotifs.length} notifications from database.`);
    
    const nowTime = Date.now();
    for (const n of dbNotifs) {
      if (n.category === "Meeting" || (n.type && n.type.includes("Meeting"))) {
        const elapsed = nowTime - new Date(n.timestamp || n.createdAt || '').getTime();
        if (elapsed > 4 * 3600000 && !n.isRead) {
          console.log(`Simulated auto-archive for notification ${n.id}`);
        }
      }
    }

    const filtered = dbNotifs.filter(n => {
      if (n.userId && n.userId === userId) {
        return true;
      }
      if (!n.userId || n.isLegacy) {
        if (role === 'Admin' || role === 'SUPER_ADMIN' || role === 'Administrator') {
          if (n.category === "Approval" || n.category === "Assignment" || n.category === "Opportunity" || n.isLegacy) {
            return true;
          }
        }
        return false;
      }
      return false;
    });

    const mapped = filtered.map(n => ({
      ...n,
      notificationId: n.id,
      description: n.message
    }));

    console.log(`Success! Mapped ${mapped.length} notifications.`);
  } catch (err: any) {
    console.error("GET /api/notifications simulation CRASHED:", err);
  }
}

async function simulateDiscoveryLeads(userId: string) {
  console.log(`\nSimulating GET /api/discovery/leads for userId=${userId}`);
  try {
    const pgLeads = await db.select().from(discoveredLeads).where(eq(discoveredLeads.userId, userId));
    console.log(`Retrieved ${pgLeads.length} discovered leads from database.`);
    const mapped = pgLeads.map((r: any) => ({
      id: r.id,
      name: r.name,
      industry: r.industry,
      size: r.size,
      website: r.website,
      location: r.location,
      opportunityScore: r.opportunityScore,
      reason: r.reason,
      alreadyimported: r.alreadyimported || false
    }));
    console.log(`Success! Mapped ${mapped.length} discovery leads.`);
  } catch (err: any) {
    console.error("GET /api/discovery/leads simulation CRASHED:", err);
  }
}

async function main() {
  await simulateNotifications("user-1", "Admin", "wisdom.okoh@scmcapitalng.com");
  await simulateDiscoveryLeads("user-1");
}

main();
