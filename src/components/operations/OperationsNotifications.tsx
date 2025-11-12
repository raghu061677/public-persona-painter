import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: "assignment" | "proof_uploaded" | "proof_approved" | "proof_rejected";
  campaign_id: string;
  campaign_name: string;
  asset_id?: string;
  message: string;
  created_at: string;
  read: boolean;
}

export function OperationsNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for campaign_assets changes
    const channel = supabase
      .channel("campaign-assets-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaign_assets",
        },
        (payload) => {
          handleCampaignAssetUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      // Fetch recent campaign asset updates for notifications
      const { data: assets, error } = await supabase
        .from("campaign_assets")
        .select(`
          id,
          asset_id,
          status,
          campaign_id,
          created_at,
          campaigns:campaign_id (
            campaign_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform to notifications format
      const notifs: Notification[] = (assets || []).map((asset: any) => ({
        id: asset.id,
        type: getNotificationType(asset.status),
        campaign_id: asset.campaign_id,
        campaign_name: asset.campaigns?.campaign_name || "Unknown Campaign",
        asset_id: asset.asset_id,
        message: getNotificationMessage(asset.status, asset.asset_id),
        created_at: asset.created_at,
        read: false,
      }));

      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleCampaignAssetUpdate = (payload: any) => {
    const newData = payload.new;
    
    // Create notification based on status change
    const notification: Notification = {
      id: newData.id,
      type: getNotificationType(newData.status),
      campaign_id: newData.campaign_id,
      campaign_name: "Campaign Updated", // Will be fetched properly in fetchNotifications
      asset_id: newData.asset_id,
      message: getNotificationMessage(newData.status, newData.asset_id),
      created_at: new Date().toISOString(),
      read: false,
    };

    // Show toast notification
    toast({
      title: "New Update",
      description: notification.message,
    });

    // Add to notifications list
    setNotifications((prev) => [notification, ...prev.slice(0, 19)]);
    setUnreadCount((prev) => prev + 1);
  };

  const getNotificationType = (status: string): Notification["type"] => {
    switch (status) {
      case "Assigned":
        return "assignment";
      case "PhotoUploaded":
        return "proof_uploaded";
      case "Verified":
        return "proof_approved";
      default:
        return "assignment";
    }
  };

  const getNotificationMessage = (status: string, assetId?: string): string => {
    switch (status) {
      case "Assigned":
        return `New mounting assignment for asset ${assetId}`;
      case "PhotoUploaded":
        return `Proof photos uploaded for asset ${assetId} - awaiting approval`;
      case "Verified":
        return `Proof approved for asset ${assetId}`;
      default:
        return `Status updated for asset ${assetId}`;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Navigate to campaign
    navigate(`/admin/campaigns/${notification.campaign_id}`);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer ${
                  !notification.read ? "bg-accent" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {notification.campaign_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {notification.message}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleDateString()}{" "}
                      {new Date(notification.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
