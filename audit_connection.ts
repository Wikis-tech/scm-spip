import dotenv from "dotenv";
dotenv.config({ override: true });
import { db } from "./src/db/index.ts";
import { sql } from "drizzle-orm";

async function runAudit() {
  console.log("=== STARTING DATABASE CONNECTION FORENSIC AUDIT ===");
  console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL prefix:", process.env.DATABASE_URL.split("@")[1] || "No credential info shown");
  }

  try {
    // Phase 2: Verify Supabase Connection
    console.log("\n=== PHASE 2: VERIFY SUPABASE CONNECTION ===");
    const dbNameRes = await db.execute(sql`SELECT current_database();`);
    const dbUserRes = await db.execute(sql`SELECT current_user;`);
    const versionRes = await db.execute(sql`SELECT version();`);
    const nowRes = await db.execute(sql`SELECT NOW();`);

    console.log("Current Database:", JSON.stringify(dbNameRes.rows));
    console.log("Current User:", JSON.stringify(dbUserRes.rows));
    console.log("Version:", JSON.stringify(versionRes.rows));
    console.log("Now:", JSON.stringify(nowRes.rows));

    // Phase 3: Verify Tables
    console.log("\n=== PHASE 3: VERIFY TABLES ===");
    const tablesRes = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);

    console.log("Found Tables:");
    for (const row of tablesRes.rows as any[]) {
      const tableName = row.table_name;
      // Let's count rows in each table safely
      try {
        const countRes = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM "${tableName}";`));
        const count = countRes.rows[0]?.cnt;
        console.log(`- Table: ${tableName} | Row Count: ${count}`);
      } catch (err: any) {
        console.log(`- Table: ${tableName} | Row Count Error: ${err.message}`);
      }
    }

    console.log("\n=== DETAILED USERS IN DATABASE ===");
    try {
      const usersRes = await db.execute(sql`SELECT id, email, full_name, role, status FROM "users";`);
      console.log(`Users count in table 'users': ${usersRes.rows.length}`);
      console.log(JSON.stringify(usersRes.rows, null, 2));
    } catch (err: any) {
      console.log("Failed to query users table:", err.message);
    }

  } catch (err: any) {
    console.error("Forensic audit failed to execute query:", err);
  }
}

runAudit();
