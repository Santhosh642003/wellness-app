import CalendarCard from "./sidebar/CalendarCard";
import UpcomingChallenge from "./sidebar/UpcomingChallenge";
import LeaderboardCard from "./sidebar/LeaderboardCard";
import StreakCard from "./sidebar/StreakCard";

export default function RightSidebar({ points = 0, streakDays = 0, lastClaimDate = null }) {
  return (
    <div className="space-y-6">
      <CalendarCard streakDays={streakDays} lastClaimDate={lastClaimDate} />
      <StreakCard streakDays={streakDays} />
      <LeaderboardCard />
      <UpcomingChallenge />
    </div>
  );
}
