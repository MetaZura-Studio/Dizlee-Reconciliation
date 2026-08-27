type ReportFilenameLinkProps = {
  filename: string | null | undefined;
  href?: string;
  onClick?: () => void;
  className?: string;
};

const linkClassName =
  "text-left text-foreground underline decoration-foreground-subtle underline-offset-2 hover:text-foreground hover:decoration-foreground";

export function ReportFilenameLink({
  filename,
  href,
  onClick,
  className = "",
}: ReportFilenameLinkProps) {
  if (!filename) {
    return <span className={className}>—</span>;
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkClassName} ${className}`}
        title="Open original uploaded file"
      >
        {filename}
      </a>
    );
  }

  if (!onClick) {
    return <span className={className}>{filename}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${linkClassName} ${className}`}
      title="View raw uploaded file"
    >
      {filename}
    </button>
  );
}
