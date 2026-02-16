import { useRef, useCallback } from 'react'

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}

export function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  threshold = 50
): SwipeHandlers {
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isSwiping = useRef(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isSwiping.current = true
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping.current) return
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current
    // Cancel swipe if vertical movement dominates
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      isSwiping.current = false
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!isSwiping.current) return
    isSwiping.current = false
    // We don't have the final touch position in touchEnd,
    // so we use a different approach: capture in touchMove
  }, [])

  // Alternative simpler approach using touchEnd
  const touchEndX = useRef(0)

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
    const deltaY = e.touches[0].clientY - touchStartY.current
    if (Math.abs(deltaY) > Math.abs(touchEndX.current - touchStartX.current)) {
      isSwiping.current = false
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current) return
    isSwiping.current = false
    const deltaX = touchEndX.current - touchStartX.current
    if (Math.abs(deltaX) >= threshold) {
      if (deltaX < 0) {
        onSwipeLeft()
      } else {
        onSwipeRight()
      }
    }
  }, [onSwipeLeft, onSwipeRight, threshold])

  return {
    onTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }
}
