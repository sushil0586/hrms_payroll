import Link from "next/link";

type PublicAuthFrameProps = {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
};

const accessSteps = [
  ["01", "Sign in once", "Accerio resolves the permitted workspace after authentication."],
  ["02", "See only assigned work", "Navigation and actions follow tenant permissions and role scope."],
  ["03", "Keep a durable record", "Confirmed administrative changes retain traceable evidence."],
];

export function PublicAuthFrame({
  children,
  eyebrow = "One secure identity",
  title = "Your work opens in the right workspace.",
  description = "Employees, managers, HR, finance and administrators use one account. Access follows the roles assigned by your organization.",
}: PublicAuthFrameProps) {
  return (
    <main className="shell public-access-page">
      <section className="public-access-story">
        <Link className="public-brand public-brand--inverse" href="/" aria-label="Accerio HRMS home">
          <span className="public-brand__mark">A</span>
          <h1>Accerio HRMS</h1>
        </Link>
        <div className="public-access-story__copy">
          <span className="public-eyebrow public-eyebrow--inverse">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
          <div className="public-access-steps">
            {accessSteps.map(([index, stepTitle, stepDescription]) => (
              <div className="public-access-step" key={index}>
                <span>{index}</span>
                <div>
                  <strong>{stepTitle}</strong>
                  <small>{stepDescription}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
        <span className="public-access-story__footer">Private, tenant-scoped access · Accerio HRMS</span>
      </section>
      <section className="public-access-main">
        <div className="public-access-wrap">
          <Link className="public-access-back" href="/">← Back to Accerio</Link>
          {children}
        </div>
      </section>
    </main>
  );
}
