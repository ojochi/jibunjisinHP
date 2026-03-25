import { createLogoutCookie } from "../../_lib/auth.js";
import { json } from "../../_lib/selfies.js";

export async function onRequestPost() {
  const response = json({ ok: true });
  response.headers.append("set-cookie", createLogoutCookie());
  return response;
}
