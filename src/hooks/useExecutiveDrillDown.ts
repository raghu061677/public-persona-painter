import { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface ExecutiveDrillState {
  from: string;
  dateFrom?: string;
  dateTo?: string;
  timeRange?: string;
  filterCity?: string;
  filterStatus?: string;
  assetId?: string;
  assetName?: string;
}

/**
 * Hook to read executive summary drill-down state from router location.state.
 * Returns the state and helpers, only activates once on mount.
 */
export function useExecutiveDrillDown() {
  const location = useLocation();
  const navigate = useNavigate();
  const appliedRef = useRef(false);

  const state = (location.state as ExecutiveDrillState) || {};
  const isFromExecutive = state.from === "executive-summary";

  const clearDrillState = () => {
    // Replace current history entry to remove the state
    navigate(location.pathname + location.search, { replace: true, state: {} });
  };

  // Mark as applied — call this once after applying filters
  const markApplied = () => {
    appliedRef.current = true;
  };

  return {
    isFromExecutive,
    drillState: isFromExecutive ? state : null,
    alreadyApplied: appliedRef.current,
    markApplied,
    clearDrillState,
  };
}
