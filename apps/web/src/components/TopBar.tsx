import { useComingSoonDialog } from './ComingSoonDialog';

export default function TopBar() {
  const { show } = useComingSoonDialog();
  return (
    <header className="top-bar">
      <button
        className="btn btn-ghost btn-icon"
        type="button"
        aria-label="Menu"
        title="Menu"
        onClick={show}
      >
        <svg className="icon" aria-hidden="true">
          <use href="#i-menu" />
        </svg>
      </button>
      <button type="button" className="brand" aria-label="Product home" onClick={show}>
        <span className="brand-mark" aria-hidden="true">
          P
        </span>
        <span>Product</span>
      </button>
    </header>
  );
}
