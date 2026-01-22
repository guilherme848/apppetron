import { Loader2 } from 'lucide-react';
import { useWelcomeData } from '@/hooks/useWelcomeData';
import { useMyTasks } from '@/hooks/useMyTasks';
import { WelcomeHeader } from '@/components/welcome/WelcomeHeader';
import { NextStepCard } from '@/components/welcome/NextStepCard';
import { DailyRoutinePanel } from '@/components/welcome/DailyRoutinePanel';
import { BirthdayCard } from '@/components/welcome/BirthdayCard';
import { BirthdayModal, useBirthdayModal } from '@/components/welcome/BirthdayModal';
import { BirthdayToast } from '@/components/welcome/BirthdayToast';
import { TaskCounterCards } from '@/components/myarea/TaskCounterCards';
import { RoleSpecificBlocks } from '@/components/myarea/RoleSpecificBlocks';
import { PersonalNotesCard } from '@/components/welcome/PersonalNotesCard';

export default function WelcomePage() {
  const {
    loading,
    greeting,
    userName,
    contextualMessage,
    metrics,
    nextStepItems,
    birthdayMembers,
    isUserBirthdayToday,
    isUserBirthdayMonth,
  } = useWelcomeData();

  const { tasks, counts, loading: tasksLoading, currentRole } = useMyTasks();
  const { showModal, closeModal } = useBirthdayModal(isUserBirthdayToday);

  if (loading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const primaryNextStep = nextStepItems[0] || null;

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <WelcomeHeader
          greeting={greeting}
          userName={userName}
          contextualMessage={contextualMessage}
          isUserBirthdayToday={isUserBirthdayToday}
        />

        {/* Task Counters */}
        <TaskCounterCards counts={counts} loading={false} />

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Step Card */}
            <NextStepCard
              item={primaryNextStep}
              isUserBirthdayToday={isUserBirthdayToday}
              userName={userName}
            />

            {/* Daily Routine Panel */}
            <DailyRoutinePanel metrics={metrics} />

            {/* Role-specific blocks */}
            <RoleSpecificBlocks tasks={tasks} roleName={currentRole} />
          </div>

          {/* Right column - Sidebar */}
          <div className="space-y-6">
            {/* Personal Notes */}
            <PersonalNotesCard />

            {/* Birthday Card */}
            <BirthdayCard
              members={birthdayMembers}
              isUserBirthdayToday={isUserBirthdayToday}
              isUserBirthdayMonth={isUserBirthdayMonth}
            />
          </div>
        </div>
      </div>

      {/* Birthday Modal */}
      <BirthdayModal
        userName={userName}
        isOpen={showModal}
        onClose={closeModal}
      />

      {/* Birthday Toast - persistent during the day */}
      <BirthdayToast isUserBirthdayToday={isUserBirthdayToday} />
    </>
  );
}
