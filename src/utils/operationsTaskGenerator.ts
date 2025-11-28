/**
 * Automatic Operations Task Generator
 * 
 * Generates and manages operations tasks for campaigns based on dates
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  toDateOnly, 
  formatForSupabase, 
  calculateOperationsTaskDates 
} from "./dateUtils";

export interface CampaignAsset {
  id: string;
  asset_id: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
}

export interface OperationsTask {
  campaign_id: string;
  asset_id: string;
  job_type: 'printing' | 'dispatch' | 'mounting' | 'photo_upload' | 'unmounting';
  start_date?: string;
  end_date?: string;
  deadline_date?: string;
  status: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
}

/**
 * Generate all operations tasks for a campaign
 * 
 * @param campaignId - Campaign ID
 * @param campaignStartDate - Campaign start date
 * @param campaignEndDate - Campaign end date
 * @param assets - Array of campaign assets
 * @returns Array of created task objects
 */
export const generateOperationsTasks = async (
  campaignId: string,
  campaignStartDate: Date,
  campaignEndDate: Date,
  assets: CampaignAsset[]
): Promise<OperationsTask[]> => {
  const taskDates = calculateOperationsTaskDates(campaignStartDate, campaignEndDate);
  const allTasks: OperationsTask[] = [];

  // Generate tasks for each asset
  for (const asset of assets) {
    // 1. Printing Job
    allTasks.push({
      campaign_id: campaignId,
      asset_id: asset.asset_id,
      job_type: 'printing',
      start_date: formatForSupabase(taskDates.printing.start_date),
      end_date: formatForSupabase(taskDates.printing.end_date),
      status: 'pending',
      location: asset.location,
      area: asset.area,
      city: asset.city,
      media_type: asset.media_type,
    });

    // 2. Dispatch Job
    allTasks.push({
      campaign_id: campaignId,
      asset_id: asset.asset_id,
      job_type: 'dispatch',
      start_date: formatForSupabase(taskDates.dispatch.start_date),
      end_date: formatForSupabase(taskDates.dispatch.end_date),
      status: 'pending',
      location: asset.location,
      area: asset.area,
      city: asset.city,
      media_type: asset.media_type,
    });

    // 3. Mounting Job
    allTasks.push({
      campaign_id: campaignId,
      asset_id: asset.asset_id,
      job_type: 'mounting',
      start_date: formatForSupabase(taskDates.mounting.start_date),
      end_date: formatForSupabase(taskDates.mounting.end_date),
      status: 'assigned',
      location: asset.location,
      area: asset.area,
      city: asset.city,
      media_type: asset.media_type,
    });

    // 4. Photo Upload Job
    allTasks.push({
      campaign_id: campaignId,
      asset_id: asset.asset_id,
      job_type: 'photo_upload',
      deadline_date: formatForSupabase(taskDates.photoUpload.deadline_date),
      status: 'pending',
      location: asset.location,
      area: asset.area,
      city: asset.city,
      media_type: asset.media_type,
    });

    // 5. Unmounting Job
    allTasks.push({
      campaign_id: campaignId,
      asset_id: asset.asset_id,
      job_type: 'unmounting',
      start_date: formatForSupabase(taskDates.unmounting.start_date),
      end_date: formatForSupabase(taskDates.unmounting.end_date),
      status: 'pending',
      location: asset.location,
      area: asset.area,
      city: asset.city,
      media_type: asset.media_type,
    });
  }

  return allTasks;
};

/**
 * Save operations tasks to database
 * 
 * @param tasks - Array of operations tasks
 * @returns Success status
 */
export const saveOperationsTasks = async (tasks: OperationsTask[]): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('campaign_assets')
      .upsert(tasks.map((task, index) => ({
        id: `${task.campaign_id}-${task.asset_id}-${task.job_type}`,
        campaign_id: task.campaign_id,
        asset_id: task.asset_id,
        location: task.location,
        area: task.area,
        city: task.city,
        media_type: task.media_type,
        status: task.status,
        assigned_at: task.start_date || null,
        // Add custom fields for task tracking
      })));

    if (error) {
      console.error('Error saving operations tasks:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveOperationsTasks:', error);
    return false;
  }
};

/**
 * Regenerate tasks when campaign dates change
 * 
 * @param campaignId - Campaign ID
 * @param newStartDate - New start date
 * @param newEndDate - New end date
 * @param assets - Updated asset list
 * @returns Success status
 */
export const regenerateOperationsTasks = async (
  campaignId: string,
  newStartDate: Date,
  newEndDate: Date,
  assets: CampaignAsset[]
): Promise<boolean> => {
  try {
    // Delete existing tasks for this campaign
    await supabase
      .from('campaign_assets')
      .delete()
      .eq('campaign_id', campaignId);

    // Generate new tasks with updated dates
    const newTasks = await generateOperationsTasks(
      campaignId,
      newStartDate,
      newEndDate,
      assets
    );

    // Save new tasks
    return await saveOperationsTasks(newTasks);
  } catch (error) {
    console.error('Error regenerating operations tasks:', error);
    return false;
  }
};

/**
 * Get operations tasks for a campaign
 * 
 * @param campaignId - Campaign ID
 * @returns Array of operations tasks
 */
export const getOperationsTasks = async (campaignId: string): Promise<OperationsTask[]> => {
  try {
    const { data, error } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('assigned_at', { ascending: true });

    if (error) {
      console.error('Error fetching operations tasks:', error);
      return [];
    }

    return (data as OperationsTask[]) || [];
  } catch (error) {
    console.error('Error in getOperationsTasks:', error);
    return [];
  }
};
