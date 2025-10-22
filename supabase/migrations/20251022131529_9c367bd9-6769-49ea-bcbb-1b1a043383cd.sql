-- Grant admin role to raghu@go-ads.in
INSERT INTO public.user_roles (user_id, role)
VALUES ('e99ea9aa-5214-4750-b83d-1a4ba25d5d7e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;