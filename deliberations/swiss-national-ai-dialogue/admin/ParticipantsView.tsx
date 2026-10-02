import { listParticipants } from "../server/participants";
import { ParticipantsTable } from "./ParticipantsTable";
import { AdminTabs, adminBasePath, type AdminSurface } from "./shared";

export async function SnadParticipantsView({
  surface,
}: {
  surface: AdminSurface;
}) {
  const base = adminBasePath(surface);
  const { participants, totalSessions } = await listParticipants();
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">Swiss National AI Dialogue</h1>
        <AdminTabs surface={surface} current="participants" />
      </header>
      <section>
        <h2 className="text-lg font-bold">Participants</h2>
        <p className="text-muted-foreground mb-3 mt-0.5 text-xs">
          One row per participant, most recent first. Click a row to see
          everything they did.
        </p>
        <ParticipantsTable
          participants={participants}
          base={base}
          totalSessions={totalSessions}
        />
      </section>
    </div>
  );
}
