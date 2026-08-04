import dotenv from "dotenv";
dotenv.config();

function maskSecret(val: string | undefined): string {
  if (!val) return "UNDEFINED";
  if (val.length <= 8) return "********";
  return val.substring(0, 4) + "..." + val.substring(val.length - 4);
}

function parseConnectionString(url: string) {
  try {
    const reg = /postgresql:\/\/([^:]+):([^@]+)@([^:/]+):?([0-9]*)\/(.+)/;
    const match = url.match(reg);
    if (match) {
      return {
        username: match[1],
        password: match[2],
        host: match[3],
        port: match[4] || "5432",
        database: match[5]?.split("?")[0] || ""
      };
    }
  } catch (e) {}
  return null;
}

console.log("=== RUNTIME DATABASE CONNECTION FORENSIC REPORT ===");

const rawDbUrl = process.env.DATABASE_URL;
console.log("DATABASE_URL Env Variable Exists:", !!rawDbUrl);

let host = "N/A";
let port = "N/A";
let database = "N/A";
let username = "N/A";
let passwordVal: string | undefined = undefined;
let isSsl = "N/A";
let poolerHost = "N/A";
let projectRef = "N/A";
let region = "N/A";

let parsed = rawDbUrl ? parseConnectionString(rawDbUrl) : null;

if (parsed) {
  host = parsed.host;
  port = parsed.port;
  database = parsed.database;
  username = parsed.username;
  passwordVal = parsed.password;
  
  // Check if it's a Supabase connection URL or pooled URL
  if (host.includes("supabase")) {
    poolerHost = host;
    const hostParts = host.split(".");
    if (hostParts[0]) {
      if (hostParts[0].includes("pooler") || hostParts[1] === "pooler") {
        if (username.includes(".")) {
          projectRef = username.split(".")[0];
        }
      } else {
        projectRef = hostParts[0];
      }
    }
    
    // Try to parse region
    const regionMatch = host.match(/aws-[0-9]-([a-z0-9-]+)\.pooler/);
    if (regionMatch) {
      region = regionMatch[1];
    } else {
      const regionMatch2 = host.match(/([a-z0-9-]+)\.supabase/);
      if (regionMatch2 && regionMatch2[1] !== projectRef) {
        region = regionMatch2[1];
      }
    }
  }
}

// Check other SQL environment variables that might be injected
const sqlHost = process.env.SQL_HOST;
const sqlUser = process.env.SQL_USER;
const sqlDb = process.env.SQL_DB_NAME;

console.log("\n--- Active Database Connection Parameters ---");
console.log("DATABASE_URL Host:", host);
console.log("DATABASE_URL Port:", port);
console.log("DATABASE_URL Database:", database);
console.log("DATABASE_URL Username:", username);
console.log("DATABASE_URL Password (masked):", maskSecret(passwordVal));

console.log("\n--- AI Studio System Variables (if any) ---");
console.log("SQL_HOST:", sqlHost || "UNDEFINED");
console.log("SQL_USER:", sqlUser || "UNDEFINED");
console.log("SQL_DB_NAME:", sqlDb || "UNDEFINED");
console.log("SQL_PASSWORD (masked):", maskSecret(process.env.SQL_PASSWORD));

console.log("\n--- Supabase Client Configurations ---");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL || "UNDEFINED");
console.log("SUPABASE_ANON_KEY (masked):", maskSecret(process.env.SUPABASE_ANON_KEY));
console.log("SUPABASE_SERVICE_ROLE_KEY (masked):", maskSecret(process.env.SUPABASE_SERVICE_ROLE_KEY));

console.log("\n--- Analytics & Derived Metadata ---");
console.log("Is host Supabase?", host.includes("supabase") ? "YES" : "NO");
console.log("Project Reference:", projectRef);
console.log("Region:", region);
console.log("Pooler Hostname:", poolerHost);

console.log("\n==============================================");
