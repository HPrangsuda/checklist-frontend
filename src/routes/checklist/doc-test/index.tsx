import { createFileRoute } from '@tanstack/react-router';
import React, { useCallback } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Font, Image } from '@react-pdf/renderer';

// Register Thai font
Font.register({
  family: 'NotoSansThai',
  src: 'https://db.onlinewebfonts.com/t/60af1b1ed2ffb54cbb8c8349221d6c4f.ttf',
});

// Define styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansThai',
    padding: 20,
    fontSize: 10,
    lineHeight: 1.2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  companySection: {
    width: '70%',
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  smallText: {
    fontSize: 8,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    padding: 5,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  totals: {
    alignSelf: 'flex-end',
    width: '30%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  signature: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    width: '200',
    alignSelf: 'center',
  },
  note: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 10,
  },
});

// Custom Table for items
const ItemTable = () => (
  <View style={styles.table}>
    <View style={[styles.tableRow, styles.tableHeader]}>
      <View style={[styles.tableCol, { width: '5%' }]}><Text>No</Text></View>
      <View style={[styles.tableCol, { width: '15%' }]}><Text>Code</Text></View>
      <View style={[styles.tableCol, { width: '25%' }]}><Text>Description</Text></View>
      <View style={[styles.tableCol, { width: '10%' }]}><Text>Date</Text></View>
      <View style={[styles.tableCol, { width: '10%' }]}><Text>Qty</Text></View>
      <View style={[styles.tableCol, { width: '10%' }]}><Text>Unit</Text></View>
      <View style={[styles.tableCol, { width: '10%' }]}><Text>Price</Text></View>
      <View style={[styles.tableCol, { width: '5%' }]}><Text>%</Text></View>
      <View style={[styles.tableCol, { width: '10%' }]}><Text>Amount</Text></View>
    </View>
    <View style={styles.tableRow}>
      <View style={[styles.tableCol, { width: '5%' }]}><Text>10</Text></View>
      <View style={[styles.tableCol, { width: '15%' }]}><Text>198-1932</Text></View>
      <View style={[styles.tableCol, { width: '25%' }]}><Text>KERNIK REMAT K-PATCH A-9/9</Text></View>
      <View style={[styles.tableCol, { width: '10%' }]}><Text>27/03/2025</Text></View>
      <View style={[styles.tableCol, { width: '10%' }]}><Text>50.00</Text></View>
      <View style={[styles.tableCol, { width: '10%' }]}><Text>KG</Text></View>
      <View style={[styles.tableCol, { width: '10%' }]}><Text>60.00</Text></View>
      <View style={[styles.tableCol, { width: '5%' }]}><Text>5.00</Text></View>
      <View style={[styles.tableCol, { width: '10%' }]}><Text>2,850.00</Text></View>
    </View>
  </View>
);

// Custom Table for SO etc.
const InfoTable = () => (
  <View style={styles.table}>
    <View style={styles.tableRow}>
      <View style={[styles.tableCol, { width: '14%' }]}><Text>SO</Text></View>
      <View style={[styles.tableCol, { width: '14%' }]}><Text>WH</Text></View>
      <View style={[styles.tableCol, { width: '14%' }]}><Text>MC</Text></View>
      <View style={[styles.tableCol, { width: '14%' }]}><Text>30 days</Text></View>
      <View style={[styles.tableCol, { width: '14%' }]}><Text>26-04-2025</Text></View>
      <View style={[styles.tableCol, { width: '14%' }]}><Text>By Truck</Text></View>
      <View style={[styles.tableCol, { width: '16%' }]}><Text>Jearanai K.</Text></View>
    </View>
  </View>
);

// The PDF Document component
const MyDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.companySection}>
          <Image style={{ width: 50, height: 50 }} src="https://jobbkk.com/upload/employer/08/8E8/00C8E8/images/51432.png" />
          <Text style={styles.receiptTitle}>ใบกํากับภาษี / ใบเสร็จรับเงิน</Text>
          <Text>บริษัท สยามโลหะการค้า จํากัด</Text>
          <Text>88/329 ม.1 ต.บางเมืองใหม่ อ.เมืองสมุทรปราการ จ.สมุทรปราการ 10270</Text>
          <Text>Tel: 02-7579128,02-3944201</Text>
        </View>
        <View>
          <Text>RECEIPT</Text>
          <Text>RECEIPT NO. 251267</Text>
          <Text>DATE 27/03/2025</Text>
        </View>
      </View>

      {/* Customer Info */}
      <View style={{ marginBottom: 10 }}>
        <Text>รหัสลูกค้า: 285084</Text>
        <Text>ชื่อลูกค้า: บริษัท สยามโลหะการค้า จํากัด</Text>
        <Text>เลขประจําตัวผู้เสียภาษี: 0105512003380</Text>
        <Text>สํานักงานใหญ่</Text>
        <Text>ที่อยู่: 88/329 ม.1 ต.บางเมืองใหม่ อ.เมืองสมุทรปราการ จ.สมุทรปราการ 10270</Text>
        <Text>Tel: 081-4941836</Text>
      </View>

      {/* Info Table */}
      <InfoTable />

      {/* Item Table */}
      <ItemTable />

      {/* Notes */}
      <View style={{ marginBottom: 10 }}>
        <Text>ส่งของ-วางบิล(ส่งใบวางบิลทางE-mail) *รับเช็คเมื�อครบดิว</Text>
        <Text>(ยอดสั�งซื�อก่อนVAT ไม่ถึง2,000.- ชําระเป็นเงินสด)</Text>
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text>รวมจํานวนเงิน (THB)</Text>
          <Text>2,850.00</Text>
        </View>
        <View style={styles.totalRow}>
          <Text>VAT 7% (THB)</Text>
          <Text>199.50</Text>
        </View>
        <View style={styles.totalRow}>
          <Text>รวมเงินทั้งสิ้น (THB)</Text>
          <Text>3,049.50</Text>
        </View>
        <Text>(สามพันสี่สิบเก้าบาทห้าสิบสตางค์)</Text>
      </View>

      {/* Signature */}
      <View style={styles.signature}>
        <Text>ผู้รับเงิน / Received by</Text>
      </View>

      {/* Bottom Note */}
      <Text style={styles.note}>ใบเสร็จจะสมบูรณ์ก็ต่อเมื่อบริษัทฯ ได้รับชําระตามเอกสารเรียบร้อยเเล้ว</Text>
      <Text style={styles.note}>**เอกสารนี้ได้จัดทําและส่งข้อมูลให้แก่กรมสรรพากรด้วยวิธีการทางอิเล็กทรอนิกส์**</Text>
    </Page>
  </Document>
);

// Route component with PDF generation
function RouteComponent() {
  const generateAndDownloadPDF = useCallback(async () => {
    const blob = await pdf(<MyDocument />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '251267_receipt.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      
      <h1>Generate Receipt PDF</h1>
      <p>Click to download the PDF with the specified layout.</p>
      <button
        onClick={generateAndDownloadPDF}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Download PDF
      </button>
    </div>
  );
}

export const Route = createFileRoute('/checklist/doc-test/')({
  component: RouteComponent,
});