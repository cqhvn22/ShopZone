"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Plug,
  Package,
  Gift,
  Heart,
  Truck,
  ShieldCheck,
} from "lucide-react";
const slides = [
  {
    tag: "THÁNG CÔNG NGHỆ",
    title: (
      <>
        NÂNG CẤP MỚI
        <br />
        GIÁ HỜI HƠN
      </>
    ),
    desc: "Điện thoại bạn thích. Mức giá bạn yêu.",
    to: "/danh-muc/dien-thoai",
    button: "Săn ưu đãi ngay",
    image: "/images/products/iphone-13-pro.webp",
    className: "peach",
  },
  {
    tag: "LÀM VIỆC & SÁNG TẠO",
    title: (
      <>
        LAPTOP XỊN
        <br />
        BẮT NHỊP MỚI
      </>
    ),
    desc: "Hiệu năng cho mọi ý tưởng của bạn.",
    to: "/danh-muc/laptop",
    button: "Chọn laptop ngay",
    image: "/images/products/apple-macbook-pro-14-inch-space-grey.webp",
    className: "blue",
  },
  {
    tag: "THẾ GIỚI ÂM THANH",
    title: (
      <>
        CHẠM GIAI ĐIỆU
        <br />
        ĐÚNG CHẤT RIÊNG
      </>
    ),
    desc: "Tai nghe và loa cho từng khoảnh khắc.",
    to: "/danh-muc/tai-nghe",
    button: "Khám phá ngay",
    image: "/images/products/apple-airpods-max-silver.webp",
    className: "pink",
  },
];
export function HomePromotions() {
  const [index, setIndex] = useState(0);
  const s = slides[index];
  return (
    <>
      <section className="hero-layout" aria-label="Khuyến mãi nổi bật">
        <aside className="category-sidebar">
          <h2>
            <Package size={17} /> Khám phá danh mục
          </h2>
          {[
            [Smartphone, "Điện thoại", "dien-thoai"],
            [Laptop, "Laptop", "laptop"],
            [Headphones, "Tai nghe & Loa", "tai-nghe"],
            [Watch, "Đồng hồ thông minh", "dong-ho"],
            [Plug, "Phụ kiện công nghệ", "phu-kien"],
          ].map(([Icon, label, slug]: any) => (
            <Link href={"/danh-muc/" + slug} key={slug}>
              <Icon size={20} />
              <span>{label}</span>
              <ChevronRight size={14} />
            </Link>
          ))}
          <div className="sidebar-divider" />
          <Link href="/san-pham?sort=discount">
            <Gift size={20} />
            <span>Sản phẩm ưu đãi</span>
            <ChevronRight size={14} />
          </Link>
          <Link href="/yeu-thich">
            <Heart size={20} />
            <span>Sản phẩm yêu thích</span>
            <ChevronRight size={14} />
          </Link>
          <div className="sidebar-help">
            <b>Mua sắm dễ dàng hơn</b>
            <p>
              Chọn sản phẩm. Thêm vào giỏ.
              <br />
              ShopZone lo phần còn lại.
            </p>
            <Link href="/thong-tin/huong-dan-mua-hang">
              Xem hướng dẫn <ArrowRight size={13} />
            </Link>
          </div>
        </aside>
        <div className="main-promotion">
          <div className={"hero-slide " + s.className}>
            <div className="hero-copy" key={"copy-" + index}>
              <span className="hero-kicker">{s.tag}</span>
              <h2>{s.title}</h2>
              <p>{s.desc}</p>
              <Link href={s.to} className="hero-cta">
                {s.button} <ArrowRight size={16} />
              </Link>
              <div className="hero-fineprint">
                Cùng ShopZone chọn công nghệ phù hợp
              </div>
            </div>
            <div className="hero-art" key={"art-" + index}>
              <div className="hero-orbit" />
              <Image
                src={s.image}
                alt={
                  index === 0
                    ? "Điện thoại iPhone 13 Pro"
                    : index === 1
                      ? "Laptop MacBook Pro 14 inch"
                      : "Tai nghe AirPods Max"
                }
                width={380}
                height={330}
                priority
                sizes="(max-width:700px) 45vw, 340px"
              />
              <span className="hero-sticker">
                DEAL
                <br />
                <b>CỰC HỜI</b>
              </span>
            </div>
            <button
              className="hero-arrow prev"
              aria-label="Banner trước"
              onClick={() => setIndex((index + 2) % 3)}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="hero-arrow next"
              aria-label="Banner tiếp theo"
              onClick={() => setIndex((index + 1) % 3)}
            >
              <ChevronRight size={20} />
            </button>
            <div className="hero-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={"Xem banner " + (i + 1)}
                  aria-current={index === i}
                />
              ))}
            </div>
          </div>
          <div className="hero-tab-row">
            {[
              "Điện thoại giá tốt",
              "Laptop cho ngày mới",
              "Phụ kiện đáng sắm",
            ].map((x, i) => (
              <button
                className={index === i ? "active" : ""}
                key={x}
                onClick={() => setIndex(i)}
              >
                {x}
              </button>
            ))}
          </div>
        </div>
        <aside className="side-promotions">
          <Link href="/danh-muc/laptop" className="mini-promo laptop-promo">
            <div>
              <small>HỌC TẬP & LÀM VIỆC</small>
              <h2>
                Đúng laptop.
                <br />
                Đúng nhu cầu.
              </h2>
              <span>Khám phá ngay →</span>
            </div>
            <Image
              src="/images/products/new-dell-xps-13-9300-laptop.webp"
              alt="Dell XPS 13"
              width={160}
              height={130}
            />
          </Link>
          <Link href="/danh-muc/tai-nghe" className="mini-promo audio-promo">
            <div>
              <small>PHỤ KIỆN YÊU THÍCH</small>
              <h2>
                Thêm cảm hứng
                <br />
                mỗi ngày.
              </h2>
              <span>Xem bộ sưu tập →</span>
            </div>
            <Image
              src="/images/products/apple-airpods.webp"
              alt="Tai nghe Apple AirPods"
              width={130}
              height={125}
            />
          </Link>
        </aside>
      </section>
      <section className="quick-categories" aria-label="Mua theo danh mục">
        {[
          [Smartphone, "Điện thoại", "dien-thoai", "orange"],
          [Laptop, "Laptop", "laptop", "blue"],
          [Headphones, "Tai nghe & Loa", "tai-nghe", "pink"],
          [Watch, "Đồng hồ", "dong-ho", "purple"],
          [Plug, "Phụ kiện", "phu-kien", "teal"],
          [Gift, "Ưu đãi hôm nay", null, "red"],
        ].map(([Icon, label, slug, color]: any) => (
          <Link
            key={label}
            href={slug ? "/danh-muc/" + slug : "/san-pham?sort=discount"}
          >
            <span className={"category-circle " + color}>
              <Icon size={28} />
            </span>
            <b>{label}</b>
          </Link>
        ))}
      </section>
    </>
  );
}
