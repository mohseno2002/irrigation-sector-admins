(function (root) {
  "use strict";

  const number = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 3 });

  const common = {
    eng: { key: "eng", label: "الهندسة التابعة", type: "text", maxLength: 240 },
    canal: { key: "canal", label: "الترعة أو المجرى", type: "text", maxLength: 240 },
    notes: { key: "notes", label: "ملاحظات", type: "textarea", maxLength: 1200, full: true },
    documentUrl: { key: "documentUrl", label: "رابط المستند أو الصور على Google Drive", type: "url", maxLength: 700, full: true },
  };

  const MODULES = {
    property: {
      title: "الأملاك",
      singular: "سجل ملكية",
      icon: "◇",
      description: "الأراضي والمباني والمنافع العامة والموقف القانوني والتعديات المرتبطة بها.",
      keyField: "propertyNumber",
      columns: ["propertyNumber", "propertyType", "locationDescription", "areaSqm", "legalStatus", "encroachmentStatus"],
      fields: [
        { key: "propertyNumber", label: "رقم سجل الملكية *", type: "text", required: true, maxLength: 120 },
        { key: "propertyType", label: "نوع الأصل *", type: "select", required: true, options: ["أرض", "مبنى إداري", "استراحة", "مخزن", "ورشة", "منفعة عامة", "حرم ترعة", "أخرى"] },
        common.eng,
        common.canal,
        { key: "locationDescription", label: "وصف الموقع *", type: "textarea", required: true, maxLength: 700, full: true },
        { key: "areaSqm", label: "المساحة (م²)", type: "number", min: 0, max: 1000000000, step: "any" },
        { key: "areaFeddan", label: "المساحة (فدان)", type: "number", min: 0, max: 10000000, step: "any" },
        { key: "deedNumber", label: "رقم سند الملكية أو التخصيص", type: "text", maxLength: 160 },
        { key: "currentUse", label: "الاستخدام الحالي", type: "text", maxLength: 240 },
        { key: "occupant", label: "الشاغل أو المنتفع", type: "text", maxLength: 240 },
        { key: "legalStatus", label: "الموقف القانوني", type: "select", options: ["ملكية مثبتة", "تخصيص", "انتفاع", "جارٍ التسجيل", "نزاع", "غير محدد"] },
        { key: "encroachmentStatus", label: "موقف التعدي", type: "select", options: ["لا يوجد", "تعدٍ قائم", "تم تحرير محضر", "صدر قرار إزالة", "تمت الإزالة", "قيد المتابعة"] },
        { key: "estimatedValue", label: "القيمة التقديرية (جنيه)", type: "number", min: 0, max: 1000000000000, step: "any" },
        { key: "latitude", label: "دائرة العرض", type: "number", min: -90, max: 90, step: "any" },
        { key: "longitude", label: "خط الطول", type: "number", min: -180, max: 180, step: "any" },
        common.documentUrl,
        common.notes,
      ],
    },
    canal_profile: {
      title: "أورنيك الترع",
      singular: "أورنيك ترعة",
      icon: "≈",
      description: "البيانات الهندسية والتشغيلية الكاملة لكل ترعة داخل الإدارة.",
      keyField: "canalName",
      columns: ["canalName", "eng", "canalClass", "lengthKm", "designDischarge", "operationalStatus"],
      fields: [
        { key: "canalName", label: "اسم الترعة *", type: "text", required: true, maxLength: 240, full: true },
        { key: "canalCode", label: "كود الترعة", type: "text", maxLength: 80 },
        common.eng,
        { key: "canalClass", label: "تصنيف الترعة", type: "select", options: ["رياح", "ترعة رئيسية", "ترعة فرعية", "ترعة توزيع", "مسقى عامة", "مجرى آخر"] },
        { key: "sourceCanal", label: "المصدر أو المجرى الآخذ منه", type: "text", maxLength: 240 },
        { key: "startKm", label: "بداية الترعة (كم)", type: "number", min: 0, max: 100000, step: "any" },
        { key: "endKm", label: "نهاية الترعة (كم)", type: "number", min: 0, max: 100000, step: "any" },
        { key: "lengthKm", label: "الطول الكلي (كم)", type: "number", min: 0, max: 100000, step: "any" },
        { key: "designDischarge", label: "التصرف التصميمي (م³/ث)", type: "number", min: 0, max: 100000, step: "any" },
        { key: "currentDischarge", label: "التصرف الحالي (م³/ث)", type: "number", min: 0, max: 100000, step: "any" },
        { key: "bedWidthDesign", label: "عرض القاع التصميمي (م)", type: "number", min: 0, max: 10000, step: "any" },
        { key: "bedWidthCurrent", label: "عرض القاع الحالي (م)", type: "number", min: 0, max: 10000, step: "any" },
        { key: "bedLevelStart", label: "منسوب القاع عند البداية (م)", type: "number", min: -100, max: 1000, step: "any" },
        { key: "bedLevelEnd", label: "منسوب القاع عند النهاية (م)", type: "number", min: -100, max: 1000, step: "any" },
        { key: "waterLevelUpstream", label: "منسوب المياه أمام الفم (م)", type: "number", min: -100, max: 1000, step: "any" },
        { key: "waterLevelDownstream", label: "منسوب المياه عند النهاية (م)", type: "number", min: -100, max: 1000, step: "any" },
        { key: "bankLevelRight", label: "منسوب الجسر الأيمن (م)", type: "number", min: -100, max: 1000, step: "any" },
        { key: "bankLevelLeft", label: "منسوب الجسر الأيسر (م)", type: "number", min: -100, max: 1000, step: "any" },
        { key: "commandAreaFeddan", label: "الزمام المخدوم (فدان)", type: "number", min: 0, max: 10000000, step: "any" },
        { key: "servedVillages", label: "القرى والمناطق المخدومة", type: "textarea", maxLength: 800, full: true },
        { key: "liningStatus", label: "موقف التأهيل أو التبطين", type: "select", options: ["غير مبطنة", "مبطنة جزئيًا", "مبطنة بالكامل", "جارٍ التنفيذ", "بحاجة إلى تأهيل"] },
        { key: "linedLengthKm", label: "الطول المبطن (كم)", type: "number", min: 0, max: 100000, step: "any" },
        { key: "operationalStatus", label: "الحالة التشغيلية", type: "select", options: ["تعمل بكفاءة", "تعمل مع ملاحظات", "تحتاج صيانة", "متوقفة مؤقتًا", "خارج الخدمة"] },
        { key: "lastDredgingDate", label: "تاريخ آخر تطهير", type: "date" },
        { key: "maintenancePriority", label: "أولوية الصيانة", type: "select", options: ["عاجلة", "مرتفعة", "متوسطة", "منخفضة"] },
        { key: "latitude", label: "دائرة العرض", type: "number", min: -90, max: 90, step: "any" },
        { key: "longitude", label: "خط الطول", type: "number", min: -180, max: 180, step: "any" },
        common.notes,
      ],
    },
    license: {
      title: "التراخيص",
      singular: "ترخيص",
      icon: "▧",
      description: "تراخيص المآخذ والعبور والانتفاع والأعمال الواقعة على المجاري المائية.",
      keyField: "licenseNumber",
      columns: ["licenseNumber", "licenseType", "licenseeName", "canal", "issueDate", "status"],
      fields: [
        { key: "licenseNumber", label: "رقم الترخيص *", type: "text", required: true, maxLength: 120 },
        { key: "licenseType", label: "نوع الترخيص *", type: "select", required: true, options: ["مأخذ مياه", "صرف", "عبور", "كوبري خاص", "تغطية", "انتفاع", "إشغال", "عمل داخل حرم الترعة", "أخرى"] },
        { key: "licenseeName", label: "اسم المرخص له *", type: "text", required: true, maxLength: 240, full: true },
        common.eng,
        common.canal,
        { key: "km", label: "الكيلومتر", type: "number", min: 0, max: 100000, step: "any" },
        { key: "bank", label: "الجسر", type: "select", options: ["الأيمن", "الأيسر", "كلا الجسرين", "داخل المجرى"] },
        { key: "purpose", label: "الغرض من الترخيص", type: "textarea", maxLength: 700, full: true },
        { key: "issueDate", label: "تاريخ الإصدار", type: "date" },
        { key: "expiryDate", label: "تاريخ الانتهاء", type: "date" },
        { key: "fee", label: "القيمة أو الرسوم (جنيه)", type: "number", min: 0, max: 100000000000, step: "any" },
        { key: "status", label: "حالة الترخيص", type: "select", options: ["ساري", "منتهي", "تحت التجديد", "موقوف", "ملغي", "قيد المراجعة"] },
        common.documentUrl,
        common.notes,
      ],
    },
    violation: {
      title: "محاضر المخالفات",
      singular: "محضر مخالفة",
      icon: "⚠",
      description: "تسجيل المخالفات الميدانية والإجراءات القانونية وموقف المتابعة.",
      keyField: "reportNumber",
      columns: ["reportNumber", "reportDate", "offenderName", "violationType", "canal", "legalStatus"],
      fields: [
        { key: "reportNumber", label: "رقم المحضر *", type: "text", required: true, maxLength: 120 },
        { key: "reportDate", label: "تاريخ المحضر *", type: "date", required: true },
        { key: "offenderName", label: "اسم المخالف", type: "text", maxLength: 240, full: true },
        common.eng,
        common.canal,
        { key: "km", label: "الكيلومتر", type: "number", min: 0, max: 100000, step: "any" },
        { key: "bank", label: "الجسر أو الموقع", type: "select", options: ["الأيمن", "الأيسر", "كلا الجسرين", "داخل المجرى", "حرم الترعة"] },
        { key: "violationType", label: "نوع المخالفة *", type: "select", required: true, options: ["ردم", "مبنى", "زراعة", "مأخذ مخالف", "صرف مخالف", "تغطية مخالفة", "إشغال", "تلوث", "قطع جسر", "أخرى"] },
        { key: "description", label: "وصف المخالفة", type: "textarea", maxLength: 1200, full: true },
        { key: "area", label: "المساحة أو الأبعاد", type: "text", maxLength: 160 },
        { key: "inspector", label: "محرر المحضر", type: "text", maxLength: 200 },
        { key: "legalStatus", label: "الموقف القانوني", type: "select", options: ["تم التحرير", "أُحيل للشؤون القانونية", "أُحيل للنيابة", "صدر قرار إزالة", "تم التصالح", "تمت الإزالة", "محفوظ"] },
        { key: "estimatedFine", label: "الغرامة أو مقابل الانتفاع", type: "number", min: 0, max: 100000000000, step: "any" },
        { key: "removalDecisionNo", label: "رقم قرار الإزالة المرتبط", type: "text", maxLength: 120 },
        common.documentUrl,
        common.notes,
      ],
    },
    removal_decision: {
      title: "قرارات الإزالة",
      singular: "قرار إزالة",
      icon: "✕",
      description: "قرارات الإزالة وخطط التنفيذ والتنسيق الأمني وموقف الإغلاق.",
      keyField: "decisionNumber",
      columns: ["decisionNumber", "decisionDate", "violationReportNo", "offenderName", "canal", "executionStatus"],
      fields: [
        { key: "decisionNumber", label: "رقم قرار الإزالة *", type: "text", required: true, maxLength: 120 },
        { key: "decisionDate", label: "تاريخ القرار *", type: "date", required: true },
        { key: "violationReportNo", label: "رقم محضر المخالفة", type: "text", maxLength: 120 },
        { key: "offenderName", label: "اسم المخالف", type: "text", maxLength: 240, full: true },
        common.eng,
        common.canal,
        { key: "km", label: "الكيلومتر", type: "number", min: 0, max: 100000, step: "any" },
        { key: "issuingAuthority", label: "جهة إصدار القرار", type: "text", maxLength: 240 },
        { key: "executionStatus", label: "موقف التنفيذ", type: "select", options: ["لم يُدرج", "مدرج بالخطة", "تم التنسيق", "جارٍ التنفيذ", "نُفذ كليًا", "نُفذ جزئيًا", "متعذر التنفيذ", "موقوف قضائيًا"] },
        { key: "executionDate", label: "تاريخ التنفيذ", type: "date" },
        { key: "executionCost", label: "تكلفة التنفيذ (جنيه)", type: "number", min: 0, max: 100000000000, step: "any" },
        { key: "policeCoordination", label: "موقف التنسيق الأمني", type: "select", options: ["غير مطلوب", "لم يتم", "تم تحديد موعد", "تم التأمين", "تأجل"] },
        { key: "remainingWork", label: "الأعمال المتبقية", type: "textarea", maxLength: 900, full: true },
        common.documentUrl,
        common.notes,
      ],
    },
    human_resource: {
      title: "الموارد البشرية",
      singular: "موظف",
      icon: "♙",
      description: "قوة العمل والتخصصات والدرجات والتدريب والتوزيع على الهندسات.",
      keyField: "employeeName",
      columns: ["employeeCode", "employeeName", "jobTitle", "grade", "eng", "status"],
      fields: [
        { key: "employeeCode", label: "الكود الوظيفي *", type: "text", required: true, maxLength: 100 },
        { key: "employeeName", label: "اسم الموظف *", type: "text", required: true, maxLength: 240, full: true },
        { key: "jobTitle", label: "المسمى الوظيفي", type: "text", maxLength: 200 },
        { key: "grade", label: "الدرجة الوظيفية", type: "text", maxLength: 120 },
        { key: "specialization", label: "التخصص", type: "text", maxLength: 160 },
        common.eng,
        { key: "workplace", label: "مقر العمل", type: "text", maxLength: 240 },
        { key: "employmentType", label: "نوع التعيين", type: "select", options: ["دائم", "مؤقت", "منتدب", "متعاقد", "عامل موسمي", "أخرى"] },
        { key: "phone", label: "رقم التواصل الوظيفي", type: "tel", maxLength: 30 },
        { key: "hireDate", label: "تاريخ التعيين", type: "date" },
        { key: "status", label: "الحالة", type: "select", options: ["على رأس العمل", "إجازة", "منتدب خارج الإدارة", "معار", "تحت التدريب", "بلغ سن التقاعد", "منتهية خدمته"] },
        { key: "training", label: "التدريب والمهارات", type: "textarea", maxLength: 900, full: true },
        common.notes,
      ],
    },
    lined_canal: {
      title: "الترع المبطنة",
      singular: "مشروع تبطين",
      icon: "▰",
      description: "الموقف التنفيذي والمالي والتعاقدي لمشروعات التأهيل والتبطين.",
      keyField: "projectName",
      columns: ["projectName", "canalName", "lengthKm", "contractor", "progressPercent", "status"],
      fields: [
        { key: "projectName", label: "اسم المشروع أو العملية *", type: "text", required: true, maxLength: 300, full: true },
        { key: "canalName", label: "اسم الترعة *", type: "text", required: true, maxLength: 240 },
        common.eng,
        { key: "contractNumber", label: "رقم العقد أو العملية", type: "text", maxLength: 140 },
        { key: "startKm", label: "من الكيلومتر", type: "number", min: 0, max: 100000, step: "any" },
        { key: "endKm", label: "إلى الكيلومتر", type: "number", min: 0, max: 100000, step: "any" },
        { key: "lengthKm", label: "الطول (كم)", type: "number", min: 0, max: 100000, step: "any" },
        { key: "liningType", label: "نوع التبطين", type: "select", options: ["دبش ومونة", "خرسانة مسلحة", "بلاطات خرسانية", "تكسية حجرية", "قطاعات سابقة الصب", "نوع آخر"] },
        { key: "contractor", label: "الشركة المنفذة", type: "text", maxLength: 240 },
        { key: "consultant", label: "جهة الإشراف أو الاستشاري", type: "text", maxLength: 240 },
        { key: "fundingSource", label: "جهة التمويل", type: "text", maxLength: 180 },
        { key: "contractValue", label: "القيمة التعاقدية (جنيه)", type: "number", min: 0, max: 1000000000000, step: "any" },
        { key: "startDate", label: "تاريخ البدء", type: "date" },
        { key: "plannedFinish", label: "الانتهاء المخطط", type: "date" },
        { key: "actualFinish", label: "الانتهاء الفعلي", type: "date" },
        { key: "progressPercent", label: "نسبة التنفيذ ٪", type: "number", min: 0, max: 100, step: "any" },
        { key: "status", label: "الموقف التنفيذي", type: "select", options: ["لم يبدأ", "جارٍ التنفيذ", "متوقف", "منتهي", "استلام ابتدائي", "استلام نهائي", "فترة ضمان"] },
        { key: "provisionalAcceptanceDate", label: "تاريخ الاستلام الابتدائي", type: "date" },
        { key: "warrantyEndDate", label: "نهاية فترة الضمان", type: "date" },
        { key: "defects", label: "الملاحظات والعيوب", type: "textarea", maxLength: 1000, full: true },
        { key: "latitude", label: "دائرة العرض", type: "number", min: -90, max: 90, step: "any" },
        { key: "longitude", label: "خط الطول", type: "number", min: -180, max: 180, step: "any" },
        common.documentUrl,
        common.notes,
      ],
    },
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function csvCell(value) {
    const text = value == null ? "" : String(value);
    return /[,"\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
  }

  function fieldLabel(definition, key) {
    return definition.fields.find((field) => field.key === key)?.label.replace(" *", "") || key;
  }

  function displayValue(field, value) {
    if (value === null || typeof value === "undefined" || value === "") return "—";
    if (field?.type === "number" && Number.isFinite(Number(value))) return number.format(Number(value));
    return String(value);
  }

  function sanitizeRecord(moduleType, raw) {
    const definition = MODULES[moduleType];
    if (!definition) throw new Error("نوع سجل غير مدعوم");
    const clean = {
      recordId: String(raw.recordId || ""),
      entityType: moduleType,
      adm: String(raw.adm || "").trim().slice(0, 240),
      version: Number(raw.version) || 0,
    };
    definition.fields.forEach((field) => {
      const value = raw[field.key];
      if (field.type === "number") {
        clean[field.key] = value === "" || value === null || typeof value === "undefined" ? null : Number(value);
      } else {
        clean[field.key] = String(value == null ? "" : value).trim().slice(0, field.maxLength || 700);
      }
    });
    if (!clean.adm) throw new Error("يجب تحديد الإدارة");
    definition.fields.filter((field) => field.required).forEach((field) => {
      if (clean[field.key] === "" || clean[field.key] === null || Number.isNaN(clean[field.key])) {
        throw new Error("البيان المطلوب: " + field.label.replace(" *", ""));
      }
    });
    return clean;
  }

  function fieldControl(field, value) {
    const attributes = [
      'name="' + escapeHtml(field.key) + '"',
      field.required ? "required" : "",
      field.maxLength ? 'maxlength="' + field.maxLength + '"' : "",
      typeof field.min !== "undefined" ? 'min="' + field.min + '"' : "",
      typeof field.max !== "undefined" ? 'max="' + field.max + '"' : "",
      field.step ? 'step="' + field.step + '"' : "",
    ].filter(Boolean).join(" ");
    const safeValue = escapeHtml(value == null ? "" : value);
    let control;
    if (field.type === "select") {
      control = '<select ' + attributes + '><option value="">اختر…</option>' + field.options.map((option) =>
        '<option value="' + escapeHtml(option) + '"' + (String(value || "") === option ? " selected" : "") + '>' + escapeHtml(option) + '</option>'
      ).join("") + '</select>';
    } else if (field.type === "textarea") {
      control = '<textarea ' + attributes + '>' + safeValue + '</textarea>';
    } else {
      const inputMode = field.type === "number" ? ' inputmode="decimal"' : "";
      control = '<input type="' + escapeHtml(field.type || "text") + '" value="' + safeValue + '" ' + attributes + inputMode + '>';
    }
    return '<label class="field' + (field.full ? " full" : "") + '"><span>' + escapeHtml(field.label) + '</span>' + control + '</label>';
  }

  function createPlatform(options) {
    const sync = options.sync;
    const getAdministration = options.getAdministration;
    const getBaseRecords = typeof options.getBaseRecords === "function" ? options.getBaseRecords : () => [];
    const roots = [...root.document.querySelectorAll("[data-record-module]")];
    const dialog = root.document.getElementById("recordDialog");
    const form = root.document.getElementById("recordForm");
    const fields = root.document.getElementById("recordFields");
    const title = root.document.getElementById("recordDialogTitle");
    const note = root.document.getElementById("recordDialogNote");
    const deleteButton = root.document.getElementById("deleteRecord");
    let activeType = "";
    let activeId = "";
    const searches = {};

    function allRecordsFor(type) {
      return sync.applyOverlay(getBaseRecords(type) || [], type);
    }

    function recordsFor(type) {
      const adm = getAdministration();
      return allRecordsFor(type)
        .filter((record) => record.adm === adm)
        .sort((a, b) => String(b.updatedAt || b.recordId).localeCompare(String(a.updatedAt || a.recordId)));
    }

    function renderRoot(element) {
      const type = element.dataset.recordModule;
      const definition = MODULES[type];
      if (!definition) return;
      const adm = getAdministration();
      const allRecords = adm ? recordsFor(type) : [];
      const term = String(searches[type] || "").trim().toLowerCase();
      const records = term ? allRecords.filter((record) => JSON.stringify(record).toLowerCase().includes(term)) : allRecords;
      const headings = definition.columns.map((key) => '<th>' + escapeHtml(fieldLabel(definition, key)) + '</th>').join("");
      const rows = records.slice(0, 500).map((record) => {
        const cells = definition.columns.map((key) => {
          const field = definition.fields.find((item) => item.key === key);
          const value = displayValue(field, record[key]);
          return '<td>' + (field?.type === "url" && record[key]
            ? '<a class="record-link" href="' + escapeHtml(record[key]) + '" target="_blank" rel="noopener">فتح المستند</a>'
            : escapeHtml(value)) + '</td>';
        }).join("");
        const sourceBadge = record.locallyPending
          ? '<span class="tag">بانتظار المزامنة</span>'
          : record.version
            ? '<span class="tag">سجل مركزي</span>'
            : '<span class="tag">سجل أساسي رقمي</span>';
        return '<tr>' + cells + '<td><div class="row-actions"><button class="row-action" type="button" data-module-edit="' + escapeHtml(record.recordId) + '" data-module-type="' + type + '">تعديل</button>' + sourceBadge + '</div></td></tr>';
      }).join("");
      element.innerHTML =
        '<div class="records-toolbar"><div class="records-heading"><span class="module-icon">' + definition.icon + '</span><div><h3>' + escapeHtml(definition.title) + '</h3><p>' + escapeHtml(adm ? definition.description : "اختر إدارة أولًا") + '</p></div><strong>' + number.format(allRecords.length) + '</strong></div>' +
        '<div class="records-actions"><label class="search compact"><b>⌕</b><input type="search" data-module-search="' + type + '" value="' + escapeHtml(searches[type] || "") + '" placeholder="بحث داخل السجلات…"></label><button class="secondary-button" type="button" data-module-export="' + type + '"' + (!adm ? " disabled" : "") + '>تصدير CSV</button><button class="primary-button" type="button" data-module-add="' + type + '"' + (!adm ? " disabled" : "") + '>إضافة ' + escapeHtml(definition.singular) + '</button></div></div>' +
        (records.length
          ? '<div class="asset-table records-table"><table><thead><tr>' + headings + '<th>الإجراء</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="table-note">يعرض ' + number.format(records.length) + ' من ' + number.format(allRecords.length) + ' سجل داخل ' + escapeHtml(adm) + '.</div>'
          : '<div class="records-empty"><b>' + (term ? "لا توجد نتائج مطابقة" : "لا توجد سجلات بعد") + '</b><span>' + (adm ? 'ابدأ بإضافة ' + escapeHtml(definition.singular) + ' لهذه الإدارة.' : 'اختر إحدى الإدارات من الدليل الإداري.') + '</span></div>');
    }

    function refresh(type) {
      roots.filter((element) => !type || element.dataset.recordModule === type).forEach(renderRoot);
    }

    function openEditor(type, recordId) {
      const definition = MODULES[type];
      if (!definition) return;
      const existing = recordId ? allRecordsFor(type).find((record) => record.recordId === recordId) : null;
      const adm = getAdministration();
      if (!adm) return;
      activeType = type;
      activeId = existing?.recordId || sync.makeRecordId(type);
      title.textContent = existing ? "تعديل " + definition.singular : "إضافة " + definition.singular;
      fields.innerHTML = '<label class="field full"><span>الإدارة</span><input value="' + escapeHtml(adm) + '" readonly></label>' + definition.fields.map((field) => fieldControl(field, existing?.[field.key])).join("");
      note.className = "dialog-note";
      note.textContent = existing?.locallyPending ? "هذا السجل لديه تعديل محلي بانتظار المزامنة." : "سيُحفظ السجل محليًا فورًا ثم يتزامن مع جميع الأجهزة.";
      deleteButton.hidden = !existing;
      dialog.showModal();
    }

    function formRecord() {
      const existing = allRecordsFor(activeType).find((record) => record.recordId === activeId);
      const data = Object.fromEntries(new FormData(form).entries());
      return sanitizeRecord(activeType, Object.assign({}, existing || {}, data, {
        recordId: activeId,
        entityType: activeType,
        adm: getAdministration(),
        version: existing?.version || 0,
      }));
    }

    function exportCsv(type) {
      const definition = MODULES[type];
      const adm = getAdministration();
      const records = recordsFor(type);
      const header = ["الإدارة", ...definition.fields.map((field) => field.label.replace(" *", "")), "المعرف", "الإصدار"];
      const rows = records.map((record) => [adm, ...definition.fields.map((field) => record[field.key]), record.recordId, record.version || 0]);
      const blob = new Blob(["\ufeff" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = root.document.createElement("a");
      link.href = url;
      link.download = (adm + "-" + definition.title).replace(/[\\/:*?"<>|]/g, "-") + ".csv";
      root.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    root.document.addEventListener("click", (event) => {
      const add = event.target.closest("[data-module-add]");
      if (add) openEditor(add.dataset.moduleAdd, "");
      const edit = event.target.closest("[data-module-edit]");
      if (edit) openEditor(edit.dataset.moduleType, edit.dataset.moduleEdit);
      const exportButton = event.target.closest("[data-module-export]");
      if (exportButton) exportCsv(exportButton.dataset.moduleExport);
    });
    root.document.addEventListener("input", (event) => {
      if (!event.target.matches("[data-module-search]")) return;
      searches[event.target.dataset.moduleSearch] = event.target.value;
      renderRoot(event.target.closest("[data-record-module]"));
    });
    root.document.getElementById("recordClose").addEventListener("click", () => dialog.close());
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        if (!form.reportValidity()) return;
        const record = formRecord();
        sync.queueUpsert(record, activeType);
        dialog.close();
        refresh(activeType);
        sync.sync(false).catch(() => undefined);
      } catch (error) {
        note.className = "dialog-note error";
        note.textContent = error.message;
      }
    });
    deleteButton.addEventListener("click", () => {
      const definition = MODULES[activeType];
      const record = allRecordsFor(activeType).find((item) => item.recordId === activeId);
      if (!record || !root.confirm("سيُحذف سجل «" + (record[definition.keyField] || definition.singular) + "» من جميع الأجهزة. هل تريد المتابعة؟")) return;
      sync.queueDelete(record, activeType);
      dialog.close();
      refresh(activeType);
      sync.sync(false).catch(() => undefined);
    });

    refresh();
    return { refresh, openEditor, recordsFor, allRecordsFor };
  }

  root.IrrigationModules = { MODULES, sanitizeRecord, createPlatform };
})(typeof window !== "undefined" ? window : globalThis);
