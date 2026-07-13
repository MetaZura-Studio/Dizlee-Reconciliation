type ReportFilenameLinkProps = {
  filename: string | null | undefined;
  onClick?: () => void;
  className?: string;
};

export function ReportFilenameLink({
  filename,
  onClick,
  className = "",
}: ReportFilenameLinkProps) {
  if (!filename) {
    return <span className={className}>—</span>;
  }

  if (!onClick) {
    return <span className={className}>{filename}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left text-foreground underline decoration-foreground-subtle underline-offset-2 hover:text-foreground hover:decoration-foreground ${className}`}
      title="Review report data"
    >
      {filename}
    </button>
  );
}
