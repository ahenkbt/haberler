import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

const DEFAULT_AUTOPLAY_INTERVAL_MS = 5000;
const DEFAULT_SWIPE_THRESHOLD_PX = 48;

type HeadlineSliderOptions = {
  intervalMs?: number;
  swipeThresholdPx?: number;
  autoplay?: boolean;
};

type PointerState = {
  id: number;
  startX: number;
  startY: number;
  dragging: boolean;
};

export function useHeadlineSliderInteraction(length: number, options: HeadlineSliderOptions = {}) {
  const intervalMs = options.intervalMs ?? DEFAULT_AUTOPLAY_INTERVAL_MS;
  const swipeThresholdPx = options.swipeThresholdPx ?? DEFAULT_SWIPE_THRESHOLD_PX;
  const autoplay = options.autoplay ?? true;
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pointerRef = useRef<PointerState | null>(null);
  const swipedRef = useRef(false);
  const safeLength = Math.max(0, length);
  const canSlide = safeLength > 1;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const next = useCallback(() => {
    setIndex((current) => (safeLength > 0 ? (current + 1) % safeLength : 0));
  }, [safeLength]);

  const prev = useCallback(() => {
    setIndex((current) => (safeLength > 0 ? (current - 1 + safeLength) % safeLength : 0));
  }, [safeLength]);

  const startTimer = useCallback(() => {
    clearTimer();
    if (autoplay && canSlide) {
      timerRef.current = setInterval(next, intervalMs);
    }
  }, [autoplay, canSlide, clearTimer, intervalMs, next]);

  const pause = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const resume = useCallback(() => {
    startTimer();
  }, [startTimer]);

  const runManual = useCallback((update: () => void) => {
    update();
    startTimer();
  }, [startTimer]);

  const goTo = useCallback((targetIndex: number) => {
    runManual(() => setIndex(safeLength > 0 ? ((targetIndex % safeLength) + safeLength) % safeLength : 0));
  }, [runManual, safeLength]);

  const manualNext = useCallback(() => {
    runManual(next);
  }, [next, runManual]);

  const manualPrev = useCallback(() => {
    runManual(prev);
  }, [prev, runManual]);

  useEffect(() => {
    setIndex((current) => (safeLength > 0 ? Math.min(current, safeLength - 1) : 0));
  }, [safeLength]);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [clearTimer, startTimer]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!canSlide || event.pointerType === "mouse") return;
    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: true,
    };
    swipedRef.current = false;
    pause();
  }, [canSlide, pause]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId || !pointer.dragging) return;
    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) + 8) {
      event.preventDefault();
    }
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    pointerRef.current = null;
    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    const isHorizontalSwipe = Math.abs(dx) >= swipeThresholdPx && Math.abs(dx) > Math.abs(dy) + 12;
    if (isHorizontalSwipe) {
      event.preventDefault();
      swipedRef.current = true;
      if (dx < 0) {
        manualNext();
      } else {
        manualPrev();
      }
      window.setTimeout(() => {
        swipedRef.current = false;
      }, 0);
      return;
    }
    resume();
  }, [manualNext, manualPrev, resume, swipeThresholdPx]);

  const onPointerCancel = useCallback(() => {
    pointerRef.current = null;
    resume();
  }, [resume]);

  const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!swipedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    swipedRef.current = false;
  }, []);

  return {
    index,
    setIndex: goTo,
    next: manualNext,
    prev: manualPrev,
    pause,
    resume,
    bind: {
      onMouseEnter: pause,
      onMouseLeave: resume,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
    },
    swipeStyle: { touchAction: "pan-y" as const },
  };
}
