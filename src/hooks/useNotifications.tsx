import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NotificationPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
  subscription: PushSubscription | null;
}

export const useNotifications = () => {
  const [state, setState] = useState<NotificationPermissionState>({
    permission: "default",
    isSupported: false,
    subscription: null,
  });
  const { toast } = useToast();

  useEffect(() => {
    // Check if notifications are supported
    const isSupported = "Notification" in window && "serviceWorker" in navigator;
    
    if (isSupported) {
      setState(prev => ({
        ...prev,
        permission: Notification.permission,
        isSupported: true,
      }));

      // Get existing subscription
      getSubscription();
    }
  }, []);

  const getSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      setState(prev => ({ ...prev, subscription }));
    } catch (error) {
      console.error("Error getting subscription:", error);
    }
  };

  const requestPermission = async () => {
    if (!state.isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in your browser.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission === "granted") {
        await subscribe();
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive real-time updates about your campaigns and operations.",
        });
        return true;
      } else {
        toast({
          title: "Notifications Denied",
          description: "You can enable notifications later in your browser settings.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const subscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get the VAPID public key from your backend
      const response = await supabase.functions.invoke("get-vapid-public-key");
      const { publicKey } = response.data;

      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // Save subscription to backend
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Note: You'll need to create the notification_subscriptions table
        // For now, we'll store in localStorage as a fallback
        localStorage.setItem(`notification_sub_${user.id}`, JSON.stringify(subscription.toJSON()));
      }

      setState(prev => ({ ...prev, subscription }));
    } catch (error) {
      console.error("Error subscribing to push:", error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    try {
      if (state.subscription) {
        await state.subscription.unsubscribe();
        
        // Remove from backend/storage
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          localStorage.removeItem(`notification_sub_${user.id}`);
        }

        setState(prev => ({ ...prev, subscription: null }));
        
        toast({
          title: "Notifications Disabled",
          description: "You will no longer receive push notifications.",
        });
      }
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast({
        title: "Error",
        description: "Failed to disable notifications.",
        variant: "destructive",
      });
    }
  };

  const sendTestNotification = () => {
    if (state.permission === "granted") {
      new Notification("Go-Ads 360° Test", {
        body: "Notifications are working! You'll receive updates about campaigns, approvals, and operations.",
        icon: "/favicon-192x192.png",
        badge: "/favicon-192x192.png",
        tag: "test-notification",
      });
    }
  };

  return {
    ...state,
    requestPermission,
    unsubscribe,
    sendTestNotification,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
