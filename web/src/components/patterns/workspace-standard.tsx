import type { ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "neutral";

type WorkspaceStandardHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export function WorkspaceStandardHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className = "",
}: WorkspaceStandardHeaderProps) {
  return (
    <section className={`workspace-standard-header${className ? ` ${className}` : ""}`}>
      <div className="workspace-standard-header__content">
        {eyebrow ? <span className="workspace-standard-header__eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="workspace-standard-header__actions">{actions}</div> : null}
      {meta ? <div className="workspace-standard-header__meta">{meta}</div> : null}
    </section>
  );
}

type WorkspaceStandardPanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function WorkspaceStandardPanel({
  title,
  description,
  actions,
  meta,
  children,
  className = "",
}: WorkspaceStandardPanelProps) {
  return (
    <section className={`workspace-standard-panel${className ? ` ${className}` : ""}`}>
      {(title || description || actions || meta) ? (
        <header className="workspace-standard-panel__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {meta ? <div className="workspace-standard-panel__meta">{meta}</div> : null}
          {actions ? <div className="workspace-standard-panel__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="workspace-standard-panel__body">{children}</div>
    </section>
  );
}

export function WorkspaceFilterBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`workspace-filter-bar${className ? ` ${className}` : ""}`}>{children}</div>;
}

type WorkspaceDataTableProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function WorkspaceDataTable({ children, className = "", ariaLabel }: WorkspaceDataTableProps) {
  return (
    <div className={`workspace-data-table${className ? ` ${className}` : ""}`}>
      <table aria-label={ariaLabel}>{children}</table>
    </div>
  );
}

export function WorkspaceStatusBadge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <span className={`workspace-status-badge workspace-status-badge--${tone}${className ? ` ${className}` : ""}`}>{children}</span>;
}

export function WorkspaceFormFooter({
  note,
  children,
  fixed = false,
  className = "",
}: {
  note?: ReactNode;
  children: ReactNode;
  fixed?: boolean;
  className?: string;
}) {
  return (
    <footer className={`workspace-form-footer${fixed ? " workspace-form-footer--fixed" : ""}${className ? ` ${className}` : ""}`}>
      {note ? <span className="workspace-form-footer__note">{note}</span> : null}
      <div className="workspace-form-footer__actions">{children}</div>
    </footer>
  );
}

export function WorkspaceDialogFrame({
  title,
  description,
  children,
  footer,
  onClose,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div className="workspace-dialog-backdrop" role="presentation">
      <section aria-label={title} aria-modal="true" className={`workspace-dialog-frame${className ? ` ${className}` : ""}`} role="dialog">
        <header className="workspace-dialog-frame__header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {onClose ? (
            <button aria-label={`Close ${title}`} className="workspace-dialog-frame__close" onClick={onClose} type="button">
              ×
            </button>
          ) : null}
        </header>
        <div className="workspace-dialog-frame__body">{children}</div>
        {footer ? <footer className="workspace-dialog-frame__footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
