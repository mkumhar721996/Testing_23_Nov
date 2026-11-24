export default function TopBar() {
  return (
    <header className="top-bar">
      <button className="btn btn-ghost btn-icon" type="button" aria-label="Menu" title="Menu">
        <svg className="icon" aria-hidden="true">
          <use href="#i-menu" />
        </svg>
      </button>
      <span className="brand">
        <span className="brand-mark" aria-hidden="true">
          P
        </span>
        <span>Product</span>
      </span>
    </header>
  );
}
