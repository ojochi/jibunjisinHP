import {
  accessConfigErrorResponse,
  adminAccessErrorResponse,
  requireAdmin,
  validateAccessConfig
} from "../../_lib/selfies.js";
import { validateAccessJwt } from "../../_lib/access.js";

async function bypassLocalDev(context) {
  if (context.env.LOCAL_DEV_BYPASS_ACCESS === "true") {
    const hostname = new URL(context.request.url).hostname;
    if (hostname === "127.0.0.1" || hostname === "localhost") {
      return context.next();
    }
  }

  const accessConfigError = validateAccessConfig(context.env);
  if (accessConfigError) {
    return accessConfigErrorResponse(context.request);
  }

  return null;
}

async function validateJwtAndRestrictAdmin(context) {
  try {
    await validateAccessJwt(context.request, context.env);
  } catch (error) {
    return adminAccessErrorResponse(context.request, error.message || "Forbidden", 403);
  }

  const denied = requireAdmin(context.request, context.env);
  if (denied) {
    return denied;
  }

  return context.next();
}

export const onRequest = [
  async function (context) {
    return bypassLocalDev(context);
  },
  validateJwtAndRestrictAdmin
];
