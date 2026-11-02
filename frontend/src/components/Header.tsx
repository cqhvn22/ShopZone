"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Search,
  ShoppingCart,
  UserRound,
  MapPin,
  ChevronDown,
  Menu,
  Package,
  Heart,
  Headphones,
  Truck,
  X,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "./StoreProvider";
export function Header({ demo }: { demo: boolean }) {
  const { cart, user, logout } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(""),
    [menu, setMenu] = useState(false),
    [account, setAccount] = useState(false),
    [location, setLocation] = useState("Toàn quốc"),
    [showLocation, setShowLocation] = useState(false);
  useEffect(() => {
    if (!showLocation) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const controls = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>("button,select,a[href],input") ||
          [],
      );
    controls()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowLocation(false);
      if (event.key === "Tab") {
        const nodes = controls();
        const first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [showLocation]);
  return (
    <>
      <a href="#main-content" className="skip-link">
        Đi đến nội dung chính
      </a>
      {demo && (
        <div className="demo-strip">
          Bản xem thử giao diện · Sản phẩm và giá chỉ mang tính minh họa · Chưa
          mở bán
        </div>
      )}
      <header className="site-header">
        <div className="header-top container">
          <span>
            <Truck size={13} /> Mua sắm công nghệ, tiện lợi mỗi ngày
          </span>
          <nav aria-label="Liên kết hỗ trợ">
            <Link href="/thong-tin/gioi-thieu">Về ShopZone</Link>
            <Link href="/thong-tin/huong-dan-mua-hang">Hướng dẫn mua hàng</Link>
            <Link href="/thong-tin/lien-he">
              <Headphones size={13} /> Hỗ trợ khách hàng
            </Link>
          </nav>
        </div>
        <div className="header-main container">
          <Link href="/" className="logo" aria-label="ShopZone — Trang chủ">
            Shop<span>Zone</span>
            <small>MUA SẮM THẬT DỄ</small>
          </Link>
          <form
            className="search-box"
            action="/san-pham"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(
                "/san-pham" +
                  (query.trim()
                    ? "?q=" + encodeURIComponent(query.trim())
                    : ""),
              );
            }}
            role="search"
          >
            <input
              aria-label="Tìm kiếm sản phẩm"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bạn cần tìm gì hôm nay?"
            />
            <button aria-label="Tìm kiếm" type="submit">
              <Search size={21} />
              <span>Tìm kiếm</span>
            </button>
          </form>
          <div className="header-account">
            <button
              className="account-trigger"
              aria-label={
                user
                  ? "Tài khoản của " + user.fullName
                  : "Tài khoản và đăng nhập"
              }
              onClick={() => setAccount(!account)}
              aria-expanded={account}
            >
              <UserRound size={27} />
              <span>
                <small>{user ? "Xin chào," : "Đăng nhập / Đăng ký"}</small>
                <b>
                  {user ? user.fullName.split(" ").at(-1) : "Tài khoản"}{" "}
                  <ChevronDown size={12} />
                </b>
              </span>
            </button>
            {account && (
              <div className="account-menu">
                {!user ? (
                  <>
                    <Link onClick={() => setAccount(false)} href="/dang-nhap">
                      Đăng nhập
                    </Link>
                    <Link onClick={() => setAccount(false)} href="/dang-ky">
                      Tạo tài khoản mới
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/don-hang" onClick={() => setAccount(false)}>
                      <Package size={16} /> Đơn hàng của tôi
                    </Link>
                    {user.roles.includes("ADMIN") && (
                      <Link onClick={() => setAccount(false)} href="/quan-tri">
                        <ShieldCheck size={16} /> Quản trị cửa hàng
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        void logout();
                        setAccount(false);
                      }}
                    >
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <Link className="cart-header" href="/gio-hang">
            <span className="cart-icon">
              <ShoppingCart size={29} />
              <b aria-label="Số sản phẩm trong giỏ">
                {cart.reduce((n, x) => n + x.quantity, 0)}
              </b>
            </span>
            <span>Giỏ hàng</span>
          </Link>
        </div>
        <div className="header-bottom container">
          <button
            className="all-category"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
          >
            <Menu size={19} /> DANH MỤC SẢN PHẨM <ChevronDown size={13} />
          </button>
          <nav aria-label="Danh mục nhanh">
            <Link href="/danh-muc/dien-thoai">Điện thoại</Link>
            <Link href="/danh-muc/laptop">Laptop</Link>
            <Link href="/danh-muc/tai-nghe">Tai nghe & Loa</Link>
            <Link href="/danh-muc/dong-ho">Đồng hồ</Link>
            <Link href="/danh-muc/phu-kien">Phụ kiện</Link>
          </nav>
          <button
            className="location-trigger"
            onClick={() => setShowLocation(true)}
          >
            <MapPin size={15} /> Giao đến: <b>{location}</b>
            <ChevronDown size={12} />
          </button>
        </div>
        {menu && (
          <nav
            className="mobile-category-menu container"
            aria-label="Tất cả danh mục"
          >
            {[
              ["dien-thoai", "Điện thoại"],
              ["laptop", "Laptop"],
              ["tai-nghe", "Tai nghe & Loa"],
              ["dong-ho", "Đồng hồ thông minh"],
              ["phu-kien", "Phụ kiện"],
            ].map(([slug, name]) => (
              <Link
                onClick={() => setMenu(false)}
                key={slug}
                href={"/danh-muc/" + slug}
              >
                {name}
              </Link>
            ))}
          </nav>
        )}
      </header>
      {showLocation && (
        <div className="modal-backdrop" onClick={() => setShowLocation(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-title"
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Đóng"
              onClick={() => setShowLocation(false)}
            >
              <X size={22} />
            </button>
            <h2 id="location-title">Khu vực giao hàng</h2>
            <p>Chọn khu vực để chuẩn bị địa chỉ nhận hàng.</p>
            <select
              aria-label="Chọn tỉnh thành"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {[
                "Toàn quốc",
                "TP. Hồ Chí Minh",
                "Hà Nội",
                "Đà Nẵng",
                "Cần Thơ",
                "Hải Phòng",
                "Tỉnh thành khác",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <button
              className="btn primary"
              onClick={() => setShowLocation(false)}
            >
              Xác nhận
            </button>
          </section>
        </div>
      )}
      <nav className="mobile-bottom-nav" aria-label="Điều hướng di động">
        <Link className={pathname === "/" ? "active" : ""} href="/">
          Trang chủ
        </Link>
        <Link href="/san-pham">
          <Search size={20} />
          Tìm kiếm
        </Link>
        <Link href="/yeu-thich">
          <Heart size={20} />
          Yêu thích
        </Link>
        <Link href="/gio-hang">
          <ShoppingCart size={20} />
          Giỏ hàng
        </Link>
        <Link href="/don-hang">
          <Package size={20} />
          Đơn hàng
        </Link>
      </nav>
    </>
  );
}
