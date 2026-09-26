# StreamPlay for Nuvio (Phisher MultiAPI Port)

هذه الحزمة هي تحويل مباشر وشامل لمزود **StreamPlay** الشهير في تطبيق Cloudstream ليعمل داخل تطبيق **Nuvio**.

## ما الذي تحتويه الحزمة؟
تم تجميع الـ 10 محركات الأساسية التي يعتمد عليها StreamPlay في Cloudstream وتهيئتها كـ Scrapers مدمجة لـ Nuvio:
1. **VidSrc** (سيرفر البث الأساسي عالي السرعة والجودة).
2. **VixSrc** (سيرفر بث HLS مباشر ومستقر).
3. **VidLink** (سيرفر مدعوم بـ TMDB لتشغيل الأفلام والمسلسلات بجودات متعددة).
4. **VidEasy** (سيرفر بديل سريع ومتعدد الـ CDN).
5. **Cineby** (سيرفر أفلام ومسلسلات بجودة تصل إلى 4K).
6. **MovieBox** (سيرفر متعدد المسارات الصوتية والجودات).
7. **KissKH** (قسم الدراما الكورية والآسيوية المترجمة).
8. **ReAnime** (قسم مسلسلات وأفلام الأنمي المترجمة والمدبلجة).
9. **UHDMovies** (قسم أفلام 4K و Ultra HD).
10. **Torrentio / TorraStream** (قسم روابط التورنت والـ 4K مع دعم Debrid الاختياري).

---

## كيف ترفع هذه الحزمة للحصول على رابط مباشر خاص بك؟
لكي يتعرف عليها Nuvio على هاتفك أو شاشتك الذكية عبر رابط URL:
1. قم بإنشاء مستودع جديد على حسابك في GitHub (مثلاً: `streamplay-nuvio`).
2. ارفع محتويات المجلد `streamplay-nuvio` (ملف `manifest.json` ومجلد `providers`).
3. سيكون الرابط الخاص بك الذي تضعه في Nuvio بالشكل التالي:
   `https://raw.githubusercontent.com/<YOUR_USERNAME>/streamplay-nuvio/main/manifest.json`
4. ادخل تطبيق Nuvio:
   * اذهب إلى **Settings > Plugins**.
   * اضغط **Add (+)** والصق الرابط أعلاه.
   * سيتم تثبيت جميع سيرفرات StreamPlay دفعة واحدة!
