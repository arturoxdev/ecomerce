export function getStoreId(): string {
  const id = process.env.STORE_ID;
  if (!id) throw new Error("STORE_ID env var is required");
  return id;
}
