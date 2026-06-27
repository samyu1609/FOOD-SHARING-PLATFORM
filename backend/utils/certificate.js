import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

const generateCertificate = async (user, title, certId, details) => {
  const certificatesDir = path.join(process.cwd(), 'certificates');
  
  if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
  }

  const filename = `certificate-${user._id}-${Date.now()}.pdf`;
  const filepath = path.join(certificatesDir, filename);

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // 1. Background Fill
  doc.rect(0, 0, 842, 595).fill('#fbfbfd');
  
  // 2. Elegant double borders
  doc.rect(20, 20, 802, 555).stroke('#1e3a8a').lineWidth(4); // Blue border
  doc.rect(28, 28, 786, 539).stroke('#10b981').lineWidth(1.5); // Green accent border

  // Corner decorations (simulated with line patterns)
  // Top Left
  doc.moveTo(23, 23).lineTo(50, 23).stroke('#1e3a8a').lineWidth(2);
  doc.moveTo(23, 23).lineTo(23, 50).stroke('#1e3a8a').lineWidth(2);
  // Top Right
  doc.moveTo(819, 23).lineTo(792, 23).stroke('#1e3a8a').lineWidth(2);
  doc.moveTo(819, 23).lineTo(819, 50).stroke('#1e3a8a').lineWidth(2);
  // Bottom Left
  doc.moveTo(23, 572).lineTo(50, 572).stroke('#1e3a8a').lineWidth(2);
  doc.moveTo(23, 572).lineTo(23, 545).stroke('#1e3a8a').lineWidth(2);
  // Bottom Right
  doc.moveTo(819, 572).lineTo(792, 572).stroke('#1e3a8a').lineWidth(2);
  doc.moveTo(819, 572).lineTo(819, 545).stroke('#1e3a8a').lineWidth(2);

  // 3. Header & Title
  doc.fontSize(38).fill('#1e3a8a');
  doc.text('CERTIFICATE OF ACHIEVEMENT', 0, 60, { align: 'center' });

  doc.fontSize(16).fill('#4b5563');
  doc.text('Presented by Hunger Bridge Platform', 0, 110, { align: 'center' });

  // Elegant divider line
  doc.moveTo(280, 135).lineTo(562, 135).stroke('#10b981').lineWidth(2);

  // 4. Recipient details
  doc.fontSize(18).fill('#374151');
  doc.text('This certificate is proudly awarded to', 0, 160, { align: 'center' });

  // Recipient Name
  doc.fontSize(32).fill('#dc2626');
  doc.text(user.name, 0, 195, { align: 'center', font: 'Helvetica-Bold' });

  // Organization Name if NGO / Ashram
  if (user.orgName) {
    doc.fontSize(16).fill('#4b5563');
    doc.text(`of ${user.orgName}`, 0, 240, { align: 'center' });
  }

  // 5. Achievement text
  doc.fontSize(16).fill('#1f2937');
  const levelText = `For successfully reaching the milestone of ${user.points} points`;
  doc.text(levelText, 0, user.orgName ? 270 : 255, { align: 'center' });

  doc.fontSize(22).fill('#047857');
  doc.text(`"${title}"`, 0, user.orgName ? 295 : 280, { align: 'center', font: 'Helvetica-Bold' });

  doc.fontSize(14).fill('#4b5563');
  doc.text(details || 'In recognition of outstanding dedication to fighting hunger and reducing food waste in the community.', 120, user.orgName ? 335 : 320, { align: 'center', width: 602 });

  // 6. Signatures and stamps (arranged in columns)
  const baseOffset = 425;

  // QR Code Verification
  try {
    const verifyUrl = `http://localhost:5001/api/auth/verify-certificate/${certId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 90, margin: 1 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    doc.image(qrBuffer, 120, baseOffset - 25, { width: 85 });
    
    doc.fontSize(9).fill('#9ca3af');
    doc.text('Scan to Verify', 120, baseOffset + 65, { width: 85, align: 'center' });
  } catch (qrErr) {
    console.error('Failed to draw QR in PDF:', qrErr);
  }

  // Signature 1
  doc.fontSize(12).fill('#374151');
  doc.text('John Doe', 360, baseOffset + 15, { align: 'center', width: 140 });
  doc.moveTo(350, baseOffset + 10).lineTo(510, baseOffset + 10).stroke('#9ca3af').lineWidth(1);
  doc.fontSize(10).fill('#6b7280');
  doc.text('Program Director', 360, baseOffset + 35, { align: 'center', width: 140 });
  doc.fontSize(8).fill('#10b981');
  doc.text('[Digital Signature Verified]', 360, baseOffset + 50, { align: 'center', width: 140 });

  // Admin approval seal / Signature 2
  doc.fontSize(12).fill('#374151');
  doc.text('Hunger Bridge Admin', 590, baseOffset + 15, { align: 'center', width: 150 });
  doc.moveTo(580, baseOffset + 10).lineTo(750, baseOffset + 10).stroke('#9ca3af').lineWidth(1);
  doc.fontSize(10).fill('#6b7280');
  doc.text('Official Platform Approval', 590, baseOffset + 35, { align: 'center', width: 150 });
  doc.fontSize(8).fill('#10b981');
  doc.text('APPROVED & SECURED', 590, baseOffset + 50, { align: 'center', width: 150 });

  // Bottom Metadata (Certificate ID & Date)
  doc.fontSize(9).fill('#9ca3af');
  doc.text(`Certificate ID: ${certId}`, 40, 545);
  doc.text(`Issue Date: ${new Date().toLocaleDateString()}`, 700, 545);

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve(`/certificates/${filename}`);
    });
    stream.on('error', reject);
  });
};

export default generateCertificate;
