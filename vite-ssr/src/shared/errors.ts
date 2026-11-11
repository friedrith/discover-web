/**
 * An error whose message is safe to show to the user.
 *
 * Server functions throw it for expected failures ("Type a title for the task").
 * The RPC endpoint sends its message to the browser with a 400 status; any
 * other error becomes a generic 500 so internals never leak.
 */
export class ServerFnError extends Error {
  override name = "ServerFnError";
}

/** Message to show to the user for a failed call. */
export function errorMessage(error: unknown): string {
  if (error instanceof ServerFnError) return error.message;
  if (error instanceof TypeError) return "Could not reach the server";
  return "Something went wrong";
}
