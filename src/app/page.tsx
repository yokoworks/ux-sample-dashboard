import { DailyShiftScreen } from '@/components/schedule/daily-shift-screen';
import { readySchedule } from '@/data/ready-schedule';
import { parseDemoScenario } from '@/lib/mock/schedule-gateway';


export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const scenario = parseDemoScenario((await searchParams).scenario);
  return (
    <DailyShiftScreen
      key={scenario}
      schedule={readySchedule}
      scenario={scenario}
    />
  );
}
