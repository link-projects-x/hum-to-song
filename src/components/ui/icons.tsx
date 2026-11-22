import type { ReactNode } from 'react';

type TIconProps = {
  size?: number;
};

function LineIcon({
  size,
  strokeWidth = 2,
  children,
}: {
  size: number;
  strokeWidth?: number;
  children: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function MicIcon({ size = 16 }: TIconProps) {
  return (
    <LineIcon size={size}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </LineIcon>
  );
}

export function UploadIcon({ size = 16, strokeWidth = 2 }: TIconProps & { strokeWidth?: number }) {
  return (
    <LineIcon size={size} strokeWidth={strokeWidth}>
      <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />
    </LineIcon>
  );
}

export function NotesIcon({ size = 16 }: TIconProps) {
  return (
    <LineIcon size={size}>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </LineIcon>
  );
}

export function DownloadIcon({ size = 16 }: TIconProps) {
  return (
    <LineIcon size={size}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </LineIcon>
  );
}

export function ShuffleIcon({ size = 16 }: TIconProps) {
  return (
    <LineIcon size={size}>
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </LineIcon>
  );
}

export function LinkIcon({ size = 16 }: TIconProps) {
  return (
    <LineIcon size={size}>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </LineIcon>
  );
}

export function CheckIcon({ size = 16 }: TIconProps) {
  return (
    <LineIcon size={size}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </LineIcon>
  );
}

export function ChevronIcon({ size = 18 }: TIconProps) {
  return (
    <LineIcon size={size}>
      <path d="M9 6l6 6-6 6" />
    </LineIcon>
  );
}

export function PlayIcon({ size = 16 }: TIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
    </svg>
  );
}

export function StopIcon({ size = 16 }: TIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}

export function WaveIcon() {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" aria-hidden="true">
      <path
        d="M2 15c3 0 3-6 6-6s3 8 6 8 3-10 6-10 3 6 6 6 3-4 6-4 3 3 6 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoMark({ size = 48 }: TIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="47"
        height="47"
        rx="14"
        fill="var(--surface-logo)"
        stroke="var(--line-row)"
      />
      <path
        d="M9 25c1.8 0 2.2-7 4.2-7s2.3 10 4.4 10 2.1-6 4.1-6"
        fill="none"
        stroke="var(--track-hum)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="25.5" y="20" width="4" height="10" rx="2" fill="var(--accent)" />
      <rect x="31.5" y="14" width="4" height="16" rx="2" fill="var(--accent)" />
      <rect x="37.5" y="23" width="4" height="7" rx="2" fill="var(--accent)" />
    </svg>
  );
}

export function SongArt() {
  return (
    <svg width="220" height="64" viewBox="0 0 220 64" aria-hidden="true">
      <path
        d="M6 40c10 0 12-16 22-16s12 22 22 22 12-28 22-28 12 18 22 18"
        fill="none"
        stroke="var(--track-hum)"
        strokeOpacity="0.5"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M106 32h8M115 28l5 4-5 4"
        fill="none"
        stroke="var(--arrow)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="130" y="34" width="18" height="8" rx="3" fill="var(--accent)" fillOpacity="0.55" />
      <rect x="152" y="24" width="18" height="8" rx="3" fill="var(--accent)" fillOpacity="0.55" />
      <rect x="174" y="16" width="22" height="8" rx="3" fill="var(--accent)" fillOpacity="0.55" />
      <rect x="200" y="28" width="14" height="8" rx="3" fill="var(--accent)" fillOpacity="0.55" />
    </svg>
  );
}
