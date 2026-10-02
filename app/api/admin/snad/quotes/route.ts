import { quoteRoutes } from "@/deliberations/swiss-national-ai-dialogue/server/quotes-route";

export const runtime = "nodejs";

export const { GET, PATCH } = quoteRoutes("admin");
