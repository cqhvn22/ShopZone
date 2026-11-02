"use client";
import { useEffect, useState } from "react";
import type { User } from "@/lib/types";
type Address = {
  id?: string;
  recipient: string;
  phone: string;
  address: string;
  city: string;
  ward: string;
  is_default: boolean;
};
type Province = {
  name: string;
  code: number;
  wards: { name: string; code: number }[];
};
export function AddressFields({ user }: { user: User | null }) {
  const empty = (): Address => ({
    recipient: user?.fullName || "",
    phone: "",
    address: "",
    city: "",
    ward: "",
    is_default: false,
  });
  const [draft, setDraft] = useState<Address>(empty),
    [saved, setSaved] = useState<Address[]>([]),
    [selected, setSelected] = useState(""),
    [provinces, setProvinces] = useState<Province[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [locationsError, setLocationsError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/vn-locations.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setProvinces)
      .catch(() => {
        if (!controller.signal.aborted) setLocationsError(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    let active = true;
    setSaved([]);
    setSelected("");
    setDraft(empty());
    setMessage("");
    if (user)
      fetch("/api/shop/users/me/addresses", { cache: "no-store" })
        .then(async (r) => {
          if (!r.ok) throw Error();
          return r.json();
        })
        .then((rows: Address[]) => {
          if (!active) return;
          setSaved(rows);
          const primary = rows.find((a) => a.is_default);
          if (primary) {
            setDraft(primary);
            setSelected(primary.id!);
          }
        })
        .catch(() => {
          if (active)
            setMessage(
              "Chưa tải được sổ địa chỉ. Bạn vẫn có thể nhập địa chỉ mới.",
            );
        });
    return () => {
      active = false;
    };
  }, [user?.id]);
  function choose(id: string) {
    setSelected(id);
    setDraft(saved.find((a) => a.id === id) || empty());
    setMessage("");
  }
  async function persist(remove = false) {
    if (!user) return;
    if (
      !remove &&
      [
        draft.recipient,
        draft.phone,
        draft.address,
        draft.city,
        draft.ward,
      ].some((v) => !v.trim())
    ) {
      setMessage("Vui lòng điền đầy đủ thông tin địa chỉ.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(
        "/api/shop/users/me/addresses" + (selected ? "/" + selected : ""),
        {
          method: remove ? "DELETE" : selected ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: remove
            ? undefined
            : JSON.stringify({
                recipient: draft.recipient,
                phone: draft.phone,
                address: draft.address,
                city: draft.city,
                ward: draft.ward,
                isDefault: draft.is_default,
              }),
        },
      );
      if (!r.ok)
        throw Error(
          "Không thể lưu thay đổi. Vui lòng kiểm tra phiên đăng nhập và thử lại.",
        );
      const rows: Address[] = await r.json();
      setSaved(rows);
      if (remove) {
        setSelected("");
        setDraft(empty());
      } else if (!selected) {
        const created = rows.find((a) => !saved.some((s) => s.id === a.id));
        if (created) {
          setSelected(created.id!);
          setDraft(created);
        }
      }
      setMessage(
        remove ? "Đã xóa địa chỉ đã lưu." : "Đã lưu địa chỉ vào tài khoản.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không thể lưu địa chỉ.");
    } finally {
      setBusy(false);
    }
  }
  const wards = provinces.find((p) => p.name === draft.city)?.wards || [];
  return (
    <>
      {user && (
        <div className="form-field">
          <label htmlFor="saved-address" className="field-label">
            Địa chỉ đã lưu
          </label>
          <select
            id="saved-address"
            value={selected}
            onChange={(e) => choose(e.target.value)}
            disabled={busy}
          >
            <option value="">Nhập địa chỉ mới</option>
            {saved.map((a) => (
              <option key={a.id} value={a.id}>
                {a.is_default ? "Mặc định · " : ""}
                {a.recipient} — {a.address}, {a.ward}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="form-grid">
        {(["recipient", "phone"] as const).map((field) => (
          <div className="form-field" key={field}>
            <label className="field-label" htmlFor={field}>
              {field === "recipient" ? "Họ và tên người nhận" : "Số điện thoại"}
            </label>
            <input
              id={field}
              name={field}
              required
              maxLength={field === "recipient" ? 150 : 20}
              type={field === "phone" ? "tel" : "text"}
              autoComplete={
                field === "phone" ? "shipping tel" : "shipping name"
              }
              value={draft[field]}
              onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="city" className="field-label">
            Tỉnh / Thành phố
          </label>
          <select
            id="city"
            name="city"
            required
            autoComplete="shipping address-level1"
            value={draft.city}
            onChange={(e) =>
              setDraft({ ...draft, city: e.target.value, ward: "" })
            }
          >
            <option value="">Chọn tỉnh / thành phố</option>
            {draft.city && !provinces.some((p) => p.name === draft.city) && (
              <option>{draft.city}</option>
            )}
            {provinces.map((p) => (
              <option key={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="ward" className="field-label">
            Phường / Xã
          </label>
          <select
            id="ward"
            name="ward"
            required
            disabled={!draft.city}
            autoComplete="shipping address-level2"
            value={draft.ward}
            onChange={(e) => setDraft({ ...draft, ward: e.target.value })}
          >
            <option value="">
              {draft.city ? "Chọn phường / xã" : "Chọn tỉnh / thành trước"}
            </option>
            {draft.ward && !wards.some((w) => w.name === draft.ward) && (
              <option>{draft.ward}</option>
            )}
            {wards.map((w) => (
              <option key={w.code}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>
      {locationsError && (
        <p role="alert">
          Chưa tải được danh sách địa phương. Vui lòng tải lại trang.
        </p>
      )}
      <div className="form-field">
        <label htmlFor="address" className="field-label">
          Địa chỉ chi tiết
        </label>
        <textarea
          id="address"
          name="address"
          required
          rows={3}
          maxLength={500}
          autoComplete="shipping street-address"
          placeholder="Số nhà, tên đường, tòa nhà…"
          value={draft.address}
          onChange={(e) => setDraft({ ...draft, address: e.target.value })}
        />
      </div>
      {user && (
        <div className="address-actions">
          <label>
            <input
              type="checkbox"
              checked={draft.is_default}
              onChange={(e) =>
                setDraft({ ...draft, is_default: e.target.checked })
              }
            />{" "}
            Đặt làm địa chỉ mặc định
          </label>
          <div>
            <button
              type="button"
              className="btn outline"
              disabled={busy}
              onClick={() => persist()}
            >
              {busy
                ? "Đang lưu…"
                : selected
                  ? "Cập nhật địa chỉ"
                  : "Lưu địa chỉ"}
            </button>
            {selected && (
              <button
                type="button"
                className="btn outline"
                disabled={busy}
                onClick={() => persist(true)}
              >
                Xóa địa chỉ
              </button>
            )}
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </>
  );
}
