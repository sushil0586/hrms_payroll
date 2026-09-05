export default function HrAdminLoading() {
  return (
    <main className="shell app-loading-shell">
      <section className="page-header-surface page-header-surface--compact loading-card">
        <div className="loading-line loading-line--eyebrow" />
        <div className="loading-line loading-line--title" />
        <div className="loading-line loading-line--copy" />
        <div className="loading-actions">
          <div className="loading-pill" />
          <div className="loading-pill" />
        </div>
      </section>

      <section className="metric-grid-modern">
        {Array.from({ length: 4 }).map((_, index) => (
          <article className="metric-tile loading-card" key={index}>
            <div className="loading-line loading-line--label" />
            <div className="loading-line loading-line--metric" />
            <div className="loading-line loading-line--tiny" />
          </article>
        ))}
      </section>

      <section className="queue-layout">
        <article className="queue-toolbar loading-card">
          <div className="loading-line loading-line--label" />
          <div className="loading-toolbar-grid">
            <div className="loading-line loading-line--input" />
            <div className="loading-line loading-line--input" />
            <div className="loading-pill" />
          </div>
        </article>

        <div className="queue-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <article className="record-card loading-card" key={index}>
              <div className="loading-line loading-line--record-title" />
              <div className="detail-grid">
                <div className="loading-line loading-line--detail" />
                <div className="loading-line loading-line--detail" />
                <div className="loading-line loading-line--detail" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
