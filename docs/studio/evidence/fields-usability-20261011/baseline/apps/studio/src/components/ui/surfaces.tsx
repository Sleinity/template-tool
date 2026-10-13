import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "./utils";

type SurfaceElement = "div" | "section" | "aside" | "article";

export function Surface({
  as: Component = "div",
  tone = "primary",
  className,
  children,
  ...props
}: {
  as?: SurfaceElement;
  tone?: "primary" | "secondary" | "raised";
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Component
      {...props}
      className={cx("ui-surface", className)}
      data-tone={tone}
    >
      {children}
    </Component>
  );
}

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details className={cx("ui-disclosure", className)} open={defaultOpen}>
      <summary className="ui-disclosure__summary">{summary}</summary>
      <div className="ui-disclosure__content">{children}</div>
    </details>
  );
}

export function Menu({
  label,
  accessibleLabel,
  children,
  className,
  panelRole = "menu",
  panelLabel,
  disabled = false,
  onClose,
}: {
  label: ReactNode;
  accessibleLabel: string;
  children: ReactNode;
  className?: string;
  panelRole?: "menu" | "group";
  panelLabel?: string;
  disabled?: boolean;
  onClose?(): void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    placement: "above" | "below";
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    setPosition(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
    onClose?.();
  }, [onClose]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const inset = 8;
    const gap = 8;
    const spaceBelow = window.innerHeight - triggerRect.bottom - inset;
    const spaceAbove = triggerRect.top - inset;
    const placement = spaceBelow >= panelRect.height + gap || spaceBelow >= spaceAbove
      ? "below"
      : "above";
    const idealTop = placement === "below"
      ? triggerRect.bottom + gap
      : triggerRect.top - panelRect.height - gap;
    setPosition({
      left: Math.min(
        Math.max(inset, triggerRect.right - panelRect.width),
        Math.max(inset, window.innerWidth - panelRect.width - inset),
      ),
      top: Math.min(
        Math.max(inset, idealTop),
        Math.max(inset, window.innerHeight - panelRect.height - inset),
      ),
      placement,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = requestAnimationFrame(() => {
      updatePosition();
      panelRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
        ?.focus();
    });
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const resize = new ResizeObserver(updatePosition);
    if (panelRef.current) resize.observe(panelRef.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resize.disconnect();
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  const panelStyle: CSSProperties = {
    left: position?.left ?? 0,
    top: position?.top ?? 0,
    visibility: position ? "visible" : "hidden",
  };

  return (
    <div className={cx("ui-menu", className)}>
      <button
        ref={triggerRef}
        type="button"
        className="ui-menu__trigger"
        aria-label={accessibleLabel}
        aria-haspopup={panelRole === "menu" ? "menu" : undefined}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        onClick={() => open ? close() : setOpen(true)}
      >
        {label}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              className="ui-menu__panel"
              role={panelRole}
              aria-label={panelLabel}
              data-placement={position?.placement}
              style={panelStyle}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('[role="menuitem"]:not([data-keep-open])')) {
                  close(true);
                }
              }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function MenuItem({
  children,
  destructive = false,
  onClick,
  closeOnSelect = true,
  disabled = false,
  autoFocus,
}: {
  children: ReactNode;
  destructive?: boolean;
  onClick?: () => void;
  closeOnSelect?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="ui-menu__item"
      data-destructive={destructive || undefined}
      data-keep-open={!closeOnSelect || undefined}
      disabled={disabled}
      autoFocus={autoFocus}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
