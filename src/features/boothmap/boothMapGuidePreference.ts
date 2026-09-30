export const BOOTH_MAP_GUIDE_QUERY_PARAM = "guide";
export const BOOTH_MAP_GUIDE_QUERY_VALUE = "1";
const BOOTH_MAP_GUIDE_VERSION = "v1";

export function getBoothMapGuideStorageKey(festivalId: string) {
  return `chookjibup:booth-map-guide:seen:${BOOTH_MAP_GUIDE_VERSION}:${festivalId}`;
}

export function consumeBoothMapGuide(
  storage: Pick<Storage, "getItem" | "setItem">,
  festivalId: string,
) {
  const key = getBoothMapGuideStorageKey(festivalId);
  if (storage.getItem(key) === "true") return false;
  storage.setItem(key, "true");
  return true;
}
