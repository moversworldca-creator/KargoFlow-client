export function createSmsPrintHtml(text) {
  const escapedText = String(text ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title></title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body {
      padding: 12mm;
      color: #0b2948;
      font-family: Arial, sans-serif;
      font-size: 14px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
  </style>
</head>
<body><pre>${escapedText}</pre></body>
</html>`;
}

export function printHtmlInIsolatedFrame(html) {
  const iframe = document.createElement("iframe");
  iframe.title = "Template print frame";
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "794px",
    height: "1123px",
    border: "0",
    display: "block",
    visibility: "visible",
    pointerEvents: "none",
  });
  document.body.appendChild(iframe);

  const printDocument = iframe.contentDocument;
  const printWindow = iframe.contentWindow;
  if (!printDocument || !printWindow) {
    iframe.remove();
    throw new Error("Unable to create the template print frame.");
  }

  printWindow.addEventListener("afterprint", () => iframe.remove(), { once: true });
  printDocument.open();
  printDocument.write(html);
  printDocument.close();

  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 150);
}
