import { useSwipeable } from 'react-swipeable';

interface SwipeHandlers {
  onSwipedLeft?: () => void;
  onSwipedRight?: () => void;
  onSwipedUp?: () => void;
  onSwipedDown?: () => void;
}

export function useSwipe(handlers: SwipeHandlers) {
  return useSwipeable({
    onSwipedLeft: handlers.onSwipedLeft,
    onSwipedRight: handlers.onSwipedRight,
    onSwipedUp: handlers.onSwipedUp,
    onSwipedDown: handlers.onSwipedDown,
    preventScrollOnSwipe: false,
    trackMouse: false,
    trackTouch: true,
    delta: 50, // Minimum swipe distance
    swipeDuration: 500,
  });
}

export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  let startY = 0;
  let pulling = false;

  return useSwipeable({
    onSwiping: (eventData) => {
      if (eventData.dir === 'Down' && window.scrollY === 0) {
        pulling = true;
        startY = eventData.initial[1];
      }
    },
    onSwiped: async (eventData) => {
      if (pulling && eventData.dir === 'Down') {
        const distance = eventData.deltaY;
        if (distance > 100) {
          await onRefresh();
        }
        pulling = false;
      }
    },
    trackTouch: true,
    trackMouse: false,
  });
}
