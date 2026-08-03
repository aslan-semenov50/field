import type { ReactNode } from 'react';

interface HeaderProps {
  action?: ReactNode;
  description: ReactNode;
  eyebrow: ReactNode;
  platformHeading?: boolean;
  title: ReactNode;
}

export function Header({
  action,
  description,
  eyebrow,
  platformHeading = false,
  title,
}: HeaderProps) {
  const heading = (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-description">{description}</p>
    </>
  );

  return (
    <header className={platformHeading ? 'platform-heading' : undefined}>
      {platformHeading ? <div>{heading}</div> : heading}
      {action}
    </header>
  );
}

