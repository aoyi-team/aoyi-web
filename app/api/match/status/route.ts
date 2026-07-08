import { AuthError, getMatchStatusFromRequest } from "@/lib/matchmaking/service";

export async function GET(request: Request) {
  try {
    return Response.json(await getMatchStatusFromRequest(request));
  } catch (error) {
    return toErrorResponse(error);
  }
}

function toErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected match status error.";
  const status = error instanceof AuthError ? 401 : 400;
  return Response.json({ error: message }, { status });
}
