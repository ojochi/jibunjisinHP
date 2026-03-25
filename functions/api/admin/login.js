import {
  createSessionCookie,
  getSessionConfig,
  verifyPassword
} from "../../_lib/auth.js";
import { badRequest, json } from "../../_lib/selfies.js";

export async function onRequestPost(context) {
  const configError = getSessionConfig(context.env);
  if (configError) {
    return json({ error: configError.error }, 500);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("Invalid request body.");
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return badRequest("password is required.");
  }

  const valid = await verifyPassword(password, context.env);
  if (!valid) {
    return json({ error: "Invalid password." }, 401);
  }

  const response = json({ ok: true });
  response.headers.append("set-cookie", await createSessionCookie(context.env));
  return response;
}
