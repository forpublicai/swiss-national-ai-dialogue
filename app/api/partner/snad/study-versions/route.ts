import { withPartnerSession } from "@/lib/partner/api";
import { studyVersionCollectionRoutes } from "@/deliberations/swiss-national-ai-dialogue/server/study-versions-route";

import { snadKeyStillActive } from "../_guard";

export const runtime = "nodejs";

const SLUG = "swiss-national-ai-dialogue";
const routes = studyVersionCollectionRoutes("partner");

export const GET = withPartnerSession(SLUG, routes.GET, snadKeyStillActive);
export const POST = withPartnerSession(SLUG, routes.POST, snadKeyStillActive);
