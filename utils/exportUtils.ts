import { Business } from "../types";

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (businesses: Business[]) => {
  const headers = ["Name", "Phone", "Address", "Rating", "Website", "Description", "Map Link"];
  const rows = businesses.map(b => [
    `"${b.name.replace(/"/g, '""')}"`,
    `"${b.phone}"`,
    `"${b.address.replace(/"/g, '""')}"`,
    `"${b.rating}"`,
    `"${b.website}"`,
    `"${b.description.replace(/"/g, '""')}"`,
    `"${b.mapLink}"`
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.join(","))
  ].join("\n");

  downloadFile(csvContent, `leads_${Date.now()}.csv`, "text/csv;charset=utf-8;");
};

export const exportToVCF = (businesses: Business[]) => {
  let vcfContent = "";
  businesses.forEach(b => {
    vcfContent += "BEGIN:VCARD\nVERSION:3.0\n";
    vcfContent += `FN:${b.name}\n`;
    vcfContent += `ORG:${b.name}\n`;
    if (b.phone && b.phone !== 'N/A') vcfContent += `TEL;TYPE=WORK,VOICE:${b.phone}\n`;
    if (b.address && b.address !== 'N/A') vcfContent += `ADR;TYPE=WORK:;;${b.address.replace(/,/g, ';')}\n`;
    if (b.website && b.website !== 'N/A') vcfContent += `URL:${b.website}\n`;
    vcfContent += `NOTE:Rating: ${b.rating}. ${b.description}\n`;
    vcfContent += "END:VCARD\n";
  });
  
  downloadFile(vcfContent, `leads_${Date.now()}.vcf`, "text/vcard;charset=utf-8;");
};

export const exportToWord = (businesses: Business[]) => {
  // Simple HTML structure that Word interprets
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Exported Leads</title></head>
    <body>
      <h1>Business Leads Export</h1>
      ${businesses.map(b => `
        <div style="border-bottom: 1px solid #ccc; padding: 10px; margin-bottom: 10px;">
          <h2 style="color: #166534;">${b.name}</h2>
          <p><strong>Phone:</strong> ${b.phone}</p>
          <p><strong>Address:</strong> ${b.address}</p>
          <p><strong>Rating:</strong> ${b.rating}</p>
          <p><strong>Website:</strong> <a href="${b.website}">${b.website}</a></p>
          <p><em>${b.description}</em></p>
        </div>
      `).join('')}
    </body>
    </html>
  `;
  
  downloadFile(htmlContent, `leads_${Date.now()}.doc`, "application/msword");
};
