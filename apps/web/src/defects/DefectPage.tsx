// Stand-in target for defect links; the real defect page belongs to another story.
export default function DefectPage({ id }: { id: string }) {
  return (
    <main className="dashboard-content">
      <div className="page" data-layout="split">
        <header className="page-header">
          <div className="stack-sm">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <a className="btn btn-ghost btn-sm" href="#/">
                My work
              </a>
            </nav>
            <h1 className="page-title dash-id">{id}</h1>
          </div>
        </header>
      </div>
    </main>
  );
}
