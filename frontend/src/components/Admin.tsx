"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "./StoreProvider";
import { money, orderLabel, slugify } from "@/lib/store-utils.mjs";
import type { Product, Category, Order } from "@/lib/types";
export function Admin() {
  const { user, ready, notify } = useStore();
  const [tab, setTab] = useState("overview"),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editor, setEditor] = useState<Product | null | false>(false),
    [categories, setCategories] = useState<Category[]>([]);
  const admin = user?.roles.includes("ADMIN");
  async function api(path: string, method = "GET", body?: unknown) {
    const r = await fetch("/api/shop/" + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const text = await r.text();
    const b = text ? JSON.parse(text) : null;
    if (!r.ok) throw Error(b?.detail || "Không thực hiện được yêu cầu.");
    return b;
  }
  async function load() {
    setBusy(true);
    setError("");
    try {
      const path = (
        {
          overview: "admin/statistics",
          products: "products?size=100",
          categories: "categories",
          inventory: "products?size=100",
          orders: "orders?size=100",
          users: "users?size=100",
        } as Record<string, string>
      )[tab];
      const result = await api(path);
      setData(result.content || result);
      if (tab === "products") setCategories(await api("categories"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa tải được dữ liệu.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (admin) void load();
  }, [admin, tab]);
  async function save(path: string, method: string, body?: unknown) {
    try {
      setError("");
      await api(path, method, body);
      notify("Đã cập nhật thành công");
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật chưa thành công.");
      return false;
    }
  }
  async function saveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const first = {
      sku: String(f.get("sku")),
      price: Number(f.get("price")),
      active: true,
      attributes: editor ? editor.variants[0]?.attributes || {} : {},
    };
    const body = {
      name: f.get("name"),
      slug: f.get("slug"),
      description: f.get("description"),
      categoryId: f.get("categoryId"),
      brand: f.get("brand"),
      images: [String(f.get("image"))].filter(Boolean),
      attributes: editor ? editor.attributes : {},
      variants: editor ? [first, ...editor.variants.slice(1)] : [first],
    };
    if (
      await save(
        "products" + (editor ? "/" + editor.id : ""),
        editor ? "PUT" : "POST",
        body,
      )
    )
      setEditor(false);
  }
  if (!ready)
    return <div className="loading-state">Đang kiểm tra tài khoản…</div>;
  if (!admin)
    return (
      <div className="container inner-page">
        <div className="empty-state">
          <h1>Khu vực quản trị</h1>
          <p>Vui lòng đăng nhập bằng tài khoản quản trị của cửa hàng.</p>
          <Link className="btn primary" href="/dang-nhap?next=%2Fquan-tri">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  const titles: Record<string, string> = {
    overview: "Tổng quan",
    products: "Sản phẩm",
    categories: "Danh mục",
    inventory: "Tồn kho",
    orders: "Đơn hàng",
    users: "Tài khoản",
  };
  return (
    <div className="container admin-layout">
      <aside className="admin-sidebar">
        <h1>SHOPZONE ADMIN</h1>
        {Object.entries(titles).map(([value, title]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            onClick={() => {
              setTab(value);
              setData(null);
              setEditor(false);
            }}
          >
            {title}
          </button>
        ))}
      </aside>
      <section className="admin-content">
        <div className="page-heading">
          <h2>{titles[tab]}</h2>
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => void load()}
          >
            Làm mới
          </button>
        </div>
        {error && (
          <div role="alert" className="error-notice">
            {error}
          </div>
        )}
        {busy && <p className="loading-state">Đang tải…</p>}
        {tab === "overview" && data && (
          <div className="admin-stats">
            <div>
              <span>Tổng đơn hàng</span>
              <b>{data.total_orders}</b>
            </div>
            <div>
              <span>Đơn hoàn thành</span>
              <b>{data.completed_orders}</b>
            </div>
            <div>
              <span>Doanh thu đã hoàn tất</span>
              <b>{money(data.completed_revenue)}</b>
            </div>
          </div>
        )}
        {tab === "products" && (
          <>
            <button className="btn primary" onClick={() => setEditor(null)}>
              + Thêm sản phẩm
            </button>
            {editor !== false && (
              <form className="panel admin-editor" onSubmit={saveProduct}>
                <h3>{editor ? "Chỉnh sửa sản phẩm" : "Sản phẩm mới"}</h3>
                <div className="form-grid">
                  {[
                    ["name", "Tên sản phẩm", editor?.name || ""],
                    ["slug", "Đường dẫn (slug)", editor?.slug || ""],
                    ["brand", "Thương hiệu", editor?.brand || ""],
                    ["sku", "SKU", editor?.variants[0]?.sku || ""],
                    [
                      "price",
                      "Giá bán (VND)",
                      String(editor?.variants[0]?.price || ""),
                    ],
                    ["image", "URL ảnh", editor?.images[0] || ""],
                  ].map(([name, label, value]) => (
                    <div className="form-field" key={name}>
                      <label htmlFor={"edit-" + name} className="field-label">
                        {label}
                      </label>
                      <input
                        id={"edit-" + name}
                        name={name}
                        defaultValue={value}
                        type={name === "price" ? "number" : "text"}
                        min={0}
                        step={name === "price" ? ".01" : undefined}
                        required={name !== "image"}
                        readOnly={name === "sku" && !!editor}
                      />
                    </div>
                  ))}
                  <div className="form-field">
                    <label className="field-label" htmlFor="edit-category">
                      Danh mục
                    </label>
                    <select
                      id="edit-category"
                      name="categoryId"
                      required
                      defaultValue={editor?.categoryId}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="edit-description">
                    Mô tả
                  </label>
                  <textarea
                    id="edit-description"
                    name="description"
                    rows={4}
                    defaultValue={editor?.description}
                  />
                </div>
                <button className="btn primary">Lưu sản phẩm</button>{" "}
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setEditor(false)}
                >
                  Đóng
                </button>
              </form>
            )}
            {Array.isArray(data) && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Thương hiệu</th>
                      <th>Giá</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((p: Product) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.brand}</td>
                        <td>{money(p.variants[0]?.price)}</td>
                        <td>
                          <button onClick={() => setEditor(p)}>
                            Chỉnh sửa
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Ngừng bán sản phẩm này?"))
                                void save("products/" + p.id, "DELETE");
                            }}
                          >
                            Ngừng bán
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {tab === "categories" && (
          <>
            <form
              className="panel inline-admin-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void save("categories", "POST", {
                  name: f.get("name"),
                  slug: slugify(String(f.get("name"))),
                  active: true,
                  parentId: null,
                });
              }}
            >
              <label htmlFor="category-name">Tên danh mục mới</label>
              <input id="category-name" name="name" required />
              <button className="btn primary">Thêm danh mục</button>
            </form>
            {Array.isArray(data) && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Danh mục</th>
                      <th>Đường dẫn</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((c: Category) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.slug}</td>
                        <td>
                          <button
                            onClick={() => {
                              const name = prompt("Tên danh mục", c.name);
                              if (name)
                                void save("categories/" + c.id, "PUT", {
                                  name,
                                  slug: c.slug,
                                  parentId: c.parentId || null,
                                  active: true,
                                });
                            }}
                          >
                            Đổi tên
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Ngừng dùng danh mục?"))
                                void save("categories/" + c.id, "DELETE");
                            }}
                          >
                            Ngừng dùng
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {tab === "inventory" && Array.isArray(data) && (
          <form
            className="panel inline-admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void save(
                "inventory/" + encodeURIComponent(String(f.get("sku"))),
                "PUT",
                { onHand: Number(f.get("onHand")) },
              );
            }}
          >
            <label>
              SKU
              <select name="sku">
                {data.flatMap((p: Product) =>
                  p.variants.map((v) => <option key={v.sku}>{v.sku}</option>),
                )}
              </select>
            </label>
            <label>
              Số lượng thực tế
              <input
                required
                name="onHand"
                min={0}
                max={1000000000}
                type="number"
              />
            </label>
            <button className="btn primary">Cập nhật tồn kho</button>
          </form>
        )}
        {tab === "orders" && Array.isArray(data) && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((o: Order) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={"/don-hang/" + o.id}>{o.orderCode}</Link>
                    </td>
                    <td>{money(o.totalAmount)}</td>
                    <td>{orderLabel(o.status)}</td>
                    <td>
                      {["CONFIRMED", "PAID"].includes(o.status) && (
                        <button
                          disabled={!o.stockCommitted}
                          onClick={() =>
                            void save("orders/" + o.id + "/status", "PATCH", {
                              status: "SHIPPING",
                            })
                          }
                        >
                          Giao hàng
                        </button>
                      )}
                      {o.status === "SHIPPING" && (
                        <button
                          onClick={() =>
                            void save("orders/" + o.id + "/status", "PATCH", {
                              status: "COMPLETED",
                            })
                          }
                        >
                          Hoàn tất
                        </button>
                      )}
                      {["PENDING", "RESERVED"].includes(o.status) && (
                        <button
                          onClick={() => {
                            if (confirm("Hủy đơn hàng này?"))
                              void save("orders/" + o.id + "/cancel", "POST");
                          }}
                        >
                          Hủy đơn
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "users" && Array.isArray(data) && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u: any) => (
                  <tr key={u.id}>
                    <td>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>{u.status}</td>
                    <td>
                      <button
                        disabled={u.id === user?.id}
                        onClick={() =>
                          void save("users/" + u.id + "/status", "PATCH", {
                            status: u.status === "ACTIVE" ? "LOCKED" : "ACTIVE",
                          })
                        }
                      >
                        {u.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
