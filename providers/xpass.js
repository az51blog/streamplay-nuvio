/**
 * StreamPlay - Xpass Provider (Fixed)
 * Uses /data/movie/{id}?token=... from play.xpass.top
 */
const XPASS_BASE = 'https://play.xpass.top';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const BASE_HEADERS = {
  'User-Agent': USER_AGENT,
  'Referer': XPASS_BASE + '/',
};

async function __async(fn) {
  return fn();
}

async function getDataUrl(tmdbId, mediaType, season, episode) {
  // Fetch the embed page to get the token
  let embedUrl;
  if (mediaType === 'tv' && season && episode) {
    embedUrl = `${XPASS_BASE}/e/tv/${tmdbId}/${season}/${episode}`;
  } else {
    embedUrl = `${XPASS_BASE}/e/movie/${tmdbId}`;
  }
  
  try {
    const res = await fetch(embedUrl, { headers: BASE_HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    
    // Extract dataUrl with token
    const match = html.match(/var dataUrl\s*=\s*"([^"]+)"/);
    if (match) return match[1];
    
    // Fallback: try to extract playlist url
    const playlistMatch = html.match(/"playlist"\s*:\s*"([^"]+)"/);
    if (playlistMatch && playlistMatch[1]) return playlistMatch[1];
    
    return null;
  } catch (e) {
    console.error('[Xpass] Error getting embed page:', e.message);
    return null;
  }
}

async function parseM3u8(name, masterUrl, headers) {
  try {
    const res = await fetch(masterUrl, { headers });
    if (!res.ok) return [{ quality: 'Auto', url: masterUrl }];
    
    const text = await res.text();
    const base = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1);
    const streams = [];
    const re = /#EXT-X-STREAM-INF:.*?RESOLUTION=(\d+x\d+).*?\n([^\n]+)/gs;
    let m;
    
    while ((m = re.exec(text)) !== null) {
      const quality = m[1].split('x')[1] + 'p';
      let url = m[2].trim();
      if (!url.startsWith('http')) {
        url = url.startsWith('/') ? new URL(masterUrl).origin + url : base + url;
      }
      streams.push({ quality, url });
    }
    
    return streams.length > 0 ? streams : [{ quality: 'Auto', url: masterUrl }];
  } catch (e) {
    return [{ quality: 'Auto', url: masterUrl }];
  }
}

async function getStreams(tmdbId, mediaType = 'movie', season = null, episode = null) {
  console.log(`[Xpass] Fetching streams for ${mediaType} ${tmdbId}`);
  const streams = [];
  
  try {
    // Get data URL with token
    const dataPath = await getDataUrl(tmdbId, mediaType, season, episode);
    if (!dataPath) {
      console.log('[Xpass] No data URL found');
      return [];
    }
    
    const dataUrl = dataPath.startsWith('http') ? dataPath : XPASS_BASE + dataPath;
    console.log('[Xpass] Data URL:', dataUrl.substring(0, 100));
    
    // Fetch the data
    const res = await fetch(dataUrl, {
      headers: {
        ...BASE_HEADERS,
        'Accept': 'application/json, text/plain, */*',
      }
    });
    
    if (!res.ok) {
      console.log('[Xpass] Data fetch failed:', res.status);
      return [];
    }
    
    let data;
    try {
      data = await res.json();
    } catch (e) {
      // Try to parse as text with JSON embedded
      const text = await res.text();
      const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (jsonMatch) {
        try { data = JSON.parse(jsonMatch[1]); } catch { }
      }
    }
    
    if (!data) {
      console.log('[Xpass] Could not parse data');
      return [];
    }
    
    // Handle different response formats
    const sources = Array.isArray(data) ? data : (data.sources || data.playlist || []);
    console.log(`[Xpass] Found ${sources.length} source(s)`);
    
    for (const source of sources) {
      // Format 1: { file, type, label }
      const fileUrl = source.file || source.url || source.src;
      if (!fileUrl || !fileUrl.startsWith('http')) continue;
      
      const isHls = (source.type && source.type.toLowerCase().includes('hls')) || 
                    fileUrl.endsWith('.m3u8');
      
      const serverName = source.label || source.name || 'Xpass';
      
      if (isHls) {
        const variants = await parseM3u8(serverName, fileUrl, BASE_HEADERS);
        for (const v of variants) {
          streams.push({
            name: `🔑 Xpass [${serverName}]`,
            title: v.quality,
            url: v.url,
            quality: v.quality,
            type: 'hls',
            headers: { 'Referer': XPASS_BASE + '/', 'User-Agent': USER_AGENT },
            provider: 'xpass',
          });
        }
      } else {
        streams.push({
          name: `🔑 Xpass [${serverName}]`,
          title: 'Auto',
          url: fileUrl,
          quality: 'Auto',
          type: fileUrl.endsWith('.mp4') ? 'mp4' : null,
          headers: { 'Referer': XPASS_BASE + '/', 'User-Agent': USER_AGENT },
          provider: 'xpass',
        });
      }
    }
    
    // Handle nested playlist format: [{ sources: [{file, type}] }]
    if (streams.length === 0 && Array.isArray(sources)) {
      for (const item of sources) {
        const itemSources = item.sources || item.tracks || [];
        for (const src of itemSources) {
          const fileUrl = src.file || src.url;
          if (!fileUrl || !fileUrl.startsWith('http')) continue;
          streams.push({
            name: '🔑 Xpass',
            title: src.label || 'Auto',
            url: fileUrl,
            quality: src.label || 'Auto',
            type: 'hls',
            headers: { 'Referer': XPASS_BASE + '/', 'User-Agent': USER_AGENT },
            provider: 'xpass',
          });
        }
      }
    }
    
  } catch (e) {
    console.error('[Xpass] Error:', e.message);
  }
  
  console.log(`[Xpass] Returning ${streams.length} stream(s)`);
  return streams;
}

module.exports = { getStreams };