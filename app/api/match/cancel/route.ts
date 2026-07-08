import { AuthError, cancelMatchFromRequest } from "@/lib/matchmaking/service";

export async function POST(request: Request) {
  try {
    return Response.json(await cancelMatchFromRequest(request));
  } catch (error) {
    return toErrorResponse(error);
  }
}

function toErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected match cancel error.";
  const status = error instanceof AuthError ? 401 : 400;
  return Response.json({ error: message }, { status });
}
