import { getSessionConfig, isAuthenticated, redirectToLogin } from "../_lib/auth.js";
import { adminAccessErrorResponse } from "../_lib/selfies.js";

export async function onRequest(context) {
  const pathname = new URL(context.request.url).pathname;
  if (pathname === "/admin/me") {
    return context.next();
  }

  const configError = getSessionConfig(context.env);
  if (configError) {
    return adminAccessErrorResponse(context.request, configError.error, 403);
  }

  const authenticated = await isAuthenticated(context.request, context.env);
  if (!authenticated) {
    return redirectToLogin(context.request);
  }

  return context.next();
}
