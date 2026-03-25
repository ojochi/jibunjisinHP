import { getSessionConfig, isAuthenticated, unauthorizedJson } from "../../_lib/auth.js";

export async function onRequest(context) {
  const pathname = new URL(context.request.url).pathname;
  if (pathname === "/api/admin/login" || pathname === "/api/admin/logout") {
    return context.next();
  }

  const configError = getSessionConfig(context.env);
  if (configError) {
    return unauthorizedJson(configError.error);
  }

  const authenticated = await isAuthenticated(context.request, context.env);
  if (!authenticated) {
    return unauthorizedJson("Authentication required.");
  }

  return context.next();
}
