async function main() {
  const appUrl = process.env.VAULT_APP_URL;
  const secret = process.env.MARKET_REFRESH_SECRET;
  if (!appUrl) throw new Error("Set VAULT_APP_URL, for example https://vault-portfolio-production.up.railway.app");

  const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/market/refresh`, {
    method: "POST",
    headers: {
      ...(secret ? { Authorization: `Bearer ${secret}` } : {})
    }
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Daily refresh failed: ${response.status} ${body}`);
  console.log(body);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
