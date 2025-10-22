import { z } from "zod";

// Client validation schema
export const clientSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal('')),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{10,20}$/, "Invalid phone number format").optional().or(z.literal('')),
  company: z.string().trim().max(200, "Company name must be less than 200 characters").optional().or(z.literal('')),
  gst_number: z.string().trim().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number format (e.g., 22AAAAA0000A1Z5)").optional().or(z.literal('')),
  address: z.string().trim().max(500, "Address must be less than 500 characters").optional().or(z.literal('')),
  city: z.string().trim().max(100, "City must be less than 100 characters").optional().or(z.literal('')),
  state: z.string().trim().max(100, "State must be less than 100 characters").optional().or(z.literal('')),
  contact_person: z.string().trim().max(100, "Contact person name must be less than 100 characters").optional().or(z.literal('')),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal('')),
});

// Media asset validation schema
export const mediaAssetSchema = z.object({
  location: z.string().trim().min(3, "Location must be at least 3 characters").max(500, "Location must be less than 500 characters"),
  area: z.string().trim().min(2, "Area must be at least 2 characters").max(200, "Area must be less than 200 characters"),
  city: z.string().trim().min(2, "City must be at least 2 characters").max(100, "City must be less than 100 characters"),
  district: z.string().trim().max(100, "District must be less than 100 characters").optional().or(z.literal('')),
  state: z.string().trim().max(100, "State must be less than 100 characters").optional().or(z.literal('')),
  media_type: z.string().trim().min(2, "Media type is required").max(100, "Media type must be less than 100 characters"),
  dimensions: z.string().trim().min(3, "Dimensions are required").max(50, "Dimensions must be less than 50 characters"),
  card_rate: z.number().min(0, "Card rate must be positive").max(99999999, "Card rate is too large"),
  base_rent: z.number().min(0, "Base rent must be positive").max(99999999, "Base rent is too large").optional(),
  latitude: z.number().min(-90, "Invalid latitude").max(90, "Invalid latitude").optional(),
  longitude: z.number().min(-180, "Invalid longitude").max(180, "Invalid longitude").optional(),
  illumination: z.string().trim().max(50, "Illumination must be less than 50 characters").optional().or(z.literal('')),
  direction: z.string().trim().max(50, "Direction must be less than 50 characters").optional().or(z.literal('')),
  google_street_view_url: z.string().trim().url("Invalid URL format").optional().or(z.literal('')),
  media_id: z.string().trim().max(100, "Media ID must be less than 100 characters").optional().or(z.literal('')),
});

// Campaign validation schema
export const campaignSchema = z.object({
  campaign_name: z.string().trim().min(3, "Campaign name must be at least 3 characters").max(200, "Campaign name must be less than 200 characters"),
  client_name: z.string().trim().min(2, "Client name is required").max(100, "Client name must be less than 100 characters"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  notes: z.string().trim().max(2000, "Notes must be less than 2000 characters").optional().or(z.literal('')),
});

// Plan validation schema
export const planSchema = z.object({
  plan_name: z.string().trim().min(3, "Plan name must be at least 3 characters").max(200, "Plan name must be less than 200 characters"),
  client_name: z.string().trim().min(2, "Client name is required").max(100, "Client name must be less than 100 characters"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  notes: z.string().trim().max(2000, "Notes must be less than 2000 characters").optional().or(z.literal('')),
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "File size must be less than 5MB")
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type),
      "Only JPEG, PNG, WebP, and GIF images are allowed"
    ),
});

// Contact form validation
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
});

// Authentication validation schemas
export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ClientFormData = z.infer<typeof clientSchema>;
export type MediaAssetFormData = z.infer<typeof mediaAssetSchema>;
export type CampaignFormData = z.infer<typeof campaignSchema>;
export type PlanFormData = z.infer<typeof planSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
