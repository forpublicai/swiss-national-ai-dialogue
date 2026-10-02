import { withPartnerSession } from "@/lib/partner/api";
import { quoteRoutes } from "@/deliberations/swiss-national-ai-dialogue/server/quotes-route";

import { snadKeyStillActive } from "../_guard";

export const runtime = "nodejs";

const SLUG = "swiss-national-ai-dialogue";
const routes = quoteRoutes("partner");

export const GET = withPartnerSession(SLUG, routes.GET, snadKeyStillActive);
export const PATCH = withPartnerSession(SLUG, routes.PATCH, snadKeyStillActive);
