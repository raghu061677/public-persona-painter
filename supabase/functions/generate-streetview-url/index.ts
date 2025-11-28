import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

interface StreetViewRequest {
  assetId?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  pitch?: number;
  fov?: number;
  updateAsset?: boolean;
}

interface StreetViewMetadata {
  status: 'OK' | 'ZERO_RESULTS' | 'INVALID_REQUEST';
  location?: {
    lat: number;
    lng: number;
  };
  pano_id?: string;
}

const DEFAULT_CONFIG = {
  heading: 90,
  pitch: 0,
  fov: 80,
};

function buildStreetViewUrl(
  lat: number,
  lng: number,
  heading: number = DEFAULT_CONFIG.heading,
  pitch: number = DEFAULT_CONFIG.pitch,
  fov: number = DEFAULT_CONFIG.fov
): string {
  const clampedHeading = Math.max(0, Math.min(360, heading));
  const clampedPitch = Math.max(-90, Math.min(90, pitch));
  const clampedFov = Math.max(10, Math.min(100, fov));

  const params = new URLSearchParams({
    api: '1',
    map_action: 'pano',
    viewpoint: `${lat},${lng}`,
    heading: clampedHeading.toString(),
    pitch: clampedPitch.toString(),
    fov: clampedFov.toString(),
  });

  return `https://www.google.com/maps/@?${params.toString()}`;
}

async function checkStreetViewAvailability(
  lat: number,
  lng: number
): Promise<StreetViewMetadata | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.log('Google Maps API key not configured, skipping availability check');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return data as StreetViewMetadata;
  } catch (error) {
    console.error('Error checking Street View availability:', error);
    return null;
  }
}

async function findNearestStreetView(
  lat: number,
  lng: number,
  maxRadius: number = 100
): Promise<{ lat: number; lng: number } | null> {
  const radii = [20, 50, 100];
  
  for (const radius of radii) {
    if (radius > maxRadius) break;
    
    const metadata = await checkStreetViewAvailability(lat, lng);
    
    if (metadata?.status === 'OK' && metadata.location) {
      console.log(`Found Street View within ${radius}m radius`);
      return metadata.location;
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: StreetViewRequest = await req.json();
    const {
      assetId,
      latitude,
      longitude,
      heading = DEFAULT_CONFIG.heading,
      pitch = DEFAULT_CONFIG.pitch,
      fov = DEFAULT_CONFIG.fov,
      updateAsset = true,
    } = body;

    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    // Try to find nearest Street View if API key is available
    let finalLat = latitude;
    let finalLng = longitude;
    
    if (GOOGLE_MAPS_API_KEY) {
      const nearestLocation = await findNearestStreetView(latitude, longitude);
      if (nearestLocation) {
        finalLat = nearestLocation.lat;
        finalLng = nearestLocation.lng;
        console.log(`Using nearest Street View location: ${finalLat}, ${finalLng}`);
      }
    }

    // Generate Street View URL
    const streetViewUrl = buildStreetViewUrl(finalLat, finalLng, heading, pitch, fov);

    // Update asset if requested and assetId provided
    if (updateAsset && assetId) {
      const { error: updateError } = await supabaseClient
        .from('media_assets')
        .update({
          google_street_view_url: streetViewUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetId);

      if (updateError) {
        console.error('Error updating asset:', updateError);
        throw new Error('Failed to update asset with Street View URL');
      }

      console.log(`Updated asset ${assetId} with Street View URL`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        streetViewUrl,
        coordinates: {
          latitude: finalLat,
          longitude: finalLng,
        },
        heading,
        pitch,
        fov,
        updated: updateAsset && !!assetId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-streetview-url function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
