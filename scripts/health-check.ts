import { buildApi } from "../apps/api/src/index.js";

async function main() {
  const app = buildApi();
  await app.ready();
  const response = await app.inject({ method: "GET", url: "/api/v1/health" });
  console.log(response.statusCode, response.body);
  await app.close();

  if (response.statusCode !== 200) process.exitCode = 1;
}

void main();
