"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container empty-state">
      <h1>Trang tạm thời chưa tải được</h1>
      <p>Vui lòng thử lại trong giây lát.</p>
      <button className="btn primary" onClick={reset}>
        Thử lại
      </button>
    </div>
  );
}
