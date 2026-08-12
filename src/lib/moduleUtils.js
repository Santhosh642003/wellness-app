export function mapModule(m) {
  const videos = Array.isArray(m.videos) && m.videos.length > 0
    ? m.videos
    : m.videoUrl
    ? [{ id: "v0", url: m.videoUrl, title: m.title || "Video", duration: m.duration || "" }]
    : [];
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    desc: m.description,
    mins: parseInt(m.duration) || 10,
    points: m.pointsValue,
    watchedPct: m.userProgress ? Math.round(m.userProgress.watchedPercent ?? 0) : 0,
    locked: m.locked,
    completed: m.userProgress?.completed ?? false,
    quizPassed: m.userProgress?.quizPassed ?? false,
    category: m.category || "General",
    orderIndex: m.orderIndex ?? 0,
    keyPoints: Array.isArray(m.keyPoints) ? m.keyPoints : [],
    videos,
    videoCount: videos.length,
    videoProgress: m.userProgress?.videoProgress || {},
    documentCount: Array.isArray(m.documents) ? m.documents.length : 0,
    thumbnailUrl: m.thumbnailUrl || null,
  };
}
