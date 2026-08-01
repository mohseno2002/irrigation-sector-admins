"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type RawData = {
  generatedFrom: string;
  generatedAt: string;
  duplicateRowsRemoved: number;
  A: string[];
  E: string[];
  C: string[];
  G: string[];
  T: string[];
  U: string[];
  M: string[];
  N: string[];
  R: number[][];
};

type Asset = {
  id: number;
  adm: string;
  eng: string;
  canal: string;
  gov: string;
  type: string;
  use: string;
  material: string;
  name: string;
  km: number | null;
  length: number | null;
  width: number | null;
  lon: number | null;
  lat: number | null;
};

type AdminSummary = {
  name: string;
  assets: Asset[];
  engineers: number;
  canals: number;
  governorates: string[];
  geocoded: number;
  readiness: number;
};

type WorkspaceTab = "structure" | "assets" | "coverages" | "properties" | "quality";

type FocusLevel = "engineers" | "canals" | "assets";

type DiagState = {
  w: number;
  h: number;
  vv: number;
  scale: number;
  m640: boolean;
  m1000: boolean;
  y: number;
  maxY: number;
  jumps: number;
  lastJump: number;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const number = new Intl.NumberFormat("ar-EG");

function decode(data: RawData): Asset[] {
  return data.R.map((row, id) => ({
    id,
    adm: data.A[row[0]] || "غير محدد",
    eng: data.E[row[1]] || "غير محدد",
    canal: data.C[row[2]] || "غير محدد",
    gov: data.G[row[3]] || "غير محدد",
    type: data.T[row[4]] || "غير مسجل",
    use: data.U[row[5]] || "غير محدد",
    material: data.M[row[6]] || "غير محدد",
    name: data.N[row[7]] || "منشأ بدون اسم",
    km: row[8] === -1 ? null : row[8],
    length: row[9] === -1 ? null : row[9],
    width: row[10] === -1 ? null : row[10],
    lon: row[11] === -1 ? null : row[11],
    lat: row[12] === -1 ? null : row[12],
  }));
}

function getReadiness(items: Asset[]) {
  if (!items.length) return 0;
  let complete = 0;
  for (const item of items) {
    if (item.type !== "غير مسجل") complete += 1;
    if (item.length !== null) complete += 1;
    if (item.width !== null) complete += 1;
    if (item.lat !== null && item.lon !== null) complete += 1;
  }
  return Math.round((complete / (items.length * 4)) * 100);
}

function assetClass(item: Asset) {
  const text = `${item.name} ${item.type}`;
  if (/تغطي|مغط/.test(text)) return "تغطية";
  if (/سحار|بدال/.test(text)) return "سحارة/بدالة";
  if (/فم|مأخذ/.test(text)) return "فم/مأخذ";
  if (/حجز|قنطرة/.test(text)) return "منشأ حجز";
  if (/عبار|عبّار|مواسير|بربخ/.test(text)) return "عبّارة/مواسير";
  if (/هدار/.test(text)) return "هدار";
  return "كوبري";
}

function csvCell(value: string | number | null) {
  if (value === null) return "";
  const text = String(value);
  return /[,"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function makeSummaries(items: Asset[]): AdminSummary[] {
  const groups = new Map<string, Asset[]>();
  for (const item of items) {
    const group = groups.get(item.adm) ?? [];
    group.push(item);
    groups.set(item.adm, group);
  }
  return [...groups.entries()]
    .map(([name, assets]) => ({
      name,
      assets,
      engineers: new Set(assets.map((item) => item.eng)).size,
      canals: new Set(assets.map((item) => item.canal)).size,
      governorates: [...new Set(assets.map((item) => item.gov))],
      geocoded: assets.filter((item) => item.lat !== null && item.lon !== null)
        .length,
      readiness: getReadiness(assets),
    }))
    .sort((a, b) => b.assets.length - a.assets.length);
}

function Glyph({ children }: { children: React.ReactNode }) {
  return <span className="glyph" aria-hidden="true">{children}</span>;
}

export default function Home() {
  const [data, setData] = useState<RawData | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("structure");
  const [focusLevel, setFocusLevel] = useState<FocusLevel>("engineers");
  const [focusTick, setFocusTick] = useState(0);
  const focusRequest = useRef(0);
  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(null);
  const [selectedCanal, setSelectedCanal] = useState<string | null>(null);
  const [assetQuery, setAssetQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [online, setOnline] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [diag, setDiag] = useState<DiagState | null>(null);

  useEffect(() => {
    fetch("/data/sector.json")
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل البيانات");
        return response.json() as Promise<RawData>;
      })
      .then((payload) => {
        setData(payload);
        setAssets(decode(payload));
      })
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const installHandler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", installHandler);
    return () => window.removeEventListener("beforeinstallprompt", installHandler);
  }, []);

  useEffect(() => {
    if (!window.location.search.includes("diag")) return;
    let lastY = window.scrollY;
    let maxY = window.scrollY;
    let jumps = 0;
    let lastJump = 0;
    let queued = false;
    const read = (): DiagState => ({
      w: window.innerWidth,
      h: window.innerHeight,
      vv: window.visualViewport ? Math.round(window.visualViewport.height) : 0,
      scale: window.visualViewport ? Math.round(window.visualViewport.scale * 100) / 100 : 1,
      m640: window.matchMedia("(max-width: 640px)").matches,
      m1000: window.matchMedia("(max-width: 1000px)").matches,
      y: Math.round(window.scrollY),
      maxY: Math.round(maxY),
      jumps,
      lastJump,
    });
    const push = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        setDiag(read());
      });
    };
    const onScroll = () => {
      const y = window.scrollY;
      if (y > maxY) maxY = y;
      const delta = y - lastY;
      if (delta < -60) {
        jumps += 1;
        lastJump = Math.round(delta);
      }
      lastY = y;
      push();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.visualViewport?.addEventListener("resize", push);
    setDiag(read());
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", push);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const target =
      focusLevel === "canals"
        ? ".canal-panel"
        : focusLevel === "assets"
          ? ".assets-panel"
          : null;
    const timer = window.setTimeout(() => {
      const node = target
        ? document.querySelector<HTMLElement>(target)
        : document.getElementById("admin-workspace");
      node?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 90);
    return () => window.clearTimeout(timer);
  }, [selected, focusLevel, focusTick]);

  const summaries = useMemo(() => makeSummaries(assets), [assets]);
  const filtered = useMemo(() => {
    const normalized = query.trim();
    if (!normalized) return summaries;
    return summaries.filter((item) =>
      [item.name, ...item.governorates].join(" ").includes(normalized),
    );
  }, [query, summaries]);

  const totals = useMemo(
    () => ({
      administrations: summaries.length,
      engineers: new Set(assets.map((item) => item.eng)).size,
      canals: new Set(assets.map((item) => item.canal)).size,
      assets: assets.length,
      geocoded: assets.filter((item) => item.lat !== null && item.lon !== null)
        .length,
    }),
    [assets, summaries.length],
  );

  const classDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach((item) => {
      const key = assetClass(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [assets]);

  const globalReadiness = useMemo(() => getReadiness(assets), [assets]);

  const openAdmin = (name: string, focus: FocusLevel = "engineers") => {
    setSelected(name);
    setActiveTab(focus === "assets" ? "assets" : "structure");
    setSelectedEngineer(null);
    setSelectedCanal(null);
    setAssetQuery("");
    setCategory("الكل");
    setFocusLevel(focus);
    focusRequest.current += 1;
    setFocusTick(focusRequest.current);
  };

  const selectWorkspaceTab = (nextTab: WorkspaceTab) => {
    if (nextTab === activeTab) return;

    // لا نلمس تمرير الصفحة العمودي هنا إطلاقًا: أي window.scrollTo بعد تبديل
    // التبويب يتصارع مع تصحيح المتصفح لارتفاع المستند فينتج اهتزاز متكرر على
    // الموبايل. نكتفي بالحفاظ على موضع شريط التبويبات الأفقي فقط.
    const tabStrip = document.querySelector<HTMLElement>(".workspace-tabs");
    const currentTabScroll = tabStrip?.scrollLeft ?? 0;

    setActiveTab(nextTab);

    window.requestAnimationFrame(() => {
      if (tabStrip) tabStrip.scrollLeft = currentTabScroll;
    });
  };

  const selectedSummary = summaries.find((item) => item.name === selected) ?? null;
  const engineers = useMemo(() => {
    if (!selectedSummary) return [];
    const groups = new Map<string, Asset[]>();
    selectedSummary.assets.forEach((item) => {
      const group = groups.get(item.eng) ?? [];
      group.push(item);
      groups.set(item.eng, group);
    });
    return [...groups.entries()]
      .map(([name, items]) => ({
        name,
        items,
        canals: new Set(items.map((item) => item.canal)).size,
        readiness: getReadiness(items),
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [selectedSummary]);

  const engineerAssets = selectedEngineer
    ? engineers.find((item) => item.name === selectedEngineer)?.items ?? []
    : selectedSummary?.assets ?? [];

  const canals = useMemo(() => {
    const groups = new Map<string, Asset[]>();
    engineerAssets.forEach((item) => {
      const group = groups.get(item.canal) ?? [];
      group.push(item);
      groups.set(item.canal, group);
    });
    return [...groups.entries()]
      .map(([name, items]) => ({ name, items, readiness: getReadiness(items) }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [engineerAssets]);

  const scopedAssets = selectedCanal
    ? canals.find((item) => item.name === selectedCanal)?.items ?? []
    : engineerAssets;

  const visibleAssets = useMemo(() => {
    const q = assetQuery.trim();
    return scopedAssets.filter((item) => {
      if (category !== "الكل" && assetClass(item) !== category) return false;
      if (!q) return true;
      return `${item.name} ${item.canal} ${item.type} ${item.use}`.includes(q);
    });
  }, [assetQuery, category, scopedAssets]);

  const categories = selectedSummary
    ? [...new Set(selectedSummary.assets.map(assetClass))]
    : [];

  const coverageAssets = selectedSummary?.assets.filter((item) => assetClass(item) === "تغطية") ?? [];

  const installApp = async () => {
    if (!installPrompt) {
      setShowInstallGuide(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  };

  const printAdministration = () => {
    if (!selectedSummary) return;
    document.body.classList.add("printing-administration");
    window.print();
    window.setTimeout(() => document.body.classList.remove("printing-administration"), 300);
  };

  const exportAdministration = () => {
    if (!selectedSummary) return;
    const header = ["الإدارة", "الهندسة", "الترعة", "اسم المنشأ", "التصنيف", "النوع", "الاستخدام", "المادة", "الكيلومتر", "الطول م", "العرض م", "خط الطول", "دائرة العرض", "المحافظة"];
    const rows = selectedSummary.assets.map((item) => [item.adm, item.eng, item.canal, item.name, assetClass(item), item.type, item.use, item.material, item.km, item.length, item.width, item.lon, item.lat, item.gov]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedSummary.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main dir="rtl">
      <header className="topbar">
        <button className="menu-button" aria-label="فتح القائمة" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
          <i /><i /><i />
        </button>
        <a className="brand" href="#top" aria-label="إدارات قطاع الري">
          <span className="brand-wave">≈</span>
          <span><b>إدارات قطاع الري</b><small>منصة الأصول والمنشآت المائية</small></span>
        </a>
        <nav aria-label="التنقل الرئيسي">
          <a className="active" href="#top">الرئيسية</a>
          <a href="#sector-dashboard">لوحة القطاع</a>
          <a href="#administrations">الإدارات</a>
          <a href="#admin-workspace">الهندسات</a>
          <a href="#admin-workspace">الترع</a>
          <a href="#admin-workspace">المنشآت</a>
        </nav>
        <div className="top-actions">
          <span className={`source-status ${online ? "" : "offline"}`}><i /> {online ? "متصل · البيانات محمّلة" : "أوفلاين · النسخة المحفوظة"}</span>
          <button className="install-button" onClick={installApp}>تثبيت التطبيق</button>
          <button className="icon-button" aria-label="البحث" onClick={() => document.getElementById("admin-search")?.focus()}>⌕</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="overline">سجل موحّد · هيكل إداري · دعم قرار</span>
          <h1>كل إدارة.<br /><em>كل أصل مائي.</em></h1>
          <p>
            بوابة تشغيلية موحّدة تستعرض إدارات قطاع الري وهندساتها وترعها
            ومنشآتها من مصدر البيانات الفعلي، وتحوّل الحصر إلى معرفة قابلة
            للبحث والمتابعة.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#administrations">استعراض الإدارات <span>←</span></a>
            <span className="data-note">آخر تجميع موثق: ١ أغسطس ٢٠٢٦</span>
          </div>
          <div className="hierarchy" aria-label="مسار استعراض البيانات">
            <span><Glyph>▥</Glyph>الإدارة</span><b>←</b>
            <span><Glyph>⌖</Glyph>الهندسة</span><b>←</b>
            <span><Glyph>≈</Glyph>الترعة</span><b>←</b>
            <span><Glyph>▰</Glyph>المنشأة</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="sun-ring" />
          <div className="nile-stream stream-one" />
          <div className="nile-stream stream-two" />
          <div className="bridge-mark"><i /><i /><i /><span /></div>
          <div className="visual-card">
            <small>الموقف الرقمي للسجل</small>
            <strong>{data ? number.format(totals.geocoded) : "—"}</strong>
            <span>منشأة مرتبطة مكانيًا</span>
            <div className="mini-progress"><i style={{ width: assets.length ? `${Math.round((totals.geocoded / assets.length) * 100)}%` : "0%" }} /></div>
          </div>
        </div>
      </section>

      <section className="metrics" aria-label="ملخص بيانات القطاع">
        {[
          ["▥", "إدارة عامة", totals.administrations],
          ["⌖", "هندسة", totals.engineers],
          ["≈", "ترعة ومجرى", totals.canals],
          ["▰", "سجل منشأة فريد", totals.assets],
        ].map(([icon, label, value]) => (
          <article className="metric-card" key={String(label)}>
            <Glyph>{icon}</Glyph>
            <div><strong>{data ? number.format(Number(value)) : "···"}</strong><span>{label}</span></div>
          </article>
        ))}
      </section>

      <section className="sector-dashboard" id="sector-dashboard">
        <div className="section-heading dashboard-heading">
          <div><span className="overline">الموقف القطاعي</span><h2>قراءة تنفيذية من مصدر واحد</h2><p>توزيع نوعي وإداري محسوب مباشرة من السجل الفريد بعد إزالة التكرارات المطابقة.</p></div>
          <div className="readiness-badge"><span>جاهزية السجل</span><strong>{data ? `${number.format(globalReadiness)}٪` : "—"}</strong><i><b style={{ width: `${globalReadiness}%` }} /></i></div>
        </div>
        <div className="dashboard-grid">
          <article className="insight-panel classification-panel">
            <div className="insight-title"><div><span>التكوين النوعي</span><h3>المنشآت حسب التصنيف</h3></div><b>{number.format(classDistribution.length)}</b></div>
            <div className="distribution-list">
              {classDistribution.map(([label, value]) => (
                <div key={label}><span>{label}</span><i><b style={{ width: `${assets.length ? Math.max(2, (value / assets.length) * 100) : 0}%` }} /></i><strong>{number.format(value)}</strong></div>
              ))}
            </div>
            <small>التصنيف مستنتج فقط من الاسم والنوع المسجلين؛ ولا يمثل تقييمًا لحالة المنشأ.</small>
          </article>

          <article className="insight-panel ranking-panel">
            <div className="insight-title"><div><span>كثافة الأصول</span><h3>أكبر الإدارات من حيث عدد المنشآت</h3></div><b>TOP 8</b></div>
            <div className="ranking-list">
              {summaries.slice(0, 8).map((admin, index) => (
                <button key={admin.name} onClick={() => openAdmin(admin.name)}>
                  <em>{String(index + 1).padStart(2, "0")}</em><span><b>{admin.name}</b><i><u style={{ width: `${summaries[0] ? (admin.assets.length / summaries[0].assets.length) * 100 : 0}%` }} /></i></span><strong>{number.format(admin.assets.length)}</strong>
                </button>
              ))}
            </div>
          </article>

          <article className="insight-panel source-panel">
            <div className="source-seal">✓</div>
            <span className="overline">سلامة المصدر</span>
            <h3>بيانات حقيقية بلا افتراضات</h3>
            <p>تم الاعتماد على سجل الملف المرفق، مع حذف {data ? number.format(data.duplicateRowsRemoved) : "—"} سجلات مكررة تطابقًا كاملًا فقط. وحدتا الأملاك والتغطيات لا تضيفان قيمة غير واردة بالمصدر.</p>
            <div className="source-facts"><span><b>{number.format(totals.geocoded)}</b> بإحداثيات</span><span><b>{number.format(assets.length - totals.geocoded)}</b> دون إحداثيات</span><span><b>{number.format(globalReadiness)}٪</b> جاهزية</span></div>
          </article>
        </div>
      </section>

      <section className="administrations-section" id="administrations">
        <div className="section-heading">
          <div><span className="overline">الدليل الإداري</span><h2>الإدارات العامة</h2><p>اختر إدارة للانتقال إلى هندساتها وترعها ومنشآتها.</p></div>
          <label className="search-box" htmlFor="admin-search">
            <span>⌕</span>
            <input id="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم الإدارة أو المحافظة…" />
          </label>
        </div>

        {!selectedSummary && <>
          <div className="admin-grid">
            {!data && Array.from({ length: 6 }).map((_, index) => <div className="admin-card skeleton" key={index} />)}
            {filtered.map((admin, index) => (
              <article className="admin-card" key={admin.name} style={{ "--delay": `${Math.min(index, 10) * 35}ms` } as React.CSSProperties}>
                <button type="button" className="admin-card-head" onClick={() => openAdmin(admin.name, "engineers")}>
                  <span className="admin-icon">{String(index + 1).padStart(2, "0")}</span>
                  <div><small>{admin.governorates.join(" · ")}</small><h3>{admin.name}</h3></div>
                  <span className="arrow">↙</span>
                </button>
                <div className="admin-stats">
                  <button type="button" aria-label={`عرض أسماء الهندسات التابعة لـ${admin.name}`} onClick={() => openAdmin(admin.name, "engineers")}><b>{number.format(admin.engineers)}</b> هندسة</button>
                  <button type="button" aria-label={`عرض أسماء الترع التابعة لـ${admin.name}`} onClick={() => openAdmin(admin.name, "canals")}><b>{number.format(admin.canals)}</b> ترعة</button>
                  <button type="button" aria-label={`عرض منشآت ${admin.name}`} onClick={() => openAdmin(admin.name, "assets")}><b>{number.format(admin.assets.length)}</b> منشأة</button>
                </div>
                <div className="admin-modules"><button type="button" onClick={() => openAdmin(admin.name, "assets")}>الكباري</button><span className="pending">التغطيات</span><span className="pending">الأملاك</span></div>
                <div className="card-foot"><span>اضغط أي رقم بالأعلى لعرض أسمائه · جاهزية البيانات {number.format(admin.readiness)}٪</span><i><b style={{ width: `${admin.readiness}%` }} /></i></div>
              </article>
            ))}
          </div>
          {!filtered.length && data && <div className="empty-state">لا توجد إدارة مطابقة لعبارة البحث.</div>}
        </>}
      </section>

      <section className={`admin-workspace ${selectedSummary ? "open" : ""}`} id="admin-workspace">
        {!selectedSummary ? (
          <div className="workspace-empty">
            <span className="empty-orbit">⌖</span>
            <span className="overline">مساحة الإدارة</span>
            <h2>اختر إدارة لفتح هيكلها التفصيلي</h2>
            <p>ستظهر الهندسات والترع والكباري والمنشآت مباشرة من السجل المرفق.</p>
          </div>
        ) : (
          <>
            <div className="workspace-hero">
              <div>
                <div className="breadcrumbs"><span>القطاع</span><b>←</b><span>الإدارات العامة</span><b>←</b><strong>{selectedSummary.name}</strong></div>
                <span className="overline">بطاقة الإدارة التشغيلية</span>
                <h2>{selectedSummary.name}</h2>
                <p>{selectedSummary.governorates.join(" · ")} · مصدر البيانات: سجل الكباري والمنشآت المرفق</p>
              </div>
              <div className="workspace-actions">
                <button onClick={exportAdministration}>⇩ تصدير بيانات الإدارة</button>
                <button onClick={printAdministration}>▤ تقرير PDF / طباعة</button>
                <button className="ghost" onClick={() => setSelected(null)}>إغلاق البطاقة</button>
              </div>
            </div>

            <div className="workspace-metrics">
              <article><Glyph>⌖</Glyph><div><strong>{number.format(selectedSummary.engineers)}</strong><span>هندسة تابعة</span></div></article>
              <article><Glyph>≈</Glyph><div><strong>{number.format(selectedSummary.canals)}</strong><span>ترعة ومجرى</span></div></article>
              <article><Glyph>▰</Glyph><div><strong>{number.format(selectedSummary.assets.length)}</strong><span>منشأة مسجلة</span></div></article>
              <article><Glyph>◉</Glyph><div><strong>{number.format(selectedSummary.readiness)}٪</strong><span>جاهزية البيانات</span></div></article>
            </div>

            <div className="workspace-tabs" role="tablist" aria-label="وحدات الإدارة">
              {[
                ["structure", "الهيكل الإداري"],
                ["assets", "الكباري والمنشآت"],
                ["coverages", "التغطيات"],
                ["properties", "الأملاك"],
                ["quality", "جودة البيانات"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  className={activeTab === id ? "active" : ""}
                  onClick={(event) => {
                    event.currentTarget.blur();
                    selectWorkspaceTab(id as WorkspaceTab);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="workspace-content-shell">
            {(activeTab === "structure" || activeTab === "assets") && (
              <div className="asset-browser">
                <aside className={focusLevel === "engineers" ? "engineer-panel focused" : "engineer-panel"}>
                  <div className="panel-title"><div><span>المستوى الأول</span><h3>أسماء الهندسات التابعة</h3></div><b>{number.format(engineers.length)}</b></div>
                  <button className={!selectedEngineer ? "selected" : ""} onClick={() => { setSelectedEngineer(null); setSelectedCanal(null); }}>
                    <span><b>كل الهندسات</b><small>عرض كامل نطاق الإدارة</small></span><strong>{number.format(selectedSummary.assets.length)}</strong>
                  </button>
                  <div className="scroll-list">
                    {engineers.map((engineer) => (
                      <button key={engineer.name} className={selectedEngineer === engineer.name ? "selected" : ""} onClick={() => { setSelectedEngineer(engineer.name); setSelectedCanal(null); }}>
                        <span><b>{engineer.name}</b><small>{number.format(engineer.canals)} ترعة · جاهزية {number.format(engineer.readiness)}٪</small></span><strong>{number.format(engineer.items.length)}</strong>
                      </button>
                    ))}
                  </div>
                </aside>

                <aside className={focusLevel === "canals" ? "canal-panel focused" : "canal-panel"}>
                  <div className="panel-title"><div><span>المستوى الثاني</span><h3>أسماء الترع والمجاري</h3></div><b>{number.format(canals.length)}</b></div>
                  <button className={!selectedCanal ? "selected" : ""} onClick={() => setSelectedCanal(null)}>
                    <span><b>كل الترع</b><small>{selectedEngineer || selectedSummary.name}</small></span><strong>{number.format(engineerAssets.length)}</strong>
                  </button>
                  <div className="scroll-list">
                    {canals.map((canal) => (
                      <button key={canal.name} className={selectedCanal === canal.name ? "selected" : ""} onClick={() => setSelectedCanal(canal.name)}>
                        <span><b>{canal.name}</b><small>جاهزية {number.format(canal.readiness)}٪</small></span><strong>{number.format(canal.items.length)}</strong>
                      </button>
                    ))}
                  </div>
                </aside>

                <div className="assets-panel">
                  <div className="assets-panel-head">
                    <div><span className="overline">المستوى الثالث</span><h3>{selectedCanal || selectedEngineer || "كل منشآت الإدارة"}</h3><p>{number.format(visibleAssets.length)} نتيجة ضمن النطاق المحدد</p></div>
                    <div className="asset-filters">
                      <input value={assetQuery} onChange={(event) => setAssetQuery(event.target.value)} placeholder="ابحث عن منشأ…" />
                      <select value={category} onChange={(event) => setCategory(event.target.value)}>
                        <option>الكل</option>
                        {categories.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="asset-table-wrap">
                    <table>
                      <thead><tr><th>المنشأ</th><th>التصنيف</th><th>النوع / الاستخدام</th><th>كم</th><th>الأبعاد</th><th>الموقع</th></tr></thead>
                      <tbody>
                        {visibleAssets.slice(0, 120).map((item) => (
                          <tr key={item.id}>
                            <td><b>{item.name}</b><small>{item.canal} · {item.eng}</small></td>
                            <td><span className="class-pill">{assetClass(item)}</span></td>
                            <td>{item.type}<small>{item.use} · {item.material}</small></td>
                            <td className="numeric">{item.km === null ? "—" : number.format(item.km)}</td>
                            <td className="numeric">{item.length === null ? "—" : `${number.format(item.length)} × ${item.width === null ? "—" : number.format(item.width)} م`}</td>
                            <td>{item.lat !== null && item.lon !== null ? <a className="map-link" href={`https://www.google.com/maps?q=${item.lat},${item.lon}`} target="_blank" rel="noreferrer">فتح الخريطة ↗</a> : <span className="no-data">غير مسجل</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!visibleAssets.length && <div className="table-empty">لا توجد منشآت مطابقة للاختيار الحالي.</div>}
                    {visibleAssets.length > 120 && <div className="table-limit">يُعرض أول ١٢٠ منشأة لضمان سرعة الموبايل. استخدم البحث أو اختر ترعة لتضييق النتائج.</div>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "coverages" && (
              <div className="module-view">
                <div className="module-intro coverage-theme"><Glyph>≋</Glyph><div><span className="overline">وحدة التغطيات</span><h3>التغطيات الواردة صراحة في سجل المنشآت</h3><p>يعرض التطبيق فقط السجلات التي يتضمن اسمها أو نوعها وصفًا صريحًا بالتغطية أو المنشأ المغطى.</p></div><strong>{number.format(coverageAssets.length)}</strong></div>
                {coverageAssets.length ? (
                  <div className="compact-assets">{coverageAssets.map((item) => <article key={item.id}><b>{item.name}</b><span>{item.canal} · {item.eng}</span><small>{item.type}</small></article>)}</div>
                ) : (
                  <div className="source-gap"><b>لا توجد تغطيات موصوفة صراحة لهذه الإدارة في الملف الحالي.</b><span>لم تتم إضافة أي بيانات تقديرية. يمكن استكمال الوحدة لاحقًا بكشف التغطيات المعتمد: الموقع، الطول، القطاع، الحالة، تاريخ التنفيذ، والتصرف التصميمي.</span></div>
                )}
              </div>
            )}

            {activeTab === "properties" && (
              <div className="module-view">
                <div className="module-intro property-theme"><Glyph>⌂</Glyph><div><span className="overline">وحدة الأملاك</span><h3>سجل أملاك الري ونطاقات الحماية</h3><p>الوحدة جاهزة هيكليًا، لكن ملف الكباري المرفق لا يحتوي بيانات ملكية أو تعديات أو قرارات تخصيص.</p></div><strong>—</strong></div>
                <div className="source-gap property"><b>حالة المصدر: في انتظار كشف أملاك معتمد.</b><span>لن يعرض التطبيق أرقامًا افتراضية. الحقول المقترحة للربط: رقم القطعة، الحوض، المساحة، سند الملكية، الإحداثيات، نوع الإشغال، حالة التعدي، القرار والإجراء التنفيذي.</span></div>
                <div className="field-blueprint">{["رقم القطعة والحوض", "المساحة والحدود", "سند الملكية", "نوع الإشغال", "حالة التعدي", "الإجراء القانوني"].map((item) => <span key={item}>{item}<i>بانتظار المصدر</i></span>)}</div>
              </div>
            )}

            {activeTab === "quality" && (
              <div className="quality-view">
                <article><span>اكتمال النوع</span><strong>{number.format(Math.round((selectedSummary.assets.filter((item) => item.type !== "غير مسجل").length / selectedSummary.assets.length) * 100))}٪</strong><i><b style={{ width: `${(selectedSummary.assets.filter((item) => item.type !== "غير مسجل").length / selectedSummary.assets.length) * 100}%` }} /></i></article>
                <article><span>اكتمال الطول</span><strong>{number.format(Math.round((selectedSummary.assets.filter((item) => item.length !== null).length / selectedSummary.assets.length) * 100))}٪</strong><i><b style={{ width: `${(selectedSummary.assets.filter((item) => item.length !== null).length / selectedSummary.assets.length) * 100}%` }} /></i></article>
                <article><span>اكتمال العرض</span><strong>{number.format(Math.round((selectedSummary.assets.filter((item) => item.width !== null).length / selectedSummary.assets.length) * 100))}٪</strong><i><b style={{ width: `${(selectedSummary.assets.filter((item) => item.width !== null).length / selectedSummary.assets.length) * 100}%` }} /></i></article>
                <article><span>التغطية الجغرافية</span><strong>{number.format(Math.round((selectedSummary.geocoded / selectedSummary.assets.length) * 100))}٪</strong><i><b style={{ width: `${(selectedSummary.geocoded / selectedSummary.assets.length) * 100}%` }} /></i></article>
                <div className="quality-flags">
                  <span><b>{number.format(selectedSummary.assets.filter((item) => item.km !== null && item.km > 100).length)}</b> قيمة كيلومتر تحتاج مراجعة وحدة القياس</span>
                  <span><b>{number.format(selectedSummary.assets.filter((item) => item.width !== null && (item.width > 100 || item.width === 0)).length)}</b> قيمة عرض شاذة أو صفرية</span>
                  <span><b>{number.format(selectedSummary.assets.filter((item) => item.length === 0).length)}</b> قيمة طول صفرية</span>
                </div>
                <div className="quality-note"><b>مهم:</b> جاهزية البيانات لا تعبّر عن الحالة الإنشائية. قرار الصيانة أو الإحلال يحتاج فحصًا ميدانيًا وبيانات عمر المنشأ والأحمال والنحر والاختبارات.</div>
              </div>
            )}
            </div>
          </>
        )}
      </section>

      <div className={menuOpen ? "drawer-scrim open" : "drawer-scrim"} onClick={() => setMenuOpen(false)} />

      <aside className={menuOpen ? "side-drawer open" : "side-drawer"} aria-label="القائمة الرئيسية" aria-hidden={!menuOpen}>
        <div className="drawer-head">
          <span className="brand-wave">≈</span>
          <div><b>إدارات قطاع الري</b><small>منصة الأصول والمنشآت المائية</small></div>
          <button className="drawer-close" aria-label="إغلاق القائمة" onClick={() => setMenuOpen(false)}>×</button>
        </div>
        <nav className="drawer-nav">
          <a href="#top" onClick={() => setMenuOpen(false)}><b>⌂</b><span>الرئيسية</span></a>
          <a href="#sector-dashboard" onClick={() => setMenuOpen(false)}><b>◫</b><span>لوحة القطاع</span><i>{data ? `${number.format(globalReadiness)}٪` : "—"}</i></a>
          <a href="#administrations" onClick={() => setMenuOpen(false)}><b>▥</b><span>الإدارات العامة</span><i>{data ? number.format(totals.administrations) : "—"}</i></a>
          <a href="#admin-workspace" onClick={() => setMenuOpen(false)}><b>⌖</b><span>مساحة الإدارة</span><i>{selectedSummary ? "مفتوحة" : "—"}</i></a>
          <button type="button" onClick={() => { setMenuOpen(false); window.setTimeout(() => document.getElementById("admin-search")?.focus(), 260); }}><b>⌕</b><span>بحث فى الإدارات</span></button>
          <button type="button" onClick={() => { setMenuOpen(false); installApp(); }}><b>⇩</b><span>تثبيت التطبيق</span></button>
        </nav>
        <div className="drawer-foot">
          <span className={online ? "drawer-state" : "drawer-state offline"}><i />{online ? "متصل · البيانات محمّلة" : "أوفلاين · النسخة المحفوظة"}</span>
          <small>{number.format(totals.assets)} منشأة · الإصدار 3.1</small>
        </div>
      </aside>

      {showInstallGuide && (
        <div className="install-overlay" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(event) => { if (event.target === event.currentTarget) setShowInstallGuide(false); }}>
          <div className="install-dialog">
            <button className="dialog-close" aria-label="إغلاق" onClick={() => setShowInstallGuide(false)}>×</button>
            <span className="install-mark">⇩</span>
            <span className="overline">تطبيق PWA</span>
            <h2 id="install-title">تثبيت «إدارات قطاع الري» على الموبايل</h2>
            <p>لو لم يظهر زر التثبيت التلقائي، استخدم خطوات المتصفح التالية:</p>
            <div className="install-steps">
              <span><b>١</b><i>افتح قائمة المتصفح ⋮ أو زر المشاركة.</i></span>
              <span><b>٢</b><i>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</i></span>
              <span><b>٣</b><i>وافق على الإضافة؛ سيظهر التطبيق بأيقونته ويعمل بعد ذلك دون إنترنت.</i></span>
            </div>
            <small>يجب فتح الرابط في Chrome أو Edge أو Safari، وليس داخل متصفح مصغر داخل تطبيق آخر.</small>
            <button className="dialog-done" onClick={() => setShowInstallGuide(false)}>فهمت</button>
          </div>
        </div>
      )}

      {diag && (
        <div className="diag-badge">
          <b>لوحة التشخيص</b>
          <span>العرض {diag.w}×{diag.h} · نافذة مرئية {diag.vv}</span>
          <span>≤640 {diag.m640 ? "✓" : "✗"} · ≤1000 {diag.m1000 ? "✓" : "✗"} · تكبير {diag.scale}</span>
          <span>y={diag.y} · أقصى {diag.maxY}</span>
          <span>قفزات للأعلى: {diag.jumps}{diag.lastJump ? ` · آخرها ${diag.lastJump}` : ""}</span>
        </div>
      )}

      <footer><b>إدارات قطاع الري</b><span>مبني على سجل البيانات المرفق دون إضافة بيانات افتراضية.</span><small>الإصدار 3.1</small></footer>
    </main>
  );
}
