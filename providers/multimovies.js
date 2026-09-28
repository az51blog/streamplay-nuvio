/**
 * StreamPlay - MultiMovies Provider
 * Searches multimovies.casa for movie/TV streams
 */
const cheerio = require('cheerio');
const DOMAINS_URL = 'https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json';
let BASE_URL = 'https://multimovies.casa';
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const TMDB_URL = 'https://api.themoviedb.org/3';
const USER_AGENT = 'Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/107.0';
const HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function updateBaseUrl() {
  try {
    const res = await fetch(DOMAINS_URL, { headers: HEADERS });
    if (res.ok) {
      const data = await res.json();
      if (data.MultiMovies) BASE_URL = data.MultiMovies.replace(/\/+$/, '');
    }
  } catch (e) {}
}

async function getTmdbMeta(tmdbId, type) {
  try {
    const url = `${TMDB_URL}/${type === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    if (res.ok) {
      const d = await res.json();
      return {
        title: d.title || d.name || d.original_title || '',
        year: (d.release_date || d.first_air_date || '').split('-')[0],
        imdbId: d.imdb_id || '',
      };
    }
  } catch (e) {}
  return null;
}

async function resolveEmbed(embedUrl) {
  try {
    const res = await fetch(embedUrl, {
      headers: { ...HEADERS, 'Referer': BASE_URL + '/' }
    });
    if (!res.ok) return [];
    const html = await res.text();
    
    const streams = [];
    // Look for m3u8 or mp4 streams
    const m3u8Matches = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi) || [];
    const mp4Matches = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi) || [];
    
    for (const url of [...new Set([...m3u8Matches, ...mp4Matches])]) {
      streams.push(url.replace(/\\+\//g, '/'));
    }
    
    return streams;
  } catch (e) {
    return [];
  }
}

async function getStreams(tmdbId, mediaType = 'movie', season = null, episode = null) {
  await updateBaseUrl();
  console.log(`[MultiMovies] Fetching streams for TMDB: ${tmdbId}`);

  const meta = await getTmdbMeta(tmdbId, mediaType);
  if (!meta || !meta.title) return [];

  try {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(meta.title)}`;
    const res = await fetch(searchUrl, { headers: HEADERS });
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const streams = [];

    // Find movie/show links
    let pageUrl = null;
    $('article a[href], .post-title a[href], h2 a[href]').each((i, el) => {
      if (pageUrl) return;
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      const titleNorm = meta.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const textNorm = text.replace(/[^a-z0-9]/g, '');
      if (href.includes(BASE_URL.replace('https://', '')) || href.startsWith('/')) {
        if (textNorm.includes(titleNorm) || titleNorm.includes(textNorm.substring(0, 8))) {
          pageUrl = href.startsWith('http') ? href : BASE_URL + href;
        }
      }
    });

    if (!pageUrl) {
      // Try first article link
      const firstLink = $('article').first().find('a[href]').first().attr('href');
      if (firstLink) pageUrl = firstLink.startsWith('http') ? firstLink : BASE_URL + firstLink;
    }

    if (!pageUrl) {
      console.log('[MultiMovies] No page found for:', meta.title);
      return [];
    }

    console.log('[MultiMovies] Found page:', pageUrl);

    // Fetch movie page
    let targetUrl = pageUrl;
    if (mediaType === 'tv' && season && episode) {
      // Try to navigate to season/episode
      const pageRes = await fetch(pageUrl, { headers: HEADERS });
      if (pageRes.ok) {
        const pageHtml = await pageRes.text();
        const $page = cheerio.load(pageHtml);
        // Find season link
        let seasonUrl = null;
        $page('a[href]').each((i, el) => {
          const href = $page(el).attr('href') || '';
          const text = $page(el).text();
          if (text.match(new RegExp(`season\\s*0*${season}`, 'i')) && href.includes(BASE_URL.replace('https://', ''))) {
            seasonUrl = href;
          }
        });
        if (seasonUrl) {
          const seasonRes = await fetch(seasonUrl, { headers: HEADERS });
          if (seasonRes.ok) {
            const seasonHtml = await seasonRes.text();
            const $season = cheerio.load(seasonHtml);
            $season('a[href]').each((i, el) => {
              const href = $season(el).attr('href') || '';
              const text = $season(el).text();
              if (text.match(new RegExp(`episode\\s*0*${episode}`, 'i')) || text.match(new RegExp(`ep\\s*0*${episode}`, 'i'))) {
                targetUrl = href.startsWith('http') ? href : BASE_URL + href;
              }
            });
          }
        }
      }
    }

    // Get embed links from movie page
    const movieRes = await fetch(targetUrl, { headers: HEADERS });
    if (!movieRes.ok) return [];
    const movieHtml = await movieRes.text();
    const $movie = cheerio.load(movieHtml);

    // Find iframes
    const iframes = [];
    $movie('iframe[src]').each((i, el) => {
      const src = $movie(el).attr('src') || $movie(el).attr('data-src') || '';
      if (src && src.startsWith('http')) iframes.push(src);
    });

    // Find embed links in data attributes
    $movie('[data-src], [data-lazy-src]').each((i, el) => {
      const src = $movie(el).attr('data-src') || $movie(el).attr('data-lazy-src') || '';
      if (src && src.startsWith('http') && (src.includes('embed') || src.includes('play'))) {
        iframes.push(src);
      }
    });

    console.log(`[MultiMovies] Found ${iframes.length} embed(s)`);

    for (const iframe of iframes.slice(0, 5)) {
      const embedStreams = await resolveEmbed(iframe);
      for (const url of embedStreams) {
        streams.push({
          name: 'MultiMovies',
          title: `MultiMovies | ${meta.title}`,
          url,
          quality: url.includes('.m3u8') ? '1080p' : 'Unknown',
          language: 'multi',
          type: 'hls',
          provider: 'MultiMovies',
        });
      }
    }

    console.log(`[MultiMovies] Returning ${streams.length} streams`);
    return streams;
  } catch (e) {
    console.error('[MultiMovies] Error:', e.message);
    return [];
  }
}

module.exports = { getStreams };
