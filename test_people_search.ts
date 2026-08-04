import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.APOLLO_API_KEY || process.env.VITE_APOLLO_API_KEY || "KpuBuIUPuGIKOatjdoiVeA";

async function testPeopleQuery(label: string, payload: any) {
  try {
    const res = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey
      },
      body: JSON.stringify(payload)
    });
    console.log(`[TEST: ${label}] Status: ${res.status}`);
    const data = await res.json();
    console.log(`Total Entries: ${data.total_entries || 0}`);
    if (data.people && Array.isArray(data.people)) {
      console.log(`Found: ${data.people.length} items`);
      data.people.slice(0, 3).forEach((p: any) => {
        console.log(`- Name: ${p.first_name} ${p.last_name || p.last_name_obfuscated || ""}, Title: ${p.title}, Org: ${p.organization?.name}`);
      });
    }
    console.log("-----------------------------------------");
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  console.log("=== COMBINED NAME AND TITLE API SEARCH ===");
  
  await testPeopleQuery("CEO Oando", {
    q_organization_name: "Oando",
    person_titles: ["CEO", "Chief Executive Officer"]
  });

  await testPeopleQuery("Treasurer Dangote", {
    q_organization_name: "Dangote",
    person_titles: ["Treasurer", "Head of Treasury"]
  });

  await testPeopleQuery("CFO MTN Nigeria", {
    q_organization_name: "MTN Nigeria",
    person_titles: ["CFO", "Chief Financial Officer"]
  });
}
run();
