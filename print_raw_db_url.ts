import dotenv from "dotenv";
dotenv.config({ override: true });

const url = process.env.DATABASE_URL;
console.log("DATABASE_URL exists:", !!url);
if (url) {
  console.log("DATABASE_URL type:", typeof url);
  console.log("DATABASE_URL length:", url.length);
  console.log("DATABASE_URL starts with:", url.substring(0, 30));
  // Mask any passwords
  const parts = url.split(":");
  if (parts.length > 2) {
    console.log("DATABASE_URL parts count:", parts.length);
    console.log("DATABASE_URL first 2 parts:", parts[0] + ":" + parts[1].split("@")[0]);
  } else {
    console.log("DATABASE_URL raw:", url);
  }
}
