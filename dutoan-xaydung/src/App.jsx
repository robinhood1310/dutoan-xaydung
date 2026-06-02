import { useState, useRef, useCallback } from "react";

// ============ CONSTANTS theo TT11/12/13-2021/TT-BXD ============
const DEFAULT_COEFFICIENTS = {
  hsvl: 1,       // Hệ số vật liệu
  hsnc: 1,       // Hệ số nhân công
  hsmtc: 1,      // Hệ số máy thi công
  hscpc: 6.2,    // Chi phí chung (%)
  hstncttt: 6,   // Thu nhập chịu thuế tính trước (%)
  hsvat: 8,      // Thuế GTGT (%)
  hsnt: 1.1,     // Chi phí nhà tạm (%)
  hsttpk: 0,     // Trực tiếp phí khác (%)
};

const CONG_TRINH_TYPES = [
  { id: 1, name: "Công trình dân dụng (cấp I, II)", hscpc: 7.3 },
  { id: 2, name: "Công trình dân dụng (cấp III, IV)", hscpc: 11.6 },
  { id: 3, name: "Công trình công nghiệp (cấp I, II)", hscpc: 6.2 },
  { id: 4, name: "Công trình công nghiệp (cấp III, IV)", hscpc: 7.3 },
  { id: 5, name: "Công trình giao thông (cấp I, II)", hscpc: 6.2 },
  { id: 6, name: "Công trình giao thông (cấp III, IV)", hscpc: 7.3 },
  { id: 7, name: "Công trình nông nghiệp (cấp I, II)", hscpc: 6.1 },
];

// ============ UTILITIES ============
const fmt = (n) => {
  if (!n || isNaN(n)) return "0";
  return Math.round(n).toLocaleString("vi-VN");
};

const fmtPct = (n) => (n || 0).toFixed(2) + "%";

const genId = () => Math.random().toString(36).slice(2, 9);

// ============ COMPONENTS ============

function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: "flex", borderBottom: "2px solid #1a365d", background: "#f7fafc", overflowX: "auto" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: active === t.id ? "3px solid #2b6cb0" : "3px solid transparent",
            background: active === t.id ? "#fff" : "transparent",
            color: active === t.id ? "#2b6cb0" : "#4a5568",
            fontWeight: active === t.id ? 700 : 400,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontSize: 13,
            transition: "all 0.15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function InfoPanel({ project, onChange }) {
  const field = (label, key, type = "text") => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "#4a5568", marginBottom: 4, fontWeight: 600 }}>
        {label}
      </label>
      <input
        type={type}
        value={project[key] || ""}
        onChange={(e) => onChange({ ...project, [key]: e.target.value })}
        style={{
          width: "100%", padding: "7px 10px", border: "1px solid #cbd5e0",
          borderRadius: 6, fontSize: 13, background: "#fff", boxSizing: "border-box",
        }}
      />
    </div>
  );
  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <h3 style={{ color: "#1a365d", marginTop: 0, marginBottom: 20, fontSize: 16 }}>📋 Thông Tin Công Trình</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        {field("Tên dự án", "tenDuAn")}
        {field("Tên công trình", "tenCongTrinh")}
        {field("Hạng mục", "hangMuc")}
        {field("Địa điểm xây dựng", "diaDiem")}
        {field("Chủ đầu tư", "chuDauTu")}
        {field("Đơn vị lập dự toán", "donViLap")}
      </div>
      <div style={{ marginTop: 10, padding: "10px 14px", background: "#ebf8ff", borderRadius: 8, fontSize: 12, color: "#2b6cb0" }}>
        📌 Theo TT11/2021/TT-BXD, TT12/2021/TT-BXD, TT13/2021/TT-BXD
      </div>
    </div>
  );
}

function CoefficientPanel({ coef, onChange }) {
  const row = (label, key, suffix = "%") => (
    <tr key={key}>
      <td style={{ padding: "7px 12px", color: "#2d3748", fontSize: 13 }}>{label}</td>
      <td style={{ padding: "7px 12px" }}>
        <input
          type="number"
          value={coef[key]}
          step="0.1"
          onChange={(e) => onChange({ ...coef, [key]: parseFloat(e.target.value) || 0 })}
          style={{ width: 90, padding: "4px 8px", border: "1px solid #cbd5e0", borderRadius: 5, fontSize: 13, textAlign: "right" }}
        />
        {suffix && <span style={{ marginLeft: 6, color: "#718096", fontSize: 12 }}>{suffix}</span>}
      </td>
    </tr>
  );
  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h3 style={{ color: "#1a365d", marginTop: 0, marginBottom: 20, fontSize: 16 }}>⚙️ Hệ Số Áp Dụng</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#ebf4ff" }}>
            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#2b6cb0", fontWeight: 700 }}>Hệ số</th>
            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#2b6cb0", fontWeight: 700 }}>Giá trị</th>
          </tr>
        </thead>
        <tbody>
          {row("Hệ số vật liệu (K_VL)", "hsvl", "")}
          {row("Hệ số nhân công (K_NC)", "hsnc", "")}
          {row("Hệ số máy thi công (K_MTC)", "hsmtc", "")}
          {row("Chi phí chung (%)", "hscpc")}
          {row("Thu nhập chịu thuế tính trước (%)", "hstncttt")}
          {row("Thuế GTGT (%)", "hsvat")}
          {row("Chi phí nhà tạm (%)", "hsnt")}
          {row("Trực tiếp phí khác (%)", "hsttpk")}
        </tbody>
      </table>
      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#4a5568", display: "block", marginBottom: 8 }}>
          Loại công trình (tự động điền chi phí chung):
        </label>
        <select
          onChange={(e) => {
            const t = CONG_TRINH_TYPES.find((x) => x.id === parseInt(e.target.value));
            if (t) onChange({ ...coef, hscpc: t.hscpc });
          }}
          style={{ width: "100%", padding: "7px 10px", border: "1px solid #cbd5e0", borderRadius: 6, fontSize: 13 }}
        >
          <option value="">-- Chọn loại công trình --</option>
          {CONG_TRINH_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.hscpc}%)</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DuToanTable({ items, onAdd, onUpdate, onDelete, coef }) {
  const cols = [
    { key: "stt", label: "STT", w: 40 },
    { key: "mhDg", label: "Mã hiệu ĐG", w: 110 },
    { key: "noiDung", label: "Nội dung công việc", w: 240 },
    { key: "dvt", label: "ĐVT", w: 60 },
    { key: "kl", label: "Khối lượng", w: 90 },
    { key: "dgVl", label: "ĐG Vật liệu", w: 100 },
    { key: "dgNc", label: "ĐG Nhân công", w: 100 },
    { key: "dgMtc", label: "ĐG Máy TC", w: 100 },
    { key: "ttVl", label: "TT Vật liệu", w: 110 },
    { key: "ttNc", label: "TT Nhân công", w: 110 },
    { key: "ttMtc", label: "TT Máy TC", w: 110 },
  ];

  const calcTT = (item) => ({
    ttVl: (item.kl || 0) * (item.dgVl || 0),
    ttNc: (item.kl || 0) * (item.dgNc || 0),
    ttMtc: (item.kl || 0) * (item.dgMtc || 0),
  });

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ color: "#1a365d", margin: 0, fontSize: 16 }}>📊 Bảng Dự Toán</h3>
        <button
          onClick={onAdd}
          style={{
            padding: "7px 16px", background: "#2b6cb0", color: "#fff",
            border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}
        >
          + Thêm công việc
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: 1000 }}>
          <thead>
            <tr style={{ background: "#2b6cb0", color: "#fff" }}>
              {cols.map((c) => (
                <th key={c.key} style={{ padding: "8px 6px", textAlign: c.key === "stt" ? "center" : "left", whiteSpace: "nowrap", minWidth: c.w }}>
                  {c.label}
                </th>
              ))}
              <th style={{ padding: "8px 6px", width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} style={{ textAlign: "center", padding: 32, color: "#a0aec0" }}>
                  Chưa có công việc nào. Nhấn "+ Thêm công việc" để bắt đầu.
                </td>
              </tr>
            )}
            {items.map((item, idx) => {
              const tt = calcTT(item);
              const isGroup = item.isGroup;
              return (
                <tr
                  key={item.id}
                  style={{ background: isGroup ? "#ebf8ff" : idx % 2 === 0 ? "#fff" : "#f7fafc" }}
                >
                  <td style={{ padding: "5px 6px", textAlign: "center", color: "#718096" }}>{idx + 1}</td>
                  {["mhDg", "noiDung", "dvt"].map((k) => (
                    <td key={k} style={{ padding: "3px 4px" }}>
                      <input
                        value={item[k] || ""}
                        onChange={(e) => onUpdate(item.id, { [k]: e.target.value })}
                        style={{
                          width: "100%", border: "none", background: "transparent",
                          fontSize: 12, padding: "2px 4px", fontWeight: isGroup ? 700 : 400,
                        }}
                        placeholder={k === "noiDung" ? "Nhập nội dung..." : ""}
                      />
                    </td>
                  ))}
                  {["kl", "dgVl", "dgNc", "dgMtc"].map((k) => (
                    <td key={k} style={{ padding: "3px 4px" }}>
                      {!isGroup && (
                        <input
                          type="number"
                          value={item[k] || ""}
                          onChange={(e) => onUpdate(item.id, { [k]: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: "100%", border: "none", background: "transparent",
                            fontSize: 12, padding: "2px 4px", textAlign: "right",
                          }}
                        />
                      )}
                    </td>
                  ))}
                  <td style={{ padding: "5px 6px", textAlign: "right", color: "#2d3748" }}>
                    {!isGroup ? fmt(tt.ttVl) : ""}
                  </td>
                  <td style={{ padding: "5px 6px", textAlign: "right", color: "#2d3748" }}>
                    {!isGroup ? fmt(tt.ttNc) : ""}
                  </td>
                  <td style={{ padding: "5px 6px", textAlign: "right", color: "#2d3748" }}>
                    {!isGroup ? fmt(tt.ttMtc) : ""}
                  </td>
                  <td style={{ padding: "3px 4px", textAlign: "center" }}>
                    <button
                      onClick={() => onDelete(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#fc8181", fontSize: 14 }}
                      title="Xóa"
                    >✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, textAlign: "right", fontSize: 12, color: "#718096" }}>
        <button
          onClick={() => onAdd(true)}
          style={{
            padding: "5px 12px", background: "#f7fafc", border: "1px solid #cbd5e0",
            borderRadius: 5, cursor: "pointer", fontSize: 12, color: "#4a5568",
          }}
        >
          + Thêm nhóm/hạng mục
        </button>
      </div>
    </div>
  );
}

function THKP({ items, coef, project }) {
  const totals = items
    .filter((i) => !i.isGroup)
    .reduce(
      (acc, item) => {
        acc.vl += (item.kl || 0) * (item.dgVl || 0);
        acc.nc += (item.kl || 0) * (item.dgNc || 0);
        acc.mtc += (item.kl || 0) * (item.dgMtc || 0);
        return acc;
      },
      { vl: 0, nc: 0, mtc: 0 }
    );

  const VL = totals.vl * coef.hsvl;
  const NC = totals.nc * coef.hsnc;
  const MTC = totals.mtc * coef.hsmtc;
  const TT_K = coef.hsttpk / 100;
  const TT = (VL + NC + MTC) * TT_K;
  const T = VL + NC + MTC + TT;
  const C = T * (coef.hscpc / 100);
  const LT = T * (coef.hsnt / 100);
  const GT = C + LT;
  const Z = T + GT;
  const TL = Z * (coef.hstncttt / 100);
  const G = Z + TL;
  const GTGT = G * (coef.hsvat / 100);
  const GXDST = G + GTGT;

  const rows = [
    { label: "Chi phí Vật liệu", key: "VL", val: VL, ky: "VL", bold: false },
    { label: "Chi phí Nhân công", key: "NC", val: NC, ky: "NC", bold: false },
    { label: "Chi phí Máy thi công", key: "MTC", val: MTC, ky: "MTC", bold: false },
    { label: "Trực tiếp phí khác", key: "TT", val: TT, ky: "TT", sub: true },
    { label: "I. CHI PHÍ TRỰC TIẾP", key: "T", val: T, ky: "T", bold: true, bg: "#e6fffa" },
    { label: "Chi phí chung", key: "C", val: C, ky: "C", sub: true },
    { label: "Chi phí nhà tạm", key: "LT", val: LT, ky: "LT", sub: true },
    { label: "II. CHI PHÍ GIÁN TIẾP", key: "GT", val: GT, ky: "GT", bold: true, bg: "#e6fffa" },
    { label: "Giá thành dự toán xây dựng", key: "Z", val: Z, ky: "Z", bold: true },
    { label: "III. THU NHẬP CHỊU THUẾ TÍNH TRƯỚC", key: "TL", val: TL, ky: "TL", bold: true, bg: "#e6fffa" },
    { label: "Chi phí xây dựng trước thuế", key: "G", val: G, ky: "G", bold: true },
    { label: "IV. THUẾ GIÁ TRỊ GIA TĂNG", key: "GTGT", val: GTGT, ky: "GTGT", bold: true, bg: "#e6fffa" },
    { label: "CHI PHÍ XÂY DỰNG SAU THUẾ", key: "GXDST", val: GXDST, ky: "GXDST", bold: true, bg: "#bee3f8", fontSize: 14 },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ color: "#1a365d", marginTop: 0, marginBottom: 4, fontSize: 16 }}>💰 Tổng Hợp Kinh Phí (THKP)</h3>
      <div style={{ fontSize: 12, color: "#718096", marginBottom: 16 }}>
        {project.tenCongTrinh || "---"} | {project.hangMuc || "---"}
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 700 }}>
        <thead>
          <tr style={{ background: "#2b6cb0", color: "#fff" }}>
            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12 }}>STT</th>
            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12 }}>Khoản mục chi phí</th>
            <th style={{ padding: "8px 12px", textAlign: "center", fontSize: 12 }}>KH</th>
            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12 }}>Cách tính</th>
            <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 12 }}>Thành tiền (đồng)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} style={{ background: r.bg || (i % 2 === 0 ? "#fff" : "#f7fafc") }}>
              <td style={{ padding: "7px 12px", fontSize: 12, color: "#718096" }}>
                {["T", "GT", "TL", "GTGT"].includes(r.key) ? ["I", "II", "III", "IV"][["T", "GT", "TL", "GTGT"].indexOf(r.key)] : ""}
              </td>
              <td style={{ padding: "7px 12px", fontSize: r.fontSize || 12, fontWeight: r.bold ? 700 : 400, paddingLeft: r.sub ? 28 : 12 }}>
                {r.label}
              </td>
              <td style={{ padding: "7px 12px", fontSize: 12, color: "#4a5568", textAlign: "center" }}>{r.ky}</td>
              <td style={{ padding: "7px 12px", fontSize: 11, color: "#718096" }}>
                {r.key === "VL" && `A1 × ${coef.hsvl}`}
                {r.key === "NC" && `B1 × ${coef.hsnc}`}
                {r.key === "MTC" && `C1 × ${coef.hsmtc}`}
                {r.key === "TT" && `T × ${coef.hsttpk}%`}
                {r.key === "T" && "VL + NC + MTC + TT"}
                {r.key === "C" && `T × ${coef.hscpc}%`}
                {r.key === "LT" && `T × ${coef.hsnt}%`}
                {r.key === "GT" && "C + LT"}
                {r.key === "Z" && "T + GT"}
                {r.key === "TL" && `Z × ${coef.hstncttt}%`}
                {r.key === "G" && "Z + TL"}
                {r.key === "GTGT" && `G × ${coef.hsvat}%`}
                {r.key === "GXDST" && "G + GTGT"}
              </td>
              <td style={{ padding: "7px 12px", fontSize: r.fontSize || 12, fontWeight: r.bold ? 700 : 400, textAlign: "right", color: r.key === "GXDST" ? "#2b6cb0" : "#2d3748" }}>
                {fmt(r.val)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 24, padding: "14px 18px", background: "#ebf8ff", borderRadius: 10, border: "1px solid #bee3f8" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#2b6cb0" }}>
          TỔNG CỘNG (GXD SAU THUẾ): {fmt(GXDST)} đồng
        </div>
        <div style={{ fontSize: 12, color: "#4a5568", marginTop: 4 }}>
          Trong đó: VL = {fmt(VL)} | NC = {fmt(NC)} | MTC = {fmt(MTC)}
        </div>
      </div>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { label: "Chi phí VL / Tổng", val: G > 0 ? (VL / G * 100).toFixed(1) : 0, unit: "%" },
          { label: "Chi phí NC / Tổng", val: G > 0 ? (NC / G * 100).toFixed(1) : 0, unit: "%" },
          { label: "Chi phí MTC / Tổng", val: G > 0 ? (MTC / G * 100).toFixed(1) : 0, unit: "%" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#718096" }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#2b6cb0", marginTop: 4 }}>{s.val}{s.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GiaTriVatTu({ items }) {
  const vtMap = {};
  items.filter(i => !i.isGroup).forEach((item) => {
    const key = item.mhVt || item.mhDg;
    if (!key) return;
    if (!vtMap[key]) vtMap[key] = { ma: key, ten: item.tenVt || item.noiDung, dvt: item.dvt, kl: 0, dg: item.dgVl || 0 };
    vtMap[key].kl += (item.kl || 0);
  });
  const vtList = Object.values(vtMap).filter(v => v.kl > 0 && v.dg > 0);

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ color: "#1a365d", marginTop: 0, marginBottom: 16, fontSize: 16 }}>🔩 Bảng Giá Trị Vật Tư</h3>
      <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
        <thead>
          <tr style={{ background: "#2b6cb0", color: "#fff" }}>
            <th style={{ padding: "8px 10px" }}>STT</th>
            <th style={{ padding: "8px 10px", textAlign: "left" }}>Mã vật tư</th>
            <th style={{ padding: "8px 10px", textAlign: "left" }}>Tên vật tư</th>
            <th style={{ padding: "8px 10px" }}>ĐVT</th>
            <th style={{ padding: "8px 10px", textAlign: "right" }}>Khối lượng</th>
            <th style={{ padding: "8px 10px", textAlign: "right" }}>Đơn giá</th>
            <th style={{ padding: "8px 10px", textAlign: "right" }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {vtList.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>Chưa có dữ liệu vật tư</td></tr>
          )}
          {vtList.map((v, i) => (
            <tr key={v.ma} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
              <td style={{ padding: "6px 10px", textAlign: "center" }}>{i + 1}</td>
              <td style={{ padding: "6px 10px", color: "#4a5568" }}>{v.ma}</td>
              <td style={{ padding: "6px 10px" }}>{v.ten}</td>
              <td style={{ padding: "6px 10px", textAlign: "center" }}>{v.dvt}</td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>{v.kl.toFixed(4)}</td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(v.dg)}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>{fmt(v.kl * v.dg)}</td>
            </tr>
          ))}
          {vtList.length > 0 && (
            <tr style={{ background: "#ebf8ff", fontWeight: 700 }}>
              <td colSpan={6} style={{ padding: "8px 10px", textAlign: "right" }}>TỔNG CỘNG</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(vtList.reduce((s, v) => s + v.kl * v.dg, 0))}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DinhMucPanel({ dinhMuc, onAdd, onDelete }) {
  const [form, setForm] = useState({ mhDm: "", ten: "", dvt: "", vlDm: 0, ncDm: 0, mtcDm: 0 });
  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ color: "#1a365d", marginTop: 0, marginBottom: 16, fontSize: 16 }}>📚 Thư Viện Định Mức</h3>
      <div style={{ background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: "#2d3748" }}>Thêm định mức mới (TT11/2021)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { label: "Mã hiệu ĐM", key: "mhDm" },
            { label: "Tên công tác", key: "ten" },
            { label: "ĐVT", key: "dvt" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: "block", fontSize: 11, color: "#4a5568", marginBottom: 3 }}>{f.label}</label>
              <input
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                style={{ width: "100%", padding: "5px 8px", border: "1px solid #cbd5e0", borderRadius: 5, fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
          ))}
          {[
            { label: "ĐM Vật liệu", key: "vlDm" },
            { label: "ĐM Nhân công", key: "ncDm" },
            { label: "ĐM Máy TC", key: "mtcDm" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: "block", fontSize: 11, color: "#4a5568", marginBottom: 3 }}>{f.label}</label>
              <input
                type="number"
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: parseFloat(e.target.value) || 0 })}
                style={{ width: "100%", padding: "5px 8px", border: "1px solid #cbd5e0", borderRadius: 5, fontSize: 12, boxSizing: "border-box", textAlign: "right" }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => { if (form.mhDm && form.ten) { onAdd({ ...form, id: genId() }); setForm({ mhDm: "", ten: "", dvt: "", vlDm: 0, ncDm: 0, mtcDm: 0 }); } }}
          style={{ marginTop: 12, padding: "7px 16px", background: "#2b6cb0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
        >
          Thêm định mức
        </button>
      </div>
      <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
        <thead>
          <tr style={{ background: "#2b6cb0", color: "#fff" }}>
            {["Mã hiệu", "Tên công tác", "ĐVT", "ĐM Vật liệu", "ĐM Nhân công", "ĐM Máy TC", ""].map(h => (
              <th key={h} style={{ padding: "7px 10px", textAlign: h.includes("ĐM") ? "right" : "left" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dinhMuc.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>Chưa có định mức nào</td></tr>
          )}
          {dinhMuc.map((dm, i) => (
            <tr key={dm.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
              <td style={{ padding: "6px 10px", fontFamily: "monospace", color: "#4a5568" }}>{dm.mhDm}</td>
              <td style={{ padding: "6px 10px" }}>{dm.ten}</td>
              <td style={{ padding: "6px 10px", textAlign: "center" }}>{dm.dvt}</td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>{dm.vlDm}</td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>{dm.ncDm}</td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>{dm.mtcDm}</td>
              <td style={{ padding: "6px 10px", textAlign: "center" }}>
                <button onClick={() => onDelete(dm.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fc8181" }}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExportPanel({ project, items, coef }) {
  const handleExport = async () => {
    const totals = items.filter(i => !i.isGroup).reduce(
      (acc, item) => {
        acc.vl += (item.kl || 0) * (item.dgVl || 0);
        acc.nc += (item.kl || 0) * (item.dgNc || 0);
        acc.mtc += (item.kl || 0) * (item.dgMtc || 0);
        return acc;
      }, { vl: 0, nc: 0, mtc: 0 }
    );
    const VL = totals.vl * coef.hsvl;
    const NC = totals.nc * coef.hsnc;
    const MTC = totals.mtc * coef.hsmtc;
    const T = VL + NC + MTC;
    const C = T * (coef.hscpc / 100);
    const LT = T * (coef.hsnt / 100);
    const Z = T + C + LT;
    const TL = Z * (coef.hstncttt / 100);
    const G = Z + TL;
    const GTGT = G * (coef.hsvat / 100);
    const GXDST = G + GTGT;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Tạo thuyết minh ngắn gọn (3-4 câu) cho dự toán xây dựng sau (tiếng Việt):
Công trình: ${project.tenCongTrinh || "---"}
Hạng mục: ${project.hangMuc || "---"}
Chi phí xây dựng trước thuế: ${fmt(G)} đồng
Thuế GTGT ${coef.hsvat}%: ${fmt(GTGT)} đồng
Tổng cộng sau thuế: ${fmt(GXDST)} đồng
Chi phí chung: ${coef.hscpc}%, TNCTTT: ${coef.hstncttt}%
Số công việc: ${items.filter(i => !i.isGroup).length}
Nêu cơ sở pháp lý (TT11/12/13-2021/TT-BXD) và kết luận.`
        }]
      })
    });
    const data = await response.json();
    return data.content?.[0]?.text || "";
  };

  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ color: "#1a365d", marginTop: 0, marginBottom: 16, fontSize: 16 }}>📤 Xuất File & Thuyết Minh</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#2d3748", marginBottom: 12 }}>📄 Xuất Excel (G8 format)</div>
          <p style={{ fontSize: 12, color: "#718096", margin: "0 0 16px" }}>
            Xuất file Excel với đầy đủ các sheet: Du toan, Gia tri vat tu, THKP, Don gia chi tiet, TM...
            theo chuẩn G8 / TT11-13/2021/TT-BXD
          </p>
          <div style={{ fontSize: 11, color: "#718096", marginBottom: 12 }}>
            ⚠️ Để xuất Excel đầy đủ, vui lòng dùng tính năng xuất file của hệ thống hoặc copy dữ liệu từ các bảng.
          </div>
          <button
            onClick={() => {
              const csvRows = [
                ["STT","Mã hiệu ĐG","Nội dung công việc","ĐVT","Khối lượng","ĐG Vật liệu","ĐG Nhân công","ĐG Máy TC","TT Vật liệu","TT Nhân công","TT Máy TC"],
                ...items.filter(i => !i.isGroup).map((item, idx) => [
                  idx+1, item.mhDg, item.noiDung, item.dvt, item.kl, item.dgVl, item.dgNc, item.dgMtc,
                  (item.kl||0)*(item.dgVl||0), (item.kl||0)*(item.dgNc||0), (item.kl||0)*(item.dgMtc||0)
                ])
              ];
              const csv = csvRows.map(r => r.map(c => `"${c||""}"`).join(",")).join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `DuToan_${project.tenCongTrinh||"CT"}.csv`;
              a.click(); URL.revokeObjectURL(url);
            }}
            style={{ padding: "9px 20px", background: "#38a169", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            📊 Xuất CSV (Excel-compatible)
          </button>
        </div>

        <div style={{ background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#2d3748", marginBottom: 12 }}>🤖 Tạo Thuyết Minh AI</div>
          <p style={{ fontSize: 12, color: "#718096", margin: "0 0 16px" }}>
            Tự động tạo thuyết minh dự toán theo TT11/12/13-2021/TT-BXD bằng AI
          </p>
          <button
            onClick={async () => {
              setLoading(true);
              setNote("Đang tạo thuyết minh...");
              try {
                const text = await handleExport();
                setNote(text);
              } catch (e) {
                setNote("Lỗi: " + e.message);
              }
              setLoading(false);
            }}
            disabled={loading}
            style={{ padding: "9px 20px", background: "#805ad5", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            {loading ? "⏳ Đang tạo..." : "✨ Tạo thuyết minh"}
          </button>
          {note && (
            <div style={{ marginTop: 14, padding: 12, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#2d3748", lineHeight: 1.6 }}>
              {note}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, padding: 16, background: "#fffaf0", border: "1px solid #fbd38d", borderRadius: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#744210", marginBottom: 8 }}>📌 Hướng dẫn chia sẻ cho nhiều người dùng</div>
        <ul style={{ fontSize: 12, color: "#744210", margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Ứng dụng này chạy hoàn toàn trên trình duyệt, không cần cài đặt</li>
          <li>Dữ liệu lưu trong tab hiện tại (khi đóng tab sẽ mất)</li>
          <li>Để chia sẻ: Xuất CSV, gửi file cho đồng nghiệp</li>
          <li>Để lưu trữ lâu dài: Sử dụng tính năng lưu dữ liệu định mức bên trên</li>
          <li>3-4 người có thể dùng đồng thời bằng cách mở ứng dụng trong Claude.ai</li>
        </ul>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
export default function DuToanApp() {
  const [activeTab, setActiveTab] = useState("info");
  const [project, setProject] = useState({
    tenDuAn: "Cải tạo công nghệ cầu xuất",
    tenCongTrinh: "Cải tạo công nghệ cầu xuất",
    hangMuc: "Cải tạo công nghệ cầu xuất xuống thùng xe bồn",
    diaDiem: "Kho xăng dầu Tây Nam Bộ",
    chuDauTu: "",
    donViLap: "",
  });
  const [coef, setCoef] = useState({ ...DEFAULT_COEFFICIENTS });
  const [items, setItems] = useState([
    { id: genId(), isGroup: true, noiDung: "HẠ CẦN XUẤT XUỐNG THÙNG XE BỒN", mhDg: "" },
    { id: genId(), mhDg: "BB.31010", noiDung: "Tháo dỡ ống thép 4\"", dvt: "100m", kl: 0.4, dgVl: 14414948, dgNc: 7681938, dgMtc: 298842 },
    { id: genId(), mhDg: "BB.86104", noiDung: "Tháo dỡ van 4\" hiện trạng", dvt: "cái", kl: 6, dgVl: 4839212, dgNc: 141818, dgMtc: 0 },
    { id: genId(), mhDg: "BB.87104", noiDung: "Tháo dỡ bích 4\" hiện trạng", dvt: "cặp bích", kl: 18, dgVl: 537422, dgNc: 97984, dgMtc: 35389 },
    { id: genId(), mhDg: "BB.85102", noiDung: "Tháo dỡ công tơ 4\" hiện trạng", dvt: "cái", kl: 3, dgVl: 7796260, dgNc: 198546, dgMtc: 0 },
    { id: genId(), mhDg: "AK.83520", noiDung: "Sơn ống công nghệ 4\"", dvt: "m2", kl: 14.318, dgVl: 31946, dgNc: 20468, dgMtc: 0 },
    { id: genId(), mhDg: "AI.11132", noiDung: "Gia công gối đỡ bằng thép hình", dvt: "tấn", kl: 0.2, dgVl: 22128552, dgNc: 3498187, dgMtc: 3111579 },
  ]);
  const [dinhMuc, setDinhMuc] = useState([]);

  const addItem = (isGroup = false) => {
    setItems([...items, { id: genId(), isGroup: !!isGroup, mhDg: "", noiDung: isGroup ? "NHÓM MỚI" : "", dvt: "", kl: 0, dgVl: 0, dgNc: 0, dgMtc: 0 }]);
  };
  const updateItem = (id, changes) => setItems(items.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  const deleteItem = (id) => setItems(items.filter((i) => i.id !== id));

  const tabs = [
    { id: "info", label: "📋 Thông tin" },
    { id: "coef", label: "⚙️ Hệ số" },
    { id: "dutoan", label: "📊 Bảng dự toán" },
    { id: "thkp", label: "💰 Tổng hợp KP" },
    { id: "vattu", label: "🔩 Giá trị vật tư" },
    { id: "dinhmuc", label: "📚 Định mức" },
    { id: "export", label: "📤 Xuất file" },
  ];

  // Quick summary bar
  const totals = items.filter(i => !i.isGroup).reduce(
    (acc, item) => { acc.vl += (item.kl||0)*(item.dgVl||0); acc.nc += (item.kl||0)*(item.dgNc||0); acc.mtc += (item.kl||0)*(item.dgMtc||0); return acc; },
    { vl: 0, nc: 0, mtc: 0 }
  );
  const T = (totals.vl * coef.hsvl) + (totals.nc * coef.hsnc) + (totals.mtc * coef.hsmtc);
  const G = T * (1 + coef.hscpc/100 + coef.hsnt/100) * (1 + coef.hstncttt/100);
  const GXDST = G * (1 + coef.hsvat/100);

  return (
    <div style={{ fontFamily: "'Segoe UI', 'Arial', sans-serif", minHeight: "100vh", background: "#edf2f7" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: 0.5 }}>
            🏗️ Phần Mềm Dự Toán Xây Dựng
          </div>
          <div style={{ color: "#90cdf4", fontSize: 11, marginTop: 2 }}>
            Theo TT11/12/13-2021/TT-BXD · {project.tenCongTrinh || "---"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Chi phí TC", val: fmt(T) },
            { label: "Trước thuế", val: fmt(G) },
            { label: "Sau thuế (GXDST)", val: fmt(GXDST), highlight: true },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#90cdf4" }}>{s.label}</div>
              <div style={{ fontSize: s.highlight ? 16 : 13, fontWeight: 700, color: s.highlight ? "#ffd700" : "#fff" }}>
                {s.val} đ
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <TabBar tabs={tabs} active={activeTab} onSelect={setActiveTab} />

      {/* Content */}
      <div style={{ background: "#fff", minHeight: "calc(100vh - 130px)" }}>
        {activeTab === "info" && <InfoPanel project={project} onChange={setProject} />}
        {activeTab === "coef" && <CoefficientPanel coef={coef} onChange={setCoef} />}
        {activeTab === "dutoan" && (
          <DuToanTable items={items} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} coef={coef} />
        )}
        {activeTab === "thkp" && <THKP items={items} coef={coef} project={project} />}
        {activeTab === "vattu" && <GiaTriVatTu items={items} />}
        {activeTab === "dinhmuc" && (
          <DinhMucPanel
            dinhMuc={dinhMuc}
            onAdd={(dm) => setDinhMuc([...dinhMuc, dm])}
            onDelete={(id) => setDinhMuc(dinhMuc.filter(d => d.id !== id))}
          />
        )}
        {activeTab === "export" && <ExportPanel project={project} items={items} coef={coef} />}
      </div>
    </div>
  );
}
