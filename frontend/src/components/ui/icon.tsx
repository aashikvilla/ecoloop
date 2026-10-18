import type { SVGProps } from "react";

const paths: Record<string, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,
  organization: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2M10 20v-4h4v4"/></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8 10h8M8 14h8M8 18h5"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
  kitchen: <><path d="M4 4h16v16H4z"/><path d="M4 11h16M10 11v9"/></>,
  ask: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15ZM5 14l.6 1.4L7 16l-1.4.6L5 18l-.6-1.4L3 16l1.4-.6L5 14Z"/></>,
  shop: <><path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.5L20 9H6"/><circle cx="10" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></>,
  add: <><path d="M12 5v14M5 12h14"/></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  leaf: <><path d="M20 4c-8 0-13 3-13 9a6 6 0 0 0 6 6c6 0 9-5 7-15Z"/><path d="M4 20c2-5 6-8 11-11"/></>,
  settings: <><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1 1.1.9-1.2 2.1-1.4-.5a8 8 0 0 1-1.4.8l-.3 1.5h-2.4l-.3-1.5a8 8 0 0 1-1.4-.8l-1.4.5-1.2-2.1 1.1-.9a7 7 0 0 1 0-1.6l-1.1-.9 1.2-2.1 1.4.5a8 8 0 0 1 1.4-.8l.3-1.5h2.4l.3 1.5a8 8 0 0 1 1.4.8l1.4-.5 1.2 2.1-1.1.9a7 7 0 0 1 0 1.6Z"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3"/></>,
  edit: <><path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
};

export function Icon({ name, size = 22, className = "", ...props }: SVGProps<SVGSVGElement> & { name: string; size?: number }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>{paths[name] ?? paths.info}</svg>;
}
