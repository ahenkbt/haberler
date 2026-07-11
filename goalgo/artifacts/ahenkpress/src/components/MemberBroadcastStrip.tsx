import { useMember } from "@/context/MemberContext";
import { PlatformBroadcastStrip } from "./PlatformBroadcastStrip";

/** Site üyesi (Keşfet / seri ilan oturumu) için üst duyuru şeridi. */
export function MemberBroadcastStrip() {
  const { member } = useMember();
  if (!member) return null;
  return <PlatformBroadcastStrip mode="member" />;
}
