export default function InvoicePrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        @media print {
          html, body {
            background: white !important;
          }

          aside,
          header,
          nav,
          [data-print-hide] {
            display: none !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }

          @page {
            margin: 12mm;
          }
        }
      `}</style>
      <div className="-m-8 min-h-screen bg-white p-8 text-zinc-900 print:m-0 print:min-h-0 print:bg-white print:p-0">
        {children}
      </div>
    </>
  );
}
