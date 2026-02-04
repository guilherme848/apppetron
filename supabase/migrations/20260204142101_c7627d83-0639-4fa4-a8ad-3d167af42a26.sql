-- Make all onboarding questions optional (not required)
UPDATE cs_onboarding_questions
SET is_required = false
WHERE is_required = true;