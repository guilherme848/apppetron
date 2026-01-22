import { Loader2 } from 'lucide-react';
import { useWelcomeData } from '@/hooks/useWelcomeData';
import { WelcomeHeader } from '@/components/welcome/WelcomeHeader';
import { NextStepCard } from '@/components/welcome/NextStepCard';
import { DailyRoutinePanel } from '@/components/welcome/DailyRoutinePanel';
import { BirthdayCard } from '@/components/welcome/BirthdayCard';
import { BirthdayModal, useBirthdayModal } from '@/components/welcome/BirthdayModal';
import { BirthdayToast } from '@/components/welcome/BirthdayToast';

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

  const { showModal, closeModal } = useBirthdayModal(isUserBirthdayToday);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const primaryNextStep = nextStepItems[0] || null;

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <WelcomeHeader
          greeting={greeting}
          userName={userName}
          contextualMessage={contextualMessage}
          isUserBirthdayToday={isUserBirthdayToday}
        />

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
          </div>

          {/* Right column - Sidebar */}
          <div className="space-y-6">
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
