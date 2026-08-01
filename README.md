# إدارات قطاع الري — Static PWA

تطبيق ويب عربي خفيف لاستعراض إدارات قطاع الري وهندساتها وترعها ومنشآتها المائية من سجل البيانات المرفق.

## البنية الحالية

- صفحة واحدة ثابتة: `index.html`
- بدون React أو Hydration أو مستمعات Scroll/Touch
- بيانات التشغيل المضغوطة: `data/sector.json.gz`
- دعم التثبيت كتطبيق PWA عبر `manifest.webmanifest` و`sw.js`
- نسخة النشر على GitHub Pages داخل `docs/`

الرابط: https://mohseno2002.github.io/irrigation-sector-admins/
