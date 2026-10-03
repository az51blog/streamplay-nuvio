/**
 * Rich Card metadata formatter for Nuvio
 * Generates the standardized Multi-line cards used by Nuvio
 * to display Resolution, Size, Codec, Audio and Server details.
 */

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
  
  // Icon based on quality
  let qIcon = "🔥";
  if (qStr.includes("2160") || qStr.includes("4K")) qIcon = "⚡";
  else if (qStr.includes("1080")) qIcon = "💎";
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

module.exports = { formatRichDetails };
