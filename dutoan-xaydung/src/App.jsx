import { useState, useRef, useCallback } from "react";

const FORMULA_HELP = `Cấu trúc dự toán theo TT11/2021/TT-BXD:
T = VL + NC + MTC (Chi phí trực tiếp)
C = T × %ChiPhíChung
LT = T × %NhàTạm  
TT = T × %KhácKhôngXĐ
GT = C + LT + TT
Z = T + GT
TL = Z × %TNCTTТ
G = Z + TL
GTGT = G × %VAT
GXDST = G + GTGT`;

const DEFAULT_CONFIG = {
  tenDuAn: "TÊN DỰ ÁN",
  tenCongTrinh: "TÊN CÔNG TRÌNH",
  tenHangMuc: "TÊN HẠNG MỤC",
  diaDiem: "TP. Hồ Chí Minh",
  loaiCongTrinh: "3",
  capCongTrinh: "3",
  vatRate: 8,
  chiPhiChung: 6.187,
  nhaTam: 1.1,
  khacKhongXD: 2.0,
  tnctt: 6.0,
  hsVL: 1,
  hsNC: 1,
  hsMTC: 1,
  vung: "1",
  nam: "2024",
};

const LOAI_CT = {
  "1": "Công trình dân dụng",
  "2": "Công trình công nghiệp",
  "3": "Công trình giao thông",
  "4": "Công trình nông nghiệp và PTNT",
  "5": "Công trình hạ tầng kỹ thuật",
};

// ─── Utilities ──────────────────────────────────────────────────────────────
const fmt = (n, d = 0) =>
  n == null || isNaN(n)
    ? "0"
    : Number(n).toLocaleString("vi-VN", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });

const uid = () => Math.random().toString(36).slice(2, 9);

function calcTotals(items, cfg) {
  let sumVL = 0, sumNC = 0, sumMTC = 0;
  items.forEach((it) => {
    if (it.type === "item") {
      sumVL += (it.vl || 0) * (it.kl || 0) * cfg.hsVL;
      sumNC += (it.nc || 0) * (it.kl || 0) * cfg.hsNC;
      sumMTC += (it.mtc || 0) * (it.kl || 0) * cfg.hsMTC;
    }
  });
  const T = sumVL + sumNC + sumMTC;
  const C = T * (cfg.chiPhiChung / 100);
  const LT = T * (cfg.nhaTam / 100);
  const TT_kphi = T * (cfg.khacKhongXD / 100);
  const GT = C + LT + TT_kphi;
  const Z = T + GT;
  const TL = Z * (cfg.tnctt / 100);
  const G = Z + TL;
  const GTGT = G * (cfg.vatRate / 100);
  const GXDST = G + GTGT;
  return { sumVL, sumNC, sumMTC, T, C, LT, TT_kphi, GT, Z, TL, G, GTGT, GXDST };
}

// ─── Excel Export (pure JS, no library needed for basic xlsx) ────────────────
function exportToXLSX(items, cfg) {
  const tot = calcTotals(items, cfg);

  // Build CSV-based export using SheetJS (loaded via CDN in HTML)
  // We'll use a data URI approach with proper Excel XML format
  const rows = [];

  // Header
  rows.push([
    "STT", "ĐỊNH MỨC", "MÃ HIỆU ĐƠN GIÁ", "NỘI DUNG CÔNG VIỆC",
    "ĐƠN VỊ", "KHỐI LƯỢNG",
    "ĐG VẬT LIỆU", "ĐG NHÂN CÔNG", "ĐG MÁY TC",
    "TT VẬT LIỆU", "TT NHÂN CÔNG", "TT MÁY TC",
  ]);

  let stt = 0;
  items.forEach((it) => {
    if (it.type === "section") {
      rows.push(["", "", "", it.name, "", "", "", "", "", "", "", ""]);
    } else {
      stt++;
      const kl = it.kl || 0;
      rows.push([
        stt, it.dmCode || "", it.dgCode || "", it.name || "",
        it.dvt || "", kl,
        it.vl || 0, it.nc || 0, it.mtc || 0,
        (it.vl || 0) * kl * cfg.hsVL,
        (it.nc || 0) * kl * cfg.hsNC,
        (it.mtc || 0) * kl * cfg.hsMTC,
      ]);
    }
  });

  // THKP rows
  rows.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
  rows.push(["", "", "", "BẢNG TỔNG HỢP KINH PHÍ", "", "", "", "", "", "", "", ""]);
  rows.push(["A1", "", "", "Chi phí Vật liệu", "", "", "", "", "", "", "", tot.sumVL]);
  rows.push(["B1", "", "", "Chi phí Nhân công", "", "", "", "", "", "", "", tot.sumNC]);
  rows.push(["C1", "", "", "Chi phí Máy thi công", "", "", "", "", "", "", "", tot.sumMTC]);
  rows.push(["T", "", "", "CỘNG CHI PHÍ TRỰC TIẾP", "", "", "", "", "", "", "", tot.T]);
  rows.push(["C", "", "", `Chi phí chung (${cfg.chiPhiChung}%)`, "", "", "", "", "", "", "", tot.C]);
  rows.push(["LT", "", "", `Chi phí nhà tạm (${cfg.nhaTam}%)`, "", "", "", "", "", "", "", tot.LT]);
  rows.push(["TT", "", "", `Chi phí khác không xác định (${cfg.khacKhongXD}%)`, "", "", "", "", "", "", "", tot.TT_kphi]);
  rows.push(["GT", "", "", "CỘNG CHI PHÍ GIÁN TIẾP", "", "", "", "", "", "", "", tot.GT]);
  rows.push(["Z", "", "", "GIÁ THÀNH DỰ TOÁN XÂY DỰNG", "", "", "", "", "", "", "", tot.Z]);
  rows.push(["TL", "", "", `Thu nhập chịu thuế tính trước (${cfg.tnctt}%)`, "", "", "", "", "", "", "", tot.TL]);
  rows.push(["G", "", "", "CHI PHÍ XÂY DỰNG TRƯỚC THUẾ", "", "", "", "", "", "", "", tot.G]);
  rows.push(["GTGT", "", "", `Thuế GTGT (${cfg.vatRate}%)`, "", "", "", "", "", "", "", tot.GTGT]);
  rows.push(["GXDST", "", "", "CHI PHÍ XÂY DỰNG SAU THUẾ", "", "", "", "", "", "", "", tot.GXDST]);

  // Convert to TSV then use data URI
  const tsv = rows.map((r) => r.join("\t")).join("\n");
  const blob = new Blob(["\ufeff" + tsv], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fn = `DuToan_${cfg.tenHangMuc.replace(/[^a-zA-Z0-9]/g, "_")}.xls`;
  a.download = fn;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── AI Parser via Anthropic API ─────────────────────────────────────────────
async function parseVatTuWithAI(text, setStatus) {
  setStatus("Đang gọi AI phân tích...");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `Bạn là chuyên gia dự toán xây dựng Việt Nam. Phân tích danh mục công việc sau và trả về JSON array (không markdown, không giải thích):
[{"type":"item","name":"tên công việc","dvt":"đơn vị","kl":số,"vl":đơn_giá_vl,"nc":đơn_giá_nc,"mtc":đơn_giá_mtc,"dmCode":"mã_định_mức","dgCode":"mã_đơn_giá"}]
Nếu là tiêu đề nhóm: {"type":"section","name":"tên nhóm"}
Điền số 0 nếu không có dữ liệu. Định mức theo TT12/2021/TT-BXD.
DỮ LIỆU:
${text.slice(0, 3000)}`,
          },
        ],
      }),
    });
    const data = await res.json();
    const raw = data.content?.[0]?.text || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    setStatus(`✓ AI đọc được ${parsed.filter((x) => x.type === "item").length} công việc`);
    return parsed.map((x) => ({ ...x, id: uid() }));
  } catch (e) {
    setStatus("✗ Lỗi AI: " + e.message);
    return [];
  }
}

// ─── Components ──────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 18px",
        border: "none",
        borderBottom: active ? "2px solid #1565c0" : "2px solid transparent",
        background: "none",
        cursor: "pointer",
        fontWeight: active ? 500 : 400,
        color: active ? "#1565c0" : "var(--color-text-secondary)",
        fontSize: 14,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function SectionRow({ item, onDelete }) {
  return (
    <tr style={{ background: "var(--color-background-secondary)" }}>
      <td colSpan={11} style={{ padding: "6px 8px", fontWeight: 500, fontSize: 13 }}>
        <span style={{ color: "#1565c0" }}>▶ {item.name}</span>
      </td>
      <td style={{ textAlign: "center" }}>
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#c62828", fontSize: 16 }}>×</button>
      </td>
    </tr>
  );
}

function ItemRow({ item, onChange, onDelete }) {
  const kl = item.kl || 0;
  const ttVL = (item.vl || 0) * kl;
  const ttNC = (item.nc || 0) * kl;
  const ttMTC = (item.mtc || 0) * kl;

  const inp = (field, type = "text") => (
    <input
      type={type}
      value={item[field] ?? ""}
      onChange={(e) => onChange(item.id, field, type === "number" ? +e.target.value : e.target.value)}
      style={{
        width: "100%", border: "none", background: "transparent",
        fontSize: 12, padding: "2px 4px", textAlign: type === "number" ? "right" : "left",
        outline: "none", color: "var(--color-text-primary)",
      }}
    />
  );

  return (
    <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <td style={{ textAlign: "center", fontSize: 12, padding: "4px 6px" }}>{item.stt || "-"}</td>
      <td style={{ padding: "2px 4px", fontSize: 12 }}>{inp("dmCode")}</td>
      <td style={{ padding: "2px 4px", fontSize: 12 }}>{inp("dgCode")}</td>
      <td style={{ padding: "2px 4px", fontSize: 12, minWidth: 200 }}>{inp("name")}</td>
      <td style={{ padding: "2px 4px", fontSize: 12 }}>{inp("dvt")}</td>
      <td style={{ padding: "2px 4px" }}>{inp("kl", "number")}</td>
      <td style={{ padding: "2px 4px" }}>{inp("vl", "number")}</td>
      <td style={{ padding: "2px 4px" }}>{inp("nc", "number")}</td>
      <td style={{ padding: "2px 4px" }}>{inp("mtc", "number")}</td>
      <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 12 }}>{fmt(ttVL)}</td>
      <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 12 }}>{fmt(ttNC)}</td>
      <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 12 }}>{fmt(ttMTC)}</td>
      <td style={{ textAlign: "center" }}>
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#c62828", fontSize: 16 }}>×</button>
      </td>
    </tr>
  );
}

function DuToanTab({ items, setItems, cfg }) {
  const [aiText, setAiText] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [showAI, setShowAI] = useState(false);
  const fileRef = useRef();

  const addSection = () =>
    setItems((prev) => [...prev, { id: uid(), type: "section", name: "Nhóm công việc mới" }]);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: uid(), type: "item", name: "Công việc", dvt: "m2", kl: 0, vl: 0, nc: 0, mtc: 0, dmCode: "", dgCode: "" },
    ]);

  const onDelete = (id) => setItems((prev) => prev.filter((x) => x.id !== id));

  const onChange = useCallback((id, field, val) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: val } : x)));
  }, [setItems]);

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAiText(ev.target.result);
    reader.readAsText(file, "utf-8");
  };

  const runAI = async () => {
    if (!aiText.trim()) return;
    const parsed = await parseVatTuWithAI(aiText, setAiStatus);
    if (parsed.length > 0) {
      let stt = items.filter((x) => x.type === "item").length;
      setItems((prev) => [
        ...prev,
        ...parsed.map((x) => ({ ...x, stt: x.type === "item" ? ++stt : undefined })),
      ]);
    }
  };

  // Renumber items
  let sttCount = 0;
  const numberedItems = items.map((it) =>
    it.type === "item" ? { ...it, stt: ++sttCount } : it
  );

  const tot = calcTotals(items, cfg);

  const colStyle = { padding: "6px 8px", textAlign: "right", fontWeight: 500, fontSize: 12, background: "var(--color-background-secondary)" };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={addSection} style={{ padding: "6px 12px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, background: "none", cursor: "pointer" }}>
          + Nhóm công việc
        </button>
        <button onClick={addItem} style={{ padding: "6px 12px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, background: "none", cursor: "pointer" }}>
          + Thêm công việc
        </button>
        <button onClick={() => setShowAI(!showAI)} style={{ padding: "6px 12px", fontSize: 12, border: "0.5px solid #1565c0", borderRadius: 6, background: showAI ? "#e3f2fd" : "none", cursor: "pointer", color: "#1565c0" }}>
          🤖 AI đọc vật tư
        </button>
        <button onClick={() => exportToXLSX(items, cfg)} style={{ padding: "6px 12px", fontSize: 12, border: "0.5px solid #2e7d32", borderRadius: 6, background: "none", cursor: "pointer", color: "#2e7d32", marginLeft: "auto" }}>
          ↓ Xuất Excel (.xls)
        </button>
      </div>

      {/* AI Panel */}
      {showAI && (
        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>Dán danh mục vật tư, CSV hoặc tải file text/CSV:</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input ref={fileRef} type="file" accept=".txt,.csv" onChange={handleFileImport} style={{ display: "none" }} />
            <button onClick={() => fileRef.current.click()} style={{ padding: "5px 10px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: 5, background: "none", cursor: "pointer" }}>
              📁 Tải file
            </button>
            <span style={{ fontSize: 12, color: "#1565c0" }}>{aiStatus}</span>
          </div>
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="VD: SA.32213 - Cắt sàn bê tông - 1m - 46 lần - ĐG NC: 175.026đ ..."
            style={{ width: "100%", height: 100, fontSize: 12, padding: 8, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 6, resize: "vertical", fontFamily: "monospace", background: "var(--color-background-primary)", color: "var(--color-text-primary)", boxSizing: "border-box" }}
          />
          <button onClick={runAI} style={{ marginTop: 8, padding: "6px 16px", fontSize: 12, background: "#1565c0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            Phân tích với AI →
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 55 }} />
            <col style={{ width: 65 }} />
            <col style={{ width: 85 }} />
            <col style={{ width: 85 }} />
            <col style={{ width: 85 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 36 }} />
          </colgroup>
          <thead>
            <tr style={{ background: "#1565c0", color: "#fff" }}>
              {["STT", "Định mức", "Mã ĐG", "Nội dung công việc", "ĐVT", "KL",
                "ĐG VL", "ĐG NC", "ĐG MTC",
                "TT VL", "TT NC", "TT MTC", ""].map((h, i) => (
                <th key={i} style={{ padding: "7px 6px", textAlign: i >= 9 ? "right" : "center", fontWeight: 500, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {numberedItems.map((item) =>
              item.type === "section" ? (
                <SectionRow key={item.id} item={item} onDelete={() => onDelete(item.id)} />
              ) : (
                <ItemRow key={item.id} item={item} onChange={onChange} onDelete={() => onDelete(item.id)} />
              )
            )}
            {items.length === 0 && (
              <tr>
                <td colSpan={13} style={{ textAlign: "center", padding: 32, color: "var(--color-text-secondary)", fontSize: 13 }}>
                  Chưa có công việc. Nhấn "+ Thêm công việc" hoặc dùng AI đọc vật tư.
                </td>
              </tr>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr style={{ background: "#e3f2fd", fontWeight: 500 }}>
                <td colSpan={9} style={{ ...colStyle, textAlign: "left" }}>TỔNG CỘNG (A1 + B1 + C1)</td>
                <td style={colStyle}>{fmt(tot.sumVL)}</td>
                <td style={colStyle}>{fmt(tot.sumNC)}</td>
                <td style={colStyle}>{fmt(tot.sumMTC)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* THKP Summary */}
      {items.length > 0 && (
        <div style={{ marginTop: 20, background: "var(--color-background-secondary)", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
          <div style={{ background: "#1565c0", color: "#fff", padding: "8px 14px", fontSize: 13, fontWeight: 500 }}>
            BẢNG TỔNG HỢP KINH PHÍ
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            {[
              ["T", "CHI PHÍ TRỰC TIẾP (T = VL + NC + MTC)", tot.T, false],
              ["  VL", `Chi phí Vật liệu`, tot.sumVL, false],
              ["  NC", `Chi phí Nhân công`, tot.sumNC, false],
              ["  MTC", `Chi phí Máy thi công`, tot.sumMTC, false],
              ["C", `Chi phí chung (${cfg.chiPhiChung}% × T)`, tot.C, false],
              ["LT", `Chi phí nhà tạm (${cfg.nhaTam}% × T)`, tot.LT, false],
              ["TT", `Chi phí khác không xác định được (${cfg.khacKhongXD}% × T)`, tot.TT_kphi, false],
              ["GT", "CỘNG CHI PHÍ GIÁN TIẾP (C + LT + TT)", tot.GT, false],
              ["Z", "GIÁ THÀNH DỰ TOÁN XÂY DỰNG (T + GT)", tot.Z, false],
              ["TL", `Thu nhập chịu thuế tính trước (${cfg.tnctt}% × Z)`, tot.TL, false],
              ["G", "CHI PHÍ XÂY DỰNG TRƯỚC THUẾ (Z + TL)", tot.G, true],
              ["GTGT", `Thuế GTGT (${cfg.vatRate}% × G)`, tot.GTGT, false],
              ["GXDST", "CHI PHÍ XÂY DỰNG SAU THUẾ (G + GTGT)", tot.GXDST, true],
            ].map(([key, label, val, bold]) => (
              <tr key={key} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", background: bold ? "#e8f5e9" : "transparent" }}>
                <td style={{ padding: "6px 14px", width: 60, color: "#1565c0", fontWeight: 500, fontFamily: "monospace", fontSize: 12 }}>{key}</td>
                <td style={{ padding: "6px 8px", fontWeight: bold ? 500 : 400 }}>{label}</td>
                <td style={{ padding: "6px 14px", textAlign: "right", fontWeight: bold ? 700 : 400, fontSize: bold ? 14 : 13, color: bold ? "#1b5e20" : "var(--color-text-primary)" }}>
                  {fmt(val)} đ
                </td>
              </tr>
            ))}
          </table>
          <div style={{ padding: "8px 14px", fontSize: 12, color: "var(--color-text-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <strong>Tổng cộng bằng chữ:</strong> {numberToWords(Math.round(tot.GXDST))} đồng
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigTab({ cfg, setCfg }) {
  const field = (key, label, type = "number", step) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</label>
      <input
        type={type}
        step={step}
        value={cfg[key]}
        onChange={(e) => setCfg((p) => ({ ...p, [key]: type === "number" ? +e.target.value : e.target.value }))}
        style={{ padding: "6px 10px", fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
      />
    </div>
  );

  return (
    <div>
      <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 500 }}>Thông tin dự án</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {field("tenDuAn", "Tên dự án", "text")}
          {field("tenCongTrinh", "Tên công trình", "text")}
          {field("tenHangMuc", "Tên hạng mục", "text")}
          {field("diaDiem", "Địa điểm", "text")}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Loại công trình</label>
            <select value={cfg.loaiCongTrinh} onChange={(e) => setCfg((p) => ({ ...p, loaiCongTrinh: e.target.value }))}
              style={{ padding: "6px 10px", fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
              {Object.entries(LOAI_CT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Vùng / Khu vực</label>
            <select value={cfg.vung} onChange={(e) => setCfg((p) => ({ ...p, vung: e.target.value }))}
              style={{ padding: "6px 10px", fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
              <option value="1">Vùng I (TP. HCM - Khu vực 1)</option>
              <option value="2">Vùng II (Huyện Cần Giờ)</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 500 }}>Hệ số chi phí (theo TT11/2021/TT-BXD)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {field("chiPhiChung", "Chi phí chung (%)", "number", 0.001)}
          {field("nhaTam", "Chi phí nhà tạm (%)", "number", 0.1)}
          {field("khacKhongXD", "Chi phí khác không XĐ (%)", "number", 0.1)}
          {field("tnctt", "TNCTT (%)", "number", 0.1)}
          {field("vatRate", "Thuế GTGT (%)", "number", 1)}
          {field("hsVL", "Hệ số VL", "number", 0.01)}
          {field("hsNC", "Hệ số NC", "number", 0.01)}
          {field("hsMTC", "Hệ số MTC", "number", 0.01)}
        </div>
      </div>

      <div style={{ background: "#fff8e1", borderRadius: 8, border: "0.5px solid #ffe082", padding: 12 }}>
        <pre style={{ fontSize: 11, margin: 0, color: "#5d4037", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{FORMULA_HELP}</pre>
      </div>
    </div>
  );
}

function NormTab() {
  const [norms, setNorms] = useState([]);
  const [status, setStatus] = useState("");
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("Đang đọc file...");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      setStatus("Đang phân tích định mức với AI...");
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [{
              role: "user",
              content: `Trích xuất bảng định mức xây dựng từ văn bản sau. Trả về JSON array (không markdown):
[{"ma":"mã_định_mức","ten":"tên_công_tác","dvt":"đơn_vị","vl":số,"nc":số,"mtc":số,"ghiChu":""}]
VĂN BẢN: ${text.slice(0, 4000)}`,
            }],
          }),
        });
        const data = await res.json();
        const raw = data.content?.[0]?.text || "[]";
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        setNorms((p) => [...p, ...parsed.map((x) => ({ ...x, id: uid() }))]);
        setStatus(`✓ Đã nhập ${parsed.length} định mức`);
      } catch (err) {
        setStatus("✗ Lỗi: " + err.message);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <input ref={fileRef} type="file" accept=".txt,.csv,.doc,.docx" onChange={handleFile} style={{ display: "none" }} />
        <button onClick={() => fileRef.current.click()} style={{ padding: "7px 14px", fontSize: 12, border: "0.5px solid #1565c0", borderRadius: 6, background: "none", cursor: "pointer", color: "#1565c0" }}>
          📂 Import định mức (TXT/CSV)
        </button>
        <button onClick={() => setNorms([])} style={{ padding: "7px 14px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, background: "none", cursor: "pointer" }}>
          Xóa tất cả
        </button>
        <span style={{ fontSize: 12, color: "#1565c0" }}>{status}</span>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: "auto" }}>
          {norms.length} định mức đã nhập
        </span>
      </div>

      <div style={{ background: "#e3f2fd", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#1565c0" }}>
        💡 Import file định mức từ: QĐ 1491/QĐ-SXD-KT&VLXD TP.HCM 2024, TT12/2021/TT-BXD, hoặc quyết định của từng tỉnh.
        AI sẽ tự động đọc và lưu vào cơ sở dữ liệu.
      </div>

      {norms.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-secondary)", fontSize: 13, border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 8 }}>
          Chưa có định mức. Import file quyết định định mức địa phương.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#1565c0", color: "#fff" }}>
                {["Mã định mức", "Tên công tác", "ĐVT", "VL", "NC", "MTC", "Ghi chú"].map((h) => (
                  <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 500, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {norms.map((n, i) => (
                <tr key={n.id} style={{ background: i % 2 ? "var(--color-background-secondary)" : "transparent", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "5px 8px", fontFamily: "monospace", color: "#1565c0" }}>{n.ma}</td>
                  <td style={{ padding: "5px 8px" }}>{n.ten}</td>
                  <td style={{ padding: "5px 8px" }}>{n.dvt}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(n.vl)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(n.nc)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(n.mtc)}</td>
                  <td style={{ padding: "5px 8px", color: "var(--color-text-secondary)" }}>{n.ghiChu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Number to words (Vietnamese) ────────────────────────────────────────────
function numberToWords(n) {
  if (!n || n === 0) return "không";
  if (n >= 1e12) return fmt(n / 1e9, 0) + " tỷ";
  const b = Math.floor(n / 1e9);
  const m = Math.floor((n % 1e9) / 1e6);
  const k = Math.floor((n % 1e6) / 1e3);
  const r = n % 1e3;
  let s = "";
  if (b) s += b + " tỷ ";
  if (m) s += m + " triệu ";
  if (k) s += k + " nghìn ";
  if (r) s += r + " ";
  return s.trim();
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function DuToanG8Pro() {
  const [tab, setTab] = useState("dutoan");
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  const [items, setItems] = useState([]);

  const tot = calcTotals(items, cfg);

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif", maxWidth: 1100, margin: "0 auto", padding: "0 0 40px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)", color: "#fff", padding: "16px 20px", borderRadius: "0 0 12px 12px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>
              🏗 Phần mềm Dự toán Xây dựng G8
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.8 }}>
              Theo TT11/12/13-2021/TT-BXD • {cfg.tenHangMuc}
            </p>
          </div>
          {items.length > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Tổng sau thuế</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(tot.GXDST)} đ</div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Chi phí trực tiếp", val: tot.T, color: "#1565c0" },
            { label: "Chi phí gián tiếp", val: tot.GT, color: "#6a1b9a" },
            { label: "Trước thuế", val: tot.G, color: "#2e7d32" },
            { label: "Sau thuế (GTGT)", val: tot.GXDST, color: "#c62828" },
          ].map((c) => (
            <div key={c.label} style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: "10px 14px", borderTop: `3px solid ${c.color}` }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{c.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: c.color, marginTop: 2 }}>{fmt(c.val)} đ</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 16, display: "flex", gap: 4 }}>
        <TabButton active={tab === "dutoan"} onClick={() => setTab("dutoan")}>📋 Bảng dự toán</TabButton>
        <TabButton active={tab === "config"} onClick={() => setTab("config")}>⚙️ Cấu hình</TabButton>
        <TabButton active={tab === "norm"} onClick={() => setTab("norm")}>📚 Cơ sở định mức</TabButton>
      </div>

      {/* Tab Content */}
      <div style={{ padding: "0 2px" }}>
        {tab === "dutoan" && <DuToanTab items={items} setItems={setItems} cfg={cfg} />}
        {tab === "config" && <ConfigTab cfg={cfg} setCfg={setCfg} />}
        {tab === "norm" && <NormTab />}
      </div>
    </div>
  );
}
