import { CheckCircle2 } from "lucide-react";
import { useId, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../components/ui/utils";

export function SetupActionGroup({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx("setup-action-group", className)}>{children}</div>;
}

export function SetupSectionHeader({
  id,
  title,
  description,
  meta,
  actions,
  headingLevel = 2,
  className,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return <header className={cx("setup-section-header", className)}>
    <div className="setup-section-header__copy">
      <div className="setup-section-header__title-line">
        <Heading id={id} className={headingLevel === 3 ? "ui-subsection-title" : "ui-section-title"}>{title}</Heading>
        {meta ? <div className="setup-section-header__meta">{meta}</div> : null}
      </div>
      {description ? <p className="setup-section-header__description">{description}</p> : null}
    </div>
    {actions ? <div className="setup-section-header__actions">{actions}</div> : null}
  </header>;
}

export function SetupSection({
  title,
  description,
  meta,
  actions,
  children,
  className,
  headingLevel = 2,
  ...props
}: {
  title?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  headingLevel?: 2 | 3;
} & Omit<HTMLAttributes<HTMLElement>, "title" | "children">) {
  const id = useId();
  return <section {...props} className={cx("setup-section", className)} aria-labelledby={title ? id : undefined}>
    {title ? <SetupSectionHeader id={id} title={title} description={description} meta={meta} actions={actions} headingLevel={headingLevel} /> : null}
    <div className="setup-section__body">{children}</div>
  </section>;
}

export function SetupOutcome({
  title,
  children,
  tone = "neutral",
  actions,
  className,
  ...props
}: {
  title: ReactNode;
  children?: ReactNode;
  tone?: "neutral" | "ready" | "attention" | "blocked";
  actions?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "title" | "children">) {
  return <div {...props} className={cx("setup-outcome", className)} data-tone={tone}>
    <div className="setup-outcome__copy">
      <h2 className="ui-subsection-title">{tone === "ready" ? <CheckCircle2 size={18} aria-hidden="true" /> : null}{title}</h2>
      {children ? <div className="setup-outcome__description">{children}</div> : null}
    </div>
    {actions ? <div className="setup-outcome__actions">{actions}</div> : null}
  </div>;
}

export function SetupNotice({
  title,
  children,
  tone = "neutral",
  actions,
  className,
  ...props
}: {
  title?: ReactNode;
  children: ReactNode;
  tone?: "neutral" | "ready" | "attention" | "blocked";
  actions?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "title" | "children">) {
  return <div {...props} className={cx("setup-notice", className)} data-tone={tone} role={tone === "blocked" ? "alert" : props.role}>
    <div className="setup-notice__copy">
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
    {actions ? <div className="setup-notice__actions">{actions}</div> : null}
  </div>;
}
