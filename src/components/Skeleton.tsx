/**
 * Animated skeleton loading components (Epic 89).
 *
 * Uses react-native-reanimated for smooth pulse animation.
 * Pre-built variants for common card patterns.
 */

import { type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated'

interface SkeletonProps {
  width: number | `${number}%`
  height: number
  className?: string
  style?: ViewStyle
}

export function Skeleton({ width, height, className, style }: SkeletonProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withRepeat(withTiming(0.5, { duration: 1000 }), -1, true),
  }))

  return (
    <Animated.View
      className={`rounded-md bg-muted ${className ?? ''}`}
      style={[{ width, height }, animatedStyle, style]}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    />
  )
}

/** Note card skeleton — 3 lines of varying width */
export function NoteCardSkeleton() {
  return (
    <Animated.View className="rounded-xl border border-border bg-card p-4 gap-2">
      <Skeleton width="40%" height={14} />
      <Skeleton width="100%" height={12} />
      <Skeleton width="70%" height={12} />
    </Animated.View>
  )
}

/** Conversation card skeleton — avatar circle + 2 lines */
export function ConversationCardSkeleton() {
  return (
    <Animated.View className="rounded-xl border border-border bg-card p-4 flex-row items-center gap-3">
      <Skeleton width={40} height={40} className="rounded-full" />
      <Animated.View className="flex-1 gap-2">
        <Skeleton width="60%" height={14} />
        <Skeleton width="80%" height={12} />
      </Animated.View>
    </Animated.View>
  )
}

/** Volunteer card skeleton — name + role badge + phone */
export function VolunteerCardSkeleton() {
  return (
    <Animated.View className="rounded-xl border border-border bg-card p-4 gap-2">
      <Animated.View className="flex-row items-center gap-2">
        <Skeleton width="50%" height={16} />
        <Skeleton width={60} height={20} className="rounded-full" />
      </Animated.View>
      <Skeleton width="35%" height={12} />
    </Animated.View>
  )
}

/** Audit entry skeleton — badge + text + timestamp */
export function AuditEntrySkeleton() {
  return (
    <Animated.View className="rounded-xl border border-border bg-card p-4 flex-row items-center gap-3">
      <Skeleton width={24} height={24} className="rounded-full" />
      <Animated.View className="flex-1 gap-1">
        <Skeleton width="70%" height={14} />
        <Skeleton width="40%" height={10} />
      </Animated.View>
    </Animated.View>
  )
}

/** Shift card skeleton — time range + role */
export function ShiftCardSkeleton() {
  return (
    <Animated.View className="rounded-xl border border-border bg-card p-4 flex-row items-center justify-between">
      <Animated.View className="gap-1">
        <Skeleton width={120} height={14} />
        <Skeleton width={80} height={12} />
      </Animated.View>
      <Skeleton width={60} height={24} className="rounded-full" />
    </Animated.View>
  )
}

/** Generic list skeleton — repeats a skeleton card N times */
export function ListSkeleton({ count = 5, Card = NoteCardSkeleton }: { count?: number; Card?: React.ComponentType }) {
  return (
    <Animated.View className="gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} />
      ))}
    </Animated.View>
  )
}
