import { withPartnerSession } from "@/lib/partner/api";
import { exportRoutes } from "@/deliberations/swiss-national-ai-dialogue/server/export-route";

import { snadKeyStillActive } from "../../_guard";

export const runtime = "nodejs";

const SLUG = "swiss-national-ai-dialogue";
const routes = exportRoutes("partner");

export const GET = withPartnerSession(SLUG, routes.GET, snadKeyStillActive);
