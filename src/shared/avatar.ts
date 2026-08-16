export function defaultAvatarUrl(seed: string) {
  return `https://robohash.org/${encodeURIComponent(seed)}.png?set=set1&size=200x200`;
}
