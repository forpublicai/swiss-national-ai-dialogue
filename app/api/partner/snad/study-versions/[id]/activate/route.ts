import { withPartnerSession } from "@/lib/partner/api";
import { studyVersionActivateRoutes } from "@/deliberations/swiss-national-ai-dialogue/server/study-versions-route";

import { snadKeyStillActive } from "../../../_guard";

export const runtime = "nodejs";

const SLUG = "swiss-national-ai-dialogue";
const routes = studyVersionActivateRoutes("partner");

export const POST = withPartnerSession(SLUG, routes.POST, snadKeyStillActive);
