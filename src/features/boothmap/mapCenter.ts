import { FESTIVAL_MAP_CENTER } from "@/features/dashboard/mockData";

export function primaryFestivalCenter(
  locations:
    | {
        primary: boolean;
        latitude: number | null;
        longitude: number | null;
      }[]
    | undefined,
): { lat: number; lng: number } {
  const primary = locations?.find((location) => location.primary) ?? locations?.[0];
  if (primary?.latitude != null && primary.longitude != null) {
    return { lat: primary.latitude, lng: primary.longitude };
  }
  return FESTIVAL_MAP_CENTER;
}
