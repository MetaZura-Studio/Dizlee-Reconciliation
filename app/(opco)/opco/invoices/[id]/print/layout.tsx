export default function InvoicePrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        @media print {
          aside {
            display: none !important;
          }

          main {
            padding: 0 !important;
          }
        }
      `}</style>
      <div className="-m-8 min-h-screen bg-white p-8 print:m-0 print:p-0">{children}</div>
    </>
  );
}
