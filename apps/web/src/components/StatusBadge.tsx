import { Badge } from "@camacho-pos/ui";
import { featureStatusLabel, featureStatusTone } from "@/lib/format";
import type { FeatureStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: FeatureStatus }) {
  return <Badge tone={featureStatusTone(status)}>{featureStatusLabel(status)}</Badge>;
}
