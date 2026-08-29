import { NextResponse } from "next/server";

import { VIDEO_PLAYBACK_REJECT_REASON } from "@/features/workouts/import-eligibility";
import { getYouTubeVideoId } from "@/features/workouts/youtube";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";
import { fetchYoutubeOembed } from "@/shared/youtube";

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const url = new URL(req.url).searchParams.get("url")?.trim() ?? "";
  const videoId = getYouTubeVideoId(url);
  if (!videoId) {
    return apiError("Paste a valid YouTube video link.", 400);
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembed = await fetchYoutubeOembed(watchUrl);
  if (!oembed) {
    return NextResponse.json(
      { playable: false, reason: VIDEO_PLAYBACK_REJECT_REASON },
      { status: 200 },
    );
  }

  return NextResponse.json({
    playable: true,
    title: oembed.title,
    authorName: oembed.authorName,
    channelUrl: oembed.channelUrl,
  });
}
