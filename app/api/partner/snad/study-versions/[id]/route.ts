import { withPartnerSession } from "@/lib/partner/api";
import { studyVersionItemRoutes } from "@/deliberations/swiss-national-ai-dialogue/server/study-versions-route";

import { snadKeyStillActive } from "../../_guard";

export const runtime = "nodejs";

const SLUG = "swiss-national-ai-dialogue";
const routes = studyVersionItemRoutes("partner");

export const GET = withPartnerSession(SLUG, routes.GET, snadKeyStillActive);
