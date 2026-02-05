 import { useEffect, useCallback, useRef } from 'react';
 
 /**
  * Custom hook to lock body scroll when a modal/drawer is open
  * Prevents background scrolling on mobile devices
  */
 export function useBodyScrollLock(isLocked: boolean) {
   const scrollPositionRef = useRef(0);
 
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
       if (scrollPositionRef.current > 0) {
         window.scrollTo(0, scrollPositionRef.current);
       }
     }
 
     return () => {
       // Cleanup on unmount
       document.body.style.position = '';
       document.body.style.top = '';
       document.body.style.left = '';
       document.body.style.right = '';
       document.body.style.overflow = '';
       document.body.style.width = '';
       document.body.style.paddingRight = '';
       document.documentElement.style.overflow = '';
       document.documentElement.style.height = '';
     };
   }, [isLocked]);
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
   }, []);
 
   const unlock = useCallback(() => {
     document.body.style.position = '';
     document.body.style.top = '';
     document.body.style.left = '';
     document.body.style.right = '';
     document.body.style.overflow = '';
     document.body.style.width = '';
     document.body.style.paddingRight = '';
     document.documentElement.style.overflow = '';
     
     if (scrollPositionRef.current > 0) {
       window.scrollTo(0, scrollPositionRef.current);
     }
   }, []);
 
   return { lock, unlock };
 }