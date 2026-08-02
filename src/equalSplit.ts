import type { GroupMember } from './GroupScoreScreen';

export const PLACEHOLDER_MEAL_TOTAL = 72;

export type EqualSplitResult = {
  difference: number;
  label: string;
  outcome: 'less' | 'more' | 'equal' | 'unknown';
};

export function getEqualSplitResult(members: GroupMember[], profileName: string): EqualSplitResult {
  const member = members.find((item) => item.name === profileName);
  if (!member || members.length === 0) return { difference: 0, label: '', outcome: 'unknown' };

  const equalShare = PLACEHOLDER_MEAL_TOTAL / members.length;
  const paid = PLACEHOLDER_MEAL_TOTAL * member.percentage / 100;
  const difference = paid - equalShare;

  if (Math.abs(difference) <= 0.005) return { difference, label: 'equal split', outcome: 'equal' };
  if (difference > 0) return { difference, label: `$${difference.toFixed(2)} more than equal split`, outcome: 'more' };
  return { difference, label: `$${Math.abs(difference).toFixed(2)} less than equal split`, outcome: 'less' };
}
