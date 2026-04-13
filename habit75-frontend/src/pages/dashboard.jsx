import TodayProgressCard from "../components/todayProgressCard";
import TodayStatsCard from "../components/todayStatsCard";
import NextMileStoneCard from "../components/nextMileStoneCard";

export function Dashboard() {
  return (
    <>
      <TodayProgressCard />
      <TodayStatsCard />
      <NextMileStoneCard />
    </>
  );
}
