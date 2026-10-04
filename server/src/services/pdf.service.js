const PDFDocument = require('pdfkit');

const generateReceiptPDF = (appointment, payment) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Booking Receipt', { align: 'center' })
        .moveDown();

      // Platform / Doctor Details
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`Dr. ${appointment.doctor.fullName || 'Doctor'}`)
        .moveDown(0.5);
      
      const clinic = appointment.doctor.clinic || {};
      doc.font('Helvetica');
      if (clinic.name) doc.text(clinic.name);
      if (clinic.city) doc.text(clinic.city);
      doc.moveDown();

      // Line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

      // Booking Details
      doc.font('Helvetica-Bold').text('Booking Details:').moveDown(0.5);
      doc.font('Helvetica').text(`Booking ID: ${appointment.bookingCode}`);
      doc.text(`Date & Time: ${appointment.dateStr} ${appointment.startTime || ''}`);
      doc.text(`Type: ${appointment.type}`);
      if (appointment.tokenLabel) {
        doc.text(`Queue Token: ${appointment.tokenLabel}`);
      }
      doc.moveDown();

      // Patient Details
      doc.font('Helvetica-Bold').text('Patient Details:').moveDown(0.5);
      const p = appointment.patientDetails || {};
      doc.font('Helvetica').text(`Name: ${p.name || 'N/A'}`);
      doc.text(`Phone: ${p.phone || 'N/A'}`);
      doc.moveDown();

      // Payment Details
      doc.font('Helvetica-Bold').text('Payment Summary:').moveDown(0.5);
      doc.font('Helvetica').text(`Payment ID: ${payment?.razorpayPaymentId || 'N/A'}`);
      doc.text(`Status: ${payment?.status || 'PAID'}`);
      doc.text(`Date: ${payment?.createdAt ? new Date(payment.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Amount Breakdown
      const fee = appointment.fee || {};
      doc.text(`Consultation Fee: INR ${(fee.consultationFee || 0) / 100}`);
      if (fee.convenienceFee) {
        doc.text(`Platform Fee: INR ${(fee.convenienceFee || 0) / 100}`);
      }
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text(`Total Amount Paid: INR ${(fee.total || 0) / 100}`);
      doc.moveDown();

      // Footer
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();
      doc.font('Helvetica-Oblique').fontSize(10).text('Thank you for using our platform. This is an auto-generated receipt.', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateReceiptPDF,
};
