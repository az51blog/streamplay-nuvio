# 🎬 StreamPlay Nuvio Extension - Documentation & Architecture Guide

دليل شامل وتفصيلي للمشروع، بنيته المعمارية، ما تم إنجازه، وكيفية التطوير عليه وإضافة مزودات جديدة مستقبلاً.

---

## 📌 1. نظرة عامة على المشروع (Overview)

هذا المشروع عبارة عن إضافة (Plugin / Repository Scrapers) لتطبيق **Nuvio** مستخرجة ومطورة من إضافة **CloudStream (StreamPlay)** لتوفير روابط بث ومشاهدة مباشرة وسريعة للأفلام والمسلسلات مع تفاصيل شاملة لكل رابط وترتيب تلقائي حسب الجودة.

---

## 💡 2. ما تم إنجازه وحلّه (Accomplished Work)

### أ) حل مشكلة غياب تفاصيل وحجم الروابط (Rich Detail Cards)
* **المشكلة السابقة:** كانت الروابط تظهر في تطبيق Nuvio بأسماء بسيطة دون حجم الفيلم أو الترميز أو السيرفر، باستثناء مزود `4KHDHub`.
* **الحل المنفذ:** تم إنشاء وحدة موحدة [`providers/helpers/richDetails.js`](file:///E:/AI/nuvio%20repos/streamplay-nuvio/providers/helpers/richDetails.js) وتطبيق نظام **البطاقات الغنية المتعددة الأسطر (Multi-line Cards)** مع الأيقونات التعبيرية (Emojis):
  - **السطر الأول:** 🎬 اسم العمل وسنة الإنتاج `(1999)`.
  - **السطر الثاني:** أيقونة الجودة (💎 لـ 1080p، ⚡ لـ 4K/2160p، 🛰️ لـ 720p) + الحجم `💾 1.8 GB` + الحاوية `📼 MKV / MP4`.
  - **السطر الثالث:** الترميز و HDR `🎥 H.264 / H.265 / 10bit`.
  - **السطر الرابع:** مسار الصوت واللغة `🌍 Dual-Audio / Original`.
  - **السطر الخامس:** اسم السيرفر ونوع المصدر `⛓️‍💥 10Gbps / Direct | 📥 WEB-DL`.

### ب) تطبيق الأولوية القصوى لجودة 1080p (1080p Priority Sorting)
* **سر الترتيب في Nuvio:** تطبيق Nuvio يقوم بفرز أسماء الروابط أبجدياً (`localeCompare`) عند عرضها في الواجهة.
* **الحل المبتكر:** استخدام وسوم أحرف غير مرئية **Zero-Width Unicode Characters** (`\ufeff` و `\u200b`):
  - يتم تحويل وزن الجودة المقلوب إلى شفرة ثنائية (Binary) من هذه الأحرف غير المرئية في بداية حقل `name`.
  - جودة **1080p** تحمل الوزن الأعلى (`900,000`) لتتصدر دائماً قائمة الروابط في التطبيق.
  - تليها جودة **4K / 2160p** (`800,000`)، ثم **720p** (`700,000`)، ثم باقي الجودات.

### ج) تفعيل وتطوير المصادر الحديثة والسريعة:
1. **MovieBox Direct API (`moviebox.js`):**
   - استخراج روابط البث السريعة المباشرة (DASH / HLS) للأفلام والمسلسلات بدقة 1080p وترجمات عربية ودبلجات مختلفة في ثوانٍ معدودة.
2. **PlayIMDb (`playimdb.js`):**
   - محرك VAPlayer السريع لجلب روابط HLS / M3U8 متعددة السيرفرات للأفلام والمسلسلات.
3. **DahmerMovies & DahmerMovies 4K (`dahmermovies.js` / `dahmermovies-4k.js`):**
   - سيرفرات CDN سريعة جداً تم ضبط فرزها لتضع 1080p في المقدمة قبل 4K.
4. **VidRock (`vidrock.js`):**
   - فك تشفير AES-GCM للروابط المباشرة وتطبيق وسم الفرز.
5. **HDHub4u / MoviesDrive / MoviesMod / UHDMovies / VegaMovies:**
   - تحديثها ببطاقات التفاصيل وحل مشاكل الروابط الداخلية.

---

## 🏗️ 3. بنية المشروع وملفاته (Folder Structure)

```text
streamplay-nuvio/
├── manifest.json              # تعريف الإضافة في Nuvio وقائمة المزودات المفعلة
├── providers/                 # مجلد مزودات البث (Scrapers)
│   ├── helpers/
│   │   └── richDetails.js     # وحدة توليد البطاقات الغنية وأوسمة ترتيب الجودة
│   ├── 4khdhub.js             # مزود 4KHDHub
│   ├── dahmermovies.js        # مزود DahmerMovies المباشر
│   ├── dahmermovies-4k.js     # مزود DahmerMovies 4K
│   ├── hdhub4u.js             # مزود HDHub4u
│   ├── moviebox.js            # مزود MovieBox API
│   ├── moviesdrive.js         # مزود MoviesDrive
│   ├── moviesmod.js           # مزود MoviesMod
│   ├── playimdb.js            # مزود PlayIMDb السريع
│   ├── uhdmovies.js           # مزود UHDMovies
│   ├── vegamovies.js          # مزود VegaMovies
│   ├── vidrock.js             # مزود VidRock
│   └── ...                    # باقي المزودات
└── README.md
```

---

## 🛠️ 4. كائن البث القياسي في Nuvio (Stream Object Schema)

كل مزود يقوم بتصدير الدالة الأساسية:
```javascript
async function getStreams(tmdbId, mediaType = 'movie', season = null, episode = null)
```

ويجب أن تُرجع الدالة مصفوفة من كائنات البث بالهيكل التالي:

```javascript
{
  // 1. الاسم الظاهر في القائمة (يبدأ بوسم الترتيب غير المرئي)
  name: `${sortTag}ProviderName | 1080p | ServerName`,

  // 2. بطاقة التفاصيل الغنية (تظهر تحت/بجانب الرابط في Nuvio)
  title: richCardText,
  size: richCardText,
  description: richCardText,

  // 3. رابط البث المباشر (HLS / MP4 / DASH)
  url: "https://example.com/video/master.m3u8",

  // 4. الجودة المحددة
  quality: "1080p",

  // 5. الهيدرز اللازمة لتخطي الحماية
  headers: {
    "User-Agent": "Mozilla/5.0 ...",
    "Referer": "https://source-domain.com/"
  },

  // 6. هيدرز المشغل الخارجي لـ Nuvio
  behaviorHints: {
    notWebReady: true,
    proxyHeaders: {
      request: {
        Referer: "https://source-domain.com/"
      }
    }
  },

  // 7. معرف المزود
  provider: "provider_id"
}
```

---

## 🚀 5. كيفية إضافة مزود جديد مستقبلاً (How to Add a New Provider)

عند إضافة مزود جديد، اتبع هذه الخطوات البسيطة:

### الخطوة 1: استيراد مكتبة الترتيب والبطاقات
في بداية ملف المزود:
```javascript
const { getInvertedSortTag, getQualityWeight, formatRichDetails } = require('./helpers/richDetails');
```

### الخطوة 2: إنشاء بطاقة التفاصيل ووسم الفرز لكل رابط
```javascript
const q = '1080p'; // أو استخراجه من الرابط
const card = formatRichDetails({
  title: movieTitle,
  year: releaseYear,
  quality: q,
  size: sizeText || 'Direct',
  server: 'Server 1',
  codec: 'H.264',
  audio: 'Original',
  container: isHls ? 'M3U8' : 'MP4',
  sourceType: 'WEB-DL'
});

const sortTag = getInvertedSortTag(getQualityWeight(q));

streams.push({
  name: `${sortTag}MyProvider | ${q} | Server 1`,
  title: card,
  size: card,
  description: card,
  url: streamUrl,
  quality: q,
  headers: { Referer: 'https://mysite.com/' },
  behaviorHints: {
    notWebReady: true,
    proxyHeaders: { request: { Referer: 'https://mysite.com/' } }
  },
  provider: 'myprovider'
});
```

### الخطوة 3: ترتيب المصفوفة وإرجاعها
```javascript
return streams.sort((a, b) => getQualityWeight(b.quality) - getQualityWeight(a.quality));
```

### الخطوة 4: تسجيل المزود في `manifest.json`
إضافة كائن المزود في مصفوفة `scrapers` داخل [`manifest.json`](file:///E:/AI/nuvio%20repos/streamplay-nuvio/manifest.json).

---

## 🧪 6. أوامر الاختبار والتحقق السريع (Testing Commands)

يمكن اختبار أي مزود مباشرة عبر الطرفية (Terminal) باستخدام السكريبت الموجود في المشروع:

```bash
# اختبار فيلم معين (مثال Fight Club TMDB ID = 550)
node test_one.js moviebox 550 movie
node test_one.js playimdb 550 movie
node test_one.js dahmermovies 550 movie

# اختبار حلقة مسلسل (مثال Game of Thrones TMDB ID = 1399)
node test_one.js moviebox 1399 tv
```

---
*تم إنشاء هذا التوثيق ليكون مرجعاً تقنياً شاملاً للمشروع.*
