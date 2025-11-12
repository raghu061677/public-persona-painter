-- Enable realtime for campaigns table
ALTER TABLE campaigns REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;

-- Enable realtime for campaign_assets table
ALTER TABLE campaign_assets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_assets;