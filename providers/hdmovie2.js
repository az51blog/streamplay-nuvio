/**
 * StreamPlay - Hdmovie2 Provider (Ultra Stream V3 Engine)
 * Ported directly for Nuvio
 */
const cheerio = require('cheerio');
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
let BASE_URL = "https://hdmovie2a.biz";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};

async function updateBaseUrl() {
  try {
    const res = await fetch(DOMAINS_URL);
    if (res.ok) {
      const data = await res.json();
      if (data.hdmovie2) {
        BASE_URL = data.hdmovie2.replace(/\/+$/, '');
        HEADERS["Referer"] = BASE_URL + "/";
      }
    }
  } catch (e) {}
}

async function getTmdbTitle(tmdbId, type) {
  try {
    const url = `https://api.themoviedb.org/3/${type === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || data.name || data.original_title,
        year: (data.release_date || data.first_air_date || '').split('-')[0]
      };
    }
  } catch (e) {}
  return null;
}

async function getStreams(tmdbId, mediaType = 'movie', season = null, episode = null) {
  await updateBaseUrl();
  console.log(`[Hdmovie2] Fetching streams for TMDB: ${tmdbId}, Type: ${mediaType}`);

  const meta = await getTmdbTitle(tmdbId, mediaType);
  if (!meta || !meta.title) return [];

  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(meta.title)}`;
  console.log(`[Hdmovie2] Searching: ${searchUrl}`);

  const streams = [];
  try {
    const searchRes = await fetch(searchUrl, { headers: HEADERS });
    if (!searchRes.ok) return [];

    const html = await searchRes.text();
    const $ = cheerio.load(html);

    let targetLink = null;
    $('article, div.result-item, div.item').each((i, el) => {
      const title = $(el).find('h2, h3, .title').text().trim();
      const href = $(el).find('a').attr('href');
      if (href && title.toLowerCase().includes(meta.title.toLowerCase())) {
        targetLink = href;
        return false;
      }
    });

    if (!targetLink) {
      // fallback to first anchor with class or in results
      targetLink = $('div.search-page a[href*="/movies/"], div.search-page a[href*="/series/"], div.items a[href]').first().attr('href');
    }

    if (!targetLink) {
      console.log('[Hdmovie2] No matching movie page found.');
      return [];
    }

    console.log(`[Hdmovie2] Found content page: ${targetLink}`);
    const pageRes = await fetch(targetLink, { headers: HEADERS });
    if (!pageRes.ok) return [];

    const pageHtml = await pageRes.text();
    const $page = cheerio.load(pageHtml);

    // Extract iframes or embedded player options (Ultra Stream V3, HubCloud, HDm2, FSL)
    const iframes = [];
    $page('iframe[src], iframe[data-src]').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.startsWith('http')) {
        iframes.push(src);
      }
    });

    // Check player option buttons
    $page('ul.options, div.play-options, ul.aa-tvi li').each((i, el) => {
      const postData = $(el).attr('data-post') || $(el).attr('data-nume') || $(el).attr('data-opt');
      if (postData) {
        // Option exists
      }
    });

    // Also look for direct script patterns
    const scriptSrcMatches = pageHtml.match(/src\s*:\s*["'](https?:\/\/[^"']+)["']/g) || [];
    for (const m of scriptSrcMatches) {
      const u = m.replace(/src\s*:\s*["']/, '').replace(/["']$/, '');
      if (u.includes('m3u8') || u.includes('mp4')) {
        iframes.push(u);
      }
    }

    for (const link of iframes) {
      const isM3u8 = link.includes('.m3u8');
      streams.push({
        name: 'StreamPlay - Hdmovie2 Ultra Stream',
        title: `Hdmovie2 [Ultra Stream V3] ${meta.title} (${meta.year || ''})`,
        url: link,
        quality: '1080p',
        size: '1080p Ultra HD',
        headers: {
          "Referer": targetLink,
          "User-Agent": HEADERS["User-Agent"]
        },
        provider: 'hdmovie2'
      });
    }

    console.log(`[Hdmovie2] Total streams extracted: ${streams.length}`);
    return streams;
  } catch (err) {
    console.error(`[Hdmovie2] Error: ${err.message}`);
    return [];
  }
}

module.exports = { getStreams };
