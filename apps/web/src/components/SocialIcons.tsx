import { cn } from "@camacho-pos/ui";

const LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
  twitter: "X",
  tiktok: "TikTok",
};

function Icon({ platform }: { platform: string }) {
  const key = platform.toLowerCase();
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true as const };
  if (key === "facebook") {
    return (
      <svg {...common}>
        <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1Z" />
      </svg>
    );
  }
  if (key === "instagram") {
    return (
      <svg {...common}>
        <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 4.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5Zm6.2-.9a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1ZM12 9.2A2.8 2.8 0 1 1 9.2 12 2.8 2.8 0 0 1 12 9.2Z" />
      </svg>
    );
  }
  if (key === "youtube") {
    return (
      <svg {...common}>
        <path d="M23 12.2s0-3.2-.4-4.7c-.2-1-1-1.7-1.9-1.9C18.9 5.2 12 5.2 12 5.2s-6.9 0-8.7.4c-.9.2-1.7 1-1.9 1.9C1 9 1 12.2 1 12.2s0 3.2.4 4.7c.2 1 1 1.7 1.9 1.9 1.8.4 8.7.4 8.7.4s6.9 0 8.7-.4c.9-.2 1.7-1 1.9-1.9.4-1.5.4-4.7.4-4.7ZM9.8 15.5V8.9l5.9 3.3-5.9 3.3Z" />
      </svg>
    );
  }
  if (key === "linkedin") {
    return (
      <svg {...common}>
        <path d="M6.5 9.5H3.7V20h2.8V9.5ZM5.1 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM20.3 20h-2.8v-5.6c0-1.5-.5-2.5-1.8-2.5-1 0-1.5.7-1.8 1.3-.1.2-.1.5-.1.8V20h-2.8s0-9.2 0-10.5h2.8v1.5c.4-.6 1.1-1.7 2.9-1.7 2.1 0 3.6 1.4 3.6 4.3V20Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function SocialIcons({
  links,
  tone = "onLight",
  className,
}: {
  links: Array<{ platform: string; url: string }>;
  tone?: "onLight" | "onDark";
  className?: string;
}) {
  const list =
    links.length > 0
      ? links
      : [
          { platform: "facebook", url: "https://www.facebook.com/" },
          { platform: "instagram", url: "https://www.instagram.com/" },
          { platform: "youtube", url: "https://www.youtube.com/" },
          { platform: "linkedin", url: "https://www.linkedin.com/" },
        ];

  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {list.map((link) => {
        const label = LABELS[link.platform.toLowerCase()] ?? link.platform;
        return (
          <li key={`${link.platform}-${link.url}`}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className={cn(
                "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border transition",
                tone === "onDark"
                  ? "border-white/25 text-white hover:border-[var(--yellow)] hover:bg-white/10 hover:text-[var(--yellow)]"
                  : "border-[var(--border)] bg-white text-[var(--navy)] hover:border-[var(--teal)] hover:text-[var(--teal)]",
              )}
            >
              <Icon platform={link.platform} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
