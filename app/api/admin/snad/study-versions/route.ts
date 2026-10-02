import { studyVersionCollectionRoutes } from "@/deliberations/swiss-national-ai-dialogue/server/study-versions-route";

export const runtime = "nodejs";

export const { GET, POST } = studyVersionCollectionRoutes("admin");
