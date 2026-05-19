import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SocialLinks = {
  instagram: string;
  facebook: string;
  linkedin: string;
  whatsappPhone: string;
  whatsappMessage: string;
  whatsappUrl: string;
};

const DEFAULTS: SocialLinks = {
  instagram: "https://instagram.com/goads360",
  facebook: "https://facebook.com/goads360",
  linkedin: "https://linkedin.com/company/goads360",
  whatsappPhone: "919666444888",
  whatsappMessage: "Hi Go-Ads team",
  whatsappUrl: "https://wa.me/919666444888?text=Hi%20Go-Ads%20team",
};

const KEY_MAP: Record<string, keyof SocialLinks> = {
  social_instagram: "instagram",
  social_facebook: "facebook",
  social_linkedin: "linkedin",
  social_whatsapp_phone: "whatsappPhone",
  social_whatsapp_message: "whatsappMessage",
};

const buildWaUrl = (phone: string, message: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message || "Hi")}`;

const CACHE_KEY = "goads:social-links";

const readCache = (): SocialLinks => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
};

export const useSocialLinks = () => {
  const [links, setLinks] = useState<SocialLinks>(() => readCache());

  const load = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", Object.keys(KEY_MAP));
    if (error || !data) return;
    const next: SocialLinks = { ...DEFAULTS };
    for (const row of data) {
      const field = KEY_MAP[row.key as string];
      if (field) (next as any)[field] = row.value;
    }
    next.whatsappUrl = buildWaUrl(next.whatsappPhone, next.whatsappMessage);
    setLinks(next);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("app_settings_social")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return links;
};

export default useSocialLinks;