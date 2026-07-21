import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { ImageOff } from "lucide-react";
import { useState } from "react";
import { cx } from "./utils";

export const TemplatePreviewStage = forwardRef<HTMLDivElement, {
  tone?: "dark" | "light" | "neutral";
  size?: "compact" | "standard" | "fill";
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>>(function TemplatePreviewStage({
  tone = "light",
  size = "standard",
  className,
  children,
  ...props
}, ref) {
  return (
    <div
      {...props}
      ref={ref}
      className={cx("template-preview-stage", className)}
      data-tone={tone}
      data-size={size}
    >
      {children}
    </div>
  );
});

export function TemplateThumbnailStage({
  name,
  src,
  loading = false,
  className,
}: {
  name: string;
  src?: string;
  loading?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = Boolean(src) && !failed;
  const state = failed ? "broken" : loading ? "loading" : showImage ? "ready" : "missing";

  return (
    <div className={cx("template-thumbnail", className)} data-state={state}>
      {showImage ? (
        <>
          {!loaded ? (
            <div className="template-thumbnail__fallback template-thumbnail__fallback--loading">
              <span>Loading preview</span>
            </div>
          ) : null}
          <img
            src={src}
            alt={`${name} preview`}
            className="template-thumbnail__image"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            data-loaded={loaded || undefined}
          />
        </>
      ) : (
        <div className="template-thumbnail__fallback">
          <ImageOff aria-hidden="true" size={24} />
          <span>{loading ? "Loading preview" : failed ? "Preview could not be loaded" : "Preview unavailable"}</span>
        </div>
      )}
    </div>
  );
}

export function PreviewWorkspace({
  header,
  toolbar,
  actions,
  overlay,
  children,
  className,
  stageClassName,
}: {
  header?: ReactNode;
  toolbar?: ReactNode;
  actions?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
  className?: string;
  stageClassName?: string;
}) {
  return (
    <section className={cx("preview-workspace", className)}>
      {header ? <header className="preview-workspace__header">{header}</header> : null}
      <div className={cx("preview-workspace__stage", stageClassName)}>
        <div className="preview-workspace__canvas">{children}</div>
        {toolbar ? <div className="preview-workspace__toolbar">{toolbar}</div> : null}
        {actions ? <div className="preview-workspace__actions">{actions}</div> : null}
      </div>
      {overlay}
    </section>
  );
}
