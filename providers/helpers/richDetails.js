/**
 * Rich Card metadata formatter and Quality Sorter for Nuvio
 *
 * Rules:
 * 1. 1080p is top absolute priority (weight 900000)
 * 2. 4K / 2160p is second priority (weight 800000)
 * 3. 720p is third priority (weight 700000)
 * 4. 480p / SD (weight 500000)
 * 5. Other / Auto (weight 400000)
 */

function getInvertedSortTag(weight, maxVal = 999999) {
  const norm = Math.max(0, parseInt(weight, 10) || 0);
  const inv = Math.max(0, maxVal - norm);
  const bin = inv.toString(2).padStart(20, '0');
  return bin.split('').map(b => b === '1' ? '\ufeff' : '\u200b').join('');
}

function getQualityWeight(qStr) {
  const q = String(qStr || '').toLowerCase();
  if (q.includes('1080')) return 900000;
  if (q.includes('2160') || q.includes('4k')) return 800000;
  if (q.includes('720')) return 700000;
  if (q.includes('480')) return 500000;
  if (q.includes('360')) return 400000;
  return 300000;
}

function formatRichDetails({
  title = "Movie",
  year = "",
  quality = "1080p",
  size = "",
  server = "Direct",
  codec = "H.264",
  audio = "Dual-Audio",
  container = "MKV",
  sourceType = "WEB-DL",
  hdr = ""
}) {
  const yearStr = year ? ` - (${year})` : "";
  const qStr = (quality || "1080p").toUpperCase().replace("P", "p");
  
  // Icon based on quality: 1080p gets 💎, 4K gets ⚡, 720p gets 🛰️
  let qIcon = "🔥";
  if (qStr.includes("1080")) qIcon = "💎";
  else if (qStr.includes("2160") || qStr.includes("4K")) qIcon = "⚡";
  else if (qStr.includes("720")) qIcon = "🛰️";

  // Size string
  const sizeStr = size && size !== "Unknown" && size !== "N/A" ? ` | 💾 ${size}` : "";

  // Line 1: Title
  const line1 = `🎬 ${title}${yearStr}`;
  // Line 2: Quality + Size + Container
  const line2 = `${qIcon} ${qStr}${sizeStr} | 📼 ${container}`;
  // Line 3: HDR / Codec
  const hdrPart = hdr ? `🌈 ${hdr} | ` : "";
  const line3 = `${hdrPart}🎥 ${codec}`;
  // Line 4: Audio
  const line4 = `🌍 ${audio} | 🎧 Auto`;
  // Line 5: Server / Source
  const line5 = `⛓️‍💥 ${server} | 📥 ${sourceType}`;

  return [line1, line2, line3, line4, line5].filter(Boolean).join("\n");
}

/**
 * Standard stream creator with automatic 1080p priority sorting tag
 */
function createStream({
  provider = "Stream",
  server = "Direct",
  quality = "1080p",
  title = "Movie",
  year = "",
  size = "",
  codec = "H.264",
  audio = "Dual-Audio",
  container = "MKV",
  sourceType = "WEB-DL",
  hdr = "",
  url = "",
  headers = {},
  subtitles = [],
  behaviorHints = null,
  extraWeight = 0
}) {
  const card = formatRichDetails({
    title,
    year,
    quality,
    size,
    server,
    codec,
    audio,
    container,
    sourceType,
    hdr
  });

  const baseWeight = getQualityWeight(quality);
  const totalWeight = baseWeight + Math.min(9999, Math.max(0, extraWeight));
  const sortPrefix = getInvertedSortTag(totalWeight);

  const streamObj = {
    name: `${sortPrefix}${provider} | ${quality} | ${server}`,
    title: card,
    size: card,
    description: card,
    url,
    quality: quality || "1080p",
    provider: provider.toLowerCase().replace(/[^a-z0-9]/g, ""),
    subtitles: subtitles || []
  };

  if (headers && Object.keys(headers).length > 0) {
    streamObj.headers = headers;
  }

  if (behaviorHints) {
    streamObj.behaviorHints = behaviorHints;
  } else if (headers && headers.Referer) {
    streamObj.behaviorHints = {
      notWebReady: true,
      proxyHeaders: { request: { Referer: headers.Referer } }
    };
  }

  return streamObj;
}

function sortByQuality(streams = []) {
  return [...streams].sort((a, b) => {
    const wa = getQualityWeight(a.quality);
    const wb = getQualityWeight(b.quality);
    return wb - wa;
  });
}

module.exports = {
  formatRichDetails,
  getInvertedSortTag,
  getQualityWeight,
  createStream,
  sortByQuality
};
