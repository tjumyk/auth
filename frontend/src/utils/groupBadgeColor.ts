/** Mantine `Badge` colors used for membership pills; order is arbitrary. */
export const GROUP_BADGE_COLORS = ['gray', 'violet', 'blue', 'cyan', 'grape', 'indigo'] as const

export type GroupBadgeColor = (typeof GROUP_BADGE_COLORS)[number]

const colorByGroupName = new Map<string, GroupBadgeColor>()

/**
 * Stable group name → badge color (same name always maps to the same color; order in a list does not matter).
 * Results are cached by name so large user tables with few distinct groups do not re-hash on every cell.
 */
export function groupNameToBadgeColor(groupName: string): GroupBadgeColor {
  const hit = colorByGroupName.get(groupName)
  if (hit !== undefined) {
    return hit
  }
  let h = 0
  for (let i = 0; i < groupName.length; i += 1) {
    h = (Math.imul(31, h) + groupName.charCodeAt(i)) | 0
  }
  const color = GROUP_BADGE_COLORS[Math.abs(h) % GROUP_BADGE_COLORS.length]
  colorByGroupName.set(groupName, color)
  return color
}
