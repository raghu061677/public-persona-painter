import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SocialLinks = {
  instagram: string;
  facebook: string;
  linkedin: string;
  whatsappPhone: string;
  whatsappUrl: string;
};

const ENV = import.meta.env;

const buildWaUrl = (phone: string) =>
  `https://api.whatsapp.com/send/?phone=${encodeURIComponent(phone)}&text=Hi%20Go-Ads%20team&type=phone_number&app_absent=0`;

const DEFAULTS: SocialLinks = {
  instagram: ENV.VITE_SOCIAL_INSTAGRAM || "https://instagram.com/goads360",
  facebook: ENV.VITE_SOCIAL_FACEBOOK || "https://facebook.com/goads360",
  linkedin: ENV.VITE_SOCIAL_LINKEDIN || "https://linkedin.com/company/goads360",
  whatsappPhone: ENV.VITE_SOCIAL_WHATSAPP_PHONE || "919666444888",
  whatsappUrl: buildWaUrl(ENV.VITE_SOCIAL_WHATSAPP_PHONE || "919666444888"),
};

const CACHE_KEY = "go-ads:social-links";

const fromCache = (): SocialLinks | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useSocialLinks = (): SocialLinks => {
  const [links, setLinks] = useState<SocialLinks>(() => fromCache() ?? DEFAULTS);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["social_instagram", "social_facebook", "social_linkedin", "social_whatsapp_phone"]);
      if (error || !alive || !data) return;
      const map = Object.fromEntries(data.map((r) => [r.key, r.value || ""]));
      const phone = map.social_whatsapp_phone || DEFAULTS.whatsappPhone;
      const next: SocialLinks = {
        instagram: map.social_instagram || DEFAULTS.instagram,
        facebook: map.social_facebook || DEFAULTS.facebook,
        linkedin: map.social_linkedin || DEFAULTS.linkedin,
        whatsappPhone: phone,
        whatsappUrl: buildWaUrl(phone),
      };
      setLinks(next);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
    })();
    return () => { alive = false; };
  }, []);

  return links;
};
