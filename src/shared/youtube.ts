const YOUTUBE_URL_PATTERN =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+)/gi;

/** Canonical watch URLs found in text, without extra query params. */
export function extractYoutubeWatchUrls(text: string): string[] {
  const found = text.match(YOUTUBE_URL_PATTERN) ?? [];
  const unique = new Set<string>();

  for (const raw of found) {
    try {
      const url = new URL(raw);
      const id =
        url.hostname.includes("youtu.be")
          ? url.pathname.replace("/", "")
          : url.searchParams.get("v");
      if (id) {
        unique.add(`https://www.youtube.com/watch?v=${id}`);
      }
    } catch {
      unique.add(raw);
    }
  }

  return [...unique];
}

export type YoutubeOembed = {
  title: string;
  authorName: string;
  channelUrl: string;
};

export async function fetchYoutubeOembed(
  watchUrl: string,
): Promise<YoutubeOembed | undefined> {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", watchUrl);
  endpoint.searchParams.set("format", "json");
  const response = await fetch(endpoint);
  if (!response.ok) {
    return undefined;
  }
  const payload = (await response.json()) as {
    title?: unknown;
    author_name?: unknown;
    author_url?: unknown;
  };
  if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
    return undefined;
  }
  return {
    title: payload.title.trim(),
    authorName:
      typeof payload.author_name === "string" ? payload.author_name.trim() : "",
    channelUrl:
      typeof payload.author_url === "string" ? payload.author_url.trim() : "",
  };
}
