 import { useEffect, useCallback, useRef } from 'react';
 
 /**
  * Custom hook to lock body scroll when a modal/drawer is open
  * Prevents background scrolling on mobile devices
  * IMPORTANT: This uses the position:fixed pattern which is iOS Safari compatible
  */
 export function useBodyScrollLock(isLocked: boolean) {
   const scrollPositionRef = useRef(0);
  const isLockedRef = useRef(false);

  // Store lock state in ref to avoid stale closures
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);
 
   useEffect(() => {
     if (isLocked) {
       // Store current scroll position
       scrollPositionRef.current = window.scrollY;
       
       // Get current body computed style
       const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
       
       // Apply scroll lock styles
       document.body.style.position = 'fixed';
       document.body.style.top = `-${scrollPositionRef.current}px`;
       document.body.style.left = '0';
       document.body.style.right = '0';
       document.body.style.overflow = 'hidden';
       document.body.style.width = '100%';
       
       // Prevent layout shift from scrollbar disappearing
       if (scrollbarWidth > 0) {
         document.body.style.paddingRight = `${scrollbarWidth}px`;
       }
       
       // iOS Safari specific fix
       document.documentElement.style.overflow = 'hidden';
       document.documentElement.style.height = '100%';
     } else {
       // Restore styles
        restoreBodyScroll(scrollPositionRef.current);
        scrollPositionRef.current = 0;
     }
 
     return () => {
        // Cleanup on unmount - always restore
        if (isLockedRef.current) {
          restoreBodyScroll(scrollPositionRef.current);
        }
     };
   }, [isLocked]);
 }
 
/**
 * Restores body scroll state to normal
 * Used by multiple hooks for consistency
 */
function restoreBodyScroll(scrollY: number = 0) {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.overflow = '';
  document.body.style.width = '';
  document.body.style.paddingRight = '';
  document.documentElement.style.overflow = '';
  document.documentElement.style.height = '';
  
  // Restore scroll position
  if (scrollY > 0) {
    window.scrollTo(0, scrollY);
  }
}

/**
 * Emergency scroll unlock - call this to force-reset body scroll state
 * Useful for route change cleanup
 */
export function forceUnlockBodyScroll() {
  restoreBodyScroll(0);
}

 /**
  * Hook that returns functions to manually lock/unlock scroll
  */
 export function useScrollLockControl() {
   const scrollPositionRef = useRef(0);
 
   const lock = useCallback(() => {
     scrollPositionRef.current = window.scrollY;
     const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
     
     document.body.style.position = 'fixed';
     document.body.style.top = `-${scrollPositionRef.current}px`;
     document.body.style.left = '0';
     document.body.style.right = '0';
     document.body.style.overflow = 'hidden';
     document.body.style.width = '100%';
     
     if (scrollbarWidth > 0) {
       document.body.style.paddingRight = `${scrollbarWidth}px`;
     }
     
     document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
   }, []);
 
   const unlock = useCallback(() => {
      restoreBodyScroll(scrollPositionRef.current);
      scrollPositionRef.current = 0;
   }, []);
 
   return { lock, unlock };
 }