export const maxDuration = 180;

export async function GET() {
  const startedAt = Date.now();
  console.info(`FLUID_PROBE_START startedAt=${startedAt}`);

  await new Promise<void>((resolve) => setTimeout(resolve, 70_000));

  const elapsedMs = Date.now() - startedAt;
  console.info(`FLUID_PROBE_COMPLETE elapsedMs=${elapsedMs}`);

  return Response.json(
    { ok: true, elapsedMs },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
