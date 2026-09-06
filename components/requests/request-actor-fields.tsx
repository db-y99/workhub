import { formatDate } from "@/lib/functions";
import type { TRequestActorProfile } from "@/types/requests.types";

type TRequestActorFieldsProps = {
  personLabel: string;
  dateLabel: string;
  profile?: TRequestActorProfile | null;
  at?: string | null;
};

export function RequestActorFields({
  personLabel,
  dateLabel,
  profile,
  at,
}: TRequestActorFieldsProps) {
  return (
    <>
      <div>
        <p className="text-sm font-semibold text-default-500 mb-1">
          {personLabel}
        </p>
        <p className="text-base">{profile?.full_name || "-"}</p>
        {profile?.email ? (
          <p className="text-sm text-default-400">{profile.email}</p>
        ) : null}
      </div>
      <div>
        <p className="text-sm font-semibold text-default-500 mb-1">
          {dateLabel}
        </p>
        <p className="text-base">{at ? formatDate(at) : "-"}</p>
      </div>
    </>
  );
}
