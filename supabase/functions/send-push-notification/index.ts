import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  tag?: string;
  icon?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: NotificationPayload = await req.json();
    const { user_ids, title, body, data, tag, icon } = payload;

    // Get subscriptions for target users
    let query = supabaseClient.from("notification_subscriptions").select("*");
    
    if (user_ids && user_ids.length > 0) {
      query = query.in("user_id", user_ids);
    }

    const { data: subscriptions, error } = await query;

    if (error) throw error;

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const subscription = sub.subscription as any;
        
        const notificationPayload = {
          notification: {
            title,
            body,
            icon: icon || "/favicon-192x192.png",
            badge: "/favicon-192x192.png",
            tag: tag || "go-ads-notification",
            data: data || {},
          },
        };

        // Here you would use Web Push library to send the notification
        // For now, this is a placeholder that logs the notification
        console.log("Sending notification:", {
          endpoint: subscription.endpoint,
          payload: notificationPayload,
        });

        // In production, use web-push library:
        // await webpush.sendNotification(subscription, JSON.stringify(notificationPayload));
        
        return { success: true, user_id: sub.user_id };
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: subscriptions.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error sending notifications:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
