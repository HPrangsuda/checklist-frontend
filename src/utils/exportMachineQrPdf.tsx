import QRCode from 'qrcode'
import { pdf, Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/src/assets/fonts/Sarabun-Regular.ttf', fontWeight: 'normal' },
    { src: '/src/assets/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' },
  ],
})

interface Machine {
  id: number
  machineCode: string
  machineName: string
  qrCode: string
  department?: string
}

const styles = StyleSheet.create({
  page: { padding: 12, backgroundColor: '#ffffff', fontFamily: 'Sarabun' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', padding: 6 },
  card: { border: '1px solid #e0e0e0', borderRadius: 4, padding: 10, alignItems: 'center', height: 230, justifyContent: 'center' },
  qrImage: { width: 160, height: 160 },
  code: { marginTop: 8, fontSize: 10, fontFamily: 'Sarabun', fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center' },
  name: { marginTop: 4, fontSize: 7, fontFamily: 'Sarabun', color: '#555555', textAlign: 'center' },
  pageNumber: { position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 7, fontFamily: 'Sarabun', color: '#bbbbbb' },
})

async function generateQrDataUrl(value: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    QRCode.toCanvas(canvas, value, {
      width: 300,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }, (err) => {
      if (err) reject(err)
      else resolve(canvas.toDataURL('image/png'))
    })
  })
}

// ✅ แก้ไข: คืน string ที่ใช้เป็น content ของ QR
function getQrValue(machine: Machine): string {
  try {
    const parsed = JSON.parse(machine.qrCode)
    return parsed.code ?? machine.machineCode
  } catch {
    return machine.qrCode || machine.machineCode
  }
}

// ✅ แก้ไข: label บน PDF ใช้ field "code" จาก JSON
function getCodeLabel(machine: Machine): string {
  try {
    return JSON.parse(machine.qrCode).code ?? machine.machineCode
  } catch {
    return machine.machineCode
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max) + '...' : str
}

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

export async function exportMachineQrPdf(machines: Machine[]): Promise<void> {
  const qrImages: string[] = []

  for (let i = 0; i < machines.length; i += 6) {
    const batch = machines.slice(i, i + 6)
    const batchImages = await Promise.all(
      batch.map(async (machine) => {
        // ✅ แก้ไขจุดนี้: ใช้ getQrValue แทน machine.qrCode ตรงๆ
        const value = getQrValue(machine)
        if (!value) return ''
        try {
          return await generateQrDataUrl(value)
        } catch {
          return ''
        }
      })
    )
    qrImages.push(...batchImages)
  }

  const pages = chunks(machines, 6)

  const MyDoc = () => (
    <Document>
      {pages.map((pageMachines, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <View style={styles.grid}>
            {pageMachines.map((machine, idx) => {
              const globalIdx = pageIndex * 6 + idx
              return (
                <View key={machine.id} style={styles.cell}>
                  <View style={styles.card}>
                    {qrImages[globalIdx] && (
                      <Image style={styles.qrImage} src={qrImages[globalIdx]} />
                    )}
                    <Text style={styles.code}>{getCodeLabel(machine)}</Text>
                    {machine.machineName && (
                      <Text style={styles.name}>{truncate(machine.machineName, 40)}</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            fixed
          />
        </Page>
      ))}
    </Document>
  )

  const blob = await pdf(<MyDoc />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'machine-qrcodes.pdf'
  a.click()
  URL.revokeObjectURL(url)
}