
import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/minera.png'


import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from 'react-leaflet'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import api from '../services/api'

// ============================================================
// FIX ICON LEAFLET
// ============================================================

delete (L.Icon.Default.prototype as unknown as {
  _getIconUrl?: unknown
})._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})


// ============================================================
// INTERFACE
// ============================================================

interface User {
  id: number
  name: string
  username: string
  role: string
}

interface AttendanceData {
  id: number
  user_id: number
  date: string
  status: string
  clock_in: string | null
  latitude_in: string | number | null
  longitude_in: string | number | null
  photo_in: string | null
  clock_out: string | null
  latitude_out: string | number | null
  longitude_out: string | number | null
  photo_out: string | null
  is_late: boolean
  late_duration: number
  work_duration: number
  notes: string | null
  user: User
}

interface AttendanceResponse {
  success: boolean
  data: AttendanceData[]
  message?: string
}

// ============================================================
// MAP MODAL
// ============================================================

interface MapModalData {
  latitude: number
  longitude: number
  title: string
}

function MapModal({
  data,
  onClose,
}: {
  data: MapModalData | null
  onClose: () => void
}) {
  if (!data) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {data.title}
            </h2>

            <p className="text-xs text-slate-500">
              {data.latitude}, {data.longitude}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ✕
          </button>
        </div>

        {/* MAP */}
        <div className="h-[500px] w-full">
          <MapContainer
            center={[data.latitude, data.longitude]}
            zoom={17}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker
              position={[
                data.latitude,
                data.longitude,
              ]}
            >
              <Popup>
                <strong>{data.title}</strong>
                <br />
                Latitude: {data.latitude}
                <br />
                Longitude: {data.longitude}
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t bg-slate-50 px-5 py-4">

          <div className="text-sm text-slate-600">
            <strong>Latitude:</strong> {data.latitude}
            <br />
            <strong>Longitude:</strong> {data.longitude}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Tutup
          </button>

        </div>

      </div>
    </div>
  )
}

// ============================================================
// MAIN
// ============================================================

export default function Attendance() {
  const [attendances, setAttendances] = useState<
    AttendanceData[]
  >([])
  const [showPDF2Form, setShowPDF2Form] = useState(false)


  const [pdf2Form, setPdf2Form] = useState({
    namaKaryawan: '',
    nipJabatan: '',
    bagianDept: '',
    lokasiProyek: 'PT. Sumiraya Sinergi Ananta',
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  // ============================================================
  // FILTER
  // ============================================================

  const [searchName, setSearchName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // ============================================================
  // MAP
  // ============================================================

  const [mapData, setMapData] =
    useState<MapModalData | null>(null)

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = async () => {
    try {
      await api.post('/logout')
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      navigate('/login', {
        replace: true,
      })
    }
  }

  // ============================================================
  // LOAD DATA
  // ============================================================

 
    const formatStatus = (status: string | null | undefined) => {
    switch (status) {
        case 'present':
        return 'Hadir'

        case 'sick':
        return 'Sakit'

        case 'leave':
        return 'Izin'

        case 'absent':
        return 'Alpa'

        case 'late':
        return 'Terlambat'

        default:
        return status
            ? status.charAt(0).toUpperCase() + status.slice(1)
            : '-'
    }
    }


  const loadAttendances = async () => {
    try {
      setLoading(true)
      setError('')

      const response =
        await api.get<AttendanceResponse>(
          '/attendances'
        )

      if (response.data.success) {
        setAttendances(response.data.data)
      } else {
        setError(
          response.data.message ||
            'Gagal mengambil data absensi.'
        )
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')

          navigate('/login', {
            replace: true,
          })

          return
        }

        if (err.response?.status === 403) {
          setError(
            'Anda tidak memiliki akses ke data absensi.'
          )
        } else {
          setError(
            err.response?.data?.message ||
              'Gagal mengambil data absensi.'
          )
        }
      } else {
        setError(
          'Terjadi kesalahan saat mengambil data.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttendances()
  }, [])

  // ============================================================
  // DATE NORMALIZER
  // ============================================================

  
// ============================================================
// TANGGAL ABSENSI - WIB
// ============================================================

const getAttendanceDate = (date: string) => {
  if (!date) return ''

  const d = new Date(date)

  // Format YYYY-MM-DD berdasarkan timezone Asia/Jakarta
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}



  // ============================================================
  // FILTER
  // ============================================================

  const filteredAttendances = useMemo(() => {
    return attendances.filter((item) => {
      const name =
        item.user?.name?.toLowerCase() || ''

      const keyword =
        searchName.toLowerCase().trim()

      const attendanceDate =
        getAttendanceDate(item.date)

      const matchName =
        keyword === '' ||
        name.includes(keyword)

      const matchStartDate =
        startDate === '' ||
        attendanceDate >= startDate

      const matchEndDate =
        endDate === '' ||
        attendanceDate <= endDate

      return (
        matchName &&
        matchStartDate &&
        matchEndDate
      )
    })
  }, [
    attendances,
    searchName,
    startDate,
    endDate,
  ])

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date: string) => {
    if (!date) return '-'

    const dateOnly =
      getAttendanceDate(date)

    const d = new Date(
      `${dateOnly}T00:00:00`
    )

    return d.toLocaleDateString(
      'id-ID',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    )
  }

  // ============================================================
  // FORMAT DURATION
  // ============================================================

  const formatDuration = (
    minutes: number | null
  ) => {
    if (
      minutes === null ||
      minutes === undefined
    ) {
      return '-'
    }

    const hours = Math.floor(
      minutes / 60
    )

    const mins = minutes % 60

    if (hours === 0) {
      return `${mins} menit`
    }

    return `${hours} jam ${mins} menit`
  }

  // ============================================================
  // LOCATION
  // ============================================================

  const formatLocation = (
    latitude:
      | string
      | number
      | null,
    longitude:
      | string
      | number
      | null
  ) => {
    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined
    ) {
      return '-'
    }

    return `${latitude}, ${longitude}`
  }

  const getCoordinates = (
    latitude:
      | string
      | number
      | null,
    longitude:
      | string
      | number
      | null
  ) => {
    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined
    ) {
      return null
    }

    const lat = Number(latitude)
    const lng = Number(longitude)

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return null
    }

    if (
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return null
    }

    return {
      latitude: lat,
      longitude: lng,
    }
  }

  // ============================================================
  // PHOTO URL
  // ============================================================

  const getPhotoUrl = (
    photo: string | null
  ) => {
    if (!photo) return null

    if (photo.startsWith('data:image/')) {
      return photo
    }

    if (
      photo.startsWith('http://') ||
      photo.startsWith('https://')
    ) {
      return photo
    }

    const storageUrl = (
      import.meta.env.DEV
        ? '/storage'
        : import.meta.env.VITE_STORAGE_URL
    ).replace(/\/$/, '')

    return `${storageUrl}/${photo.replace(
      /^\/+/,
      ''
    )}`
  }

  // ============================================================
  // RESET
  // ============================================================

  const resetFilter = () => {
    setSearchName('')
    setStartDate('')
    setEndDate('')
  }

  // ============================================================
  // EXCEL
  // ============================================================

  const exportExcel = () => {
    if (
      filteredAttendances.length === 0
    ) {
      alert(
        'Tidak ada data untuk diexport.'
      )
      return
    }

    const data =
      filteredAttendances.map(
        (item, index) => ({
          No: index + 1,
          Nama:
            item.user?.name || '-',
          Username:
            item.user?.username || '-',
          Tanggal:
            formatDate(item.date),
          'Clock In':
            item.clock_in || '-',
          'Lokasi In':
            formatLocation(
              item.latitude_in,
              item.longitude_in
            ),
          'Clock Out':
            item.clock_out || '-',
          'Lokasi Out':
            formatLocation(
              item.latitude_out,
              item.longitude_out
            ),
          Durasi:
            formatDuration(
              item.work_duration
            ),
          Status:
            item.status,
          Terlambat:
            item.is_late
              ? `${item.late_duration} menit`
              : 'Tidak',
          Catatan:
            item.notes || '-',
        })
      )

    const worksheet =
      XLSX.utils.json_to_sheet(data)

    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 25 },
      { wch: 12 },
      { wch: 25 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
    ]

    const workbook =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Data Absensi'
    )

    const filename =
      `data-absensi-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`

    XLSX.writeFile(
      workbook,
      filename
    )
  }

  // ============================================================
  // IMAGE TO DATA URL
  // ============================================================


// ============================================================
// IMAGE TO DATA URL
// ============================================================

const imageToDataUrl = async (
  url: string
): Promise<string | null> => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(url, {
      headers: {
        Accept: 'image/*',
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    })

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} saat memuat foto`
      )
    }

    const blob = await response.blob()

    if (!blob.size) {
      console.error('Foto PDF kosong:', url)
      return null
    }

    if (!blob.type.startsWith('image/')) {
      console.error(
        'Response foto PDF bukan gambar:',
        url,
        blob.type
      )
      return null
    }

    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () =>
        resolve(
          typeof reader.result === 'string'
            ? reader.result
            : null
        )
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Gagal load foto untuk PDF:', url, error)
    return null
  }
}

const reverseGeocode = async (
  latitude: string | number | null,
  longitude: string | number | null
): Promise<string> => {
  const coordinates = getCoordinates(latitude, longitude)

  if (!coordinates) return '-'

  const geocodingUrl =
    import.meta.env.VITE_GEOCODING_URL

  if (!geocodingUrl) {
    return formatLocation(latitude, longitude)
  }

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(coordinates.latitude),
      lon: String(coordinates.longitude),
      addressdetails: '1',
      zoom: '18',
      'accept-language': 'id',
    })
    const response = await fetch(
      `${geocodingUrl}?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = (await response.json()) as {
      display_name?: string
      address?: Record<string, string | undefined>
    }

    const address = result.address
    const addressParts = address
      ? [
          address.road,
          address.house_number,
          address.hamlet,
          address.neighbourhood,
          address.village ||
            address.suburb ||
            address.quarter,
          address.town ||
            address.city_district ||
            address.district,
          address.city ||
            address.municipality ||
            address.county,
          address.state,
          address.postcode,
          address.country,
        ].filter(
          (part): part is string =>
            Boolean(part && part.trim())
        )
      : []

    return (
      addressParts.join(', ') ||
      result.display_name ||
      formatLocation(latitude, longitude)
    )
  } catch (error) {
    console.error(
      'Gagal mengubah koordinat menjadi alamat:',
      coordinates,
      error
    )
    return formatLocation(latitude, longitude)
  }
}

// ============================================================
// IMAGE TO DATA URL
// ============================================================




// ============================================================
// PDF
// ============================================================

// const exportPDF = async () => {
//   if (filteredAttendances.length === 0) {
//     alert('Tidak ada data untuk diexport.')
//     return
//   }

//   try {
//     const doc = new jsPDF({
//       orientation: 'landscape',
//       unit: 'mm',
//       format: 'a4',
//     })

//     doc.setFontSize(16)
//     doc.text('LAPORAN DATA ABSENSI', 8, 12)

//     doc.setFontSize(8)
//     if (startDate || endDate) {
//       const period =
//         startDate && endDate
//           ? `Periode: ${formatDate(startDate)} s/d ${formatDate(endDate)}`
//           : startDate
//             ? `Periode: mulai ${formatDate(startDate)}`
//             : `Periode: sampai ${formatDate(endDate)}`
//       doc.text(period, 8, 18)
//     }
//     doc.text(
//       `Jumlah data: ${filteredAttendances.length}`,
//       8,
//       startDate || endDate ? 24 : 18
//     )

//     const photoCache = new Map<string, string>()
//     const addressCache = new Map<string, string>()

//     for (const item of filteredAttendances) {
//       const photoUrls = [
//         getPhotoUrl(item.photo_in),
//         getPhotoUrl(item.photo_out),
//       ]

//       for (const photoUrl of photoUrls) {
//         if (photoUrl && !photoCache.has(photoUrl)) {
//           const dataUrl =
//             photoUrl.startsWith('data:image/')
//               ? photoUrl
//               : await imageToDataUrl(photoUrl)

//           if (dataUrl) {
//             photoCache.set(photoUrl, dataUrl)
//           } else {
//             console.error(
//               'Foto gagal dimuat untuk PDF:',
//               photoUrl
//             )
//           }
//         }
//       }

//       const addressCoordinates = [
//         [item.latitude_in, item.longitude_in],
//         [item.latitude_out, item.longitude_out],
//       ] as const

//       for (const [latitude, longitude] of addressCoordinates) {
//         const coordinates = getCoordinates(latitude, longitude)
//         if (!coordinates) continue

//         const key = `${coordinates.latitude},${coordinates.longitude}`
//         if (!addressCache.has(key)) {
//           addressCache.set(
//             key,
//             await reverseGeocode(latitude, longitude)
//           )
//         }
//       }
//     }

//     const rows = filteredAttendances.map((item, index) => {
//       const photoIn = getPhotoUrl(item.photo_in)
//       const photoOut = getPhotoUrl(item.photo_out)
//       const coordinatesIn = getCoordinates(
//         item.latitude_in,
//         item.longitude_in
//       )
//       const coordinatesOut = getCoordinates(
//         item.latitude_out,
//         item.longitude_out
//       )
//       const addressIn = coordinatesIn
//         ? addressCache.get(
//             `${coordinatesIn.latitude},${coordinatesIn.longitude}`
//           ) || formatLocation(
//             item.latitude_in,
//             item.longitude_in
//           )
//         : '-'
//       const addressOut = coordinatesOut
//         ? addressCache.get(
//             `${coordinatesOut.latitude},${coordinatesOut.longitude}`
//           ) || formatLocation(
//             item.latitude_out,
//             item.longitude_out
//           )
//         : '-'

//       return [
//         index + 1,
//         item.user?.name || '-',
//         formatDate(item.date),
//         item.clock_in || '-',
//         photoIn && photoCache.has(photoIn) ? 'Ada' : '-',
//         formatLocation(item.latitude_in, item.longitude_in),
//         addressIn,
//         item.clock_out || '-',
//         photoOut && photoCache.has(photoOut) ? 'Ada' : '-',
//         formatLocation(item.latitude_out, item.longitude_out),
//         addressOut,
//         formatDuration(item.work_duration),
//         formatStatus(item.status),
//         item.is_late
//           ? `${item.late_duration} menit`
//           : 'Tidak',
//         item.notes || '-',
//       ]
//     })

//     autoTable(doc, {
//       startY: startDate || endDate ? 29 : 23,
//       head: [[
//         'No',
//         'Nama',
//         'Tanggal',
//         'Clock In',
//         'Foto In',
//         'Lokasi In',
//         'Alamat In',
//         'Clock Out',
//         'Foto Out',
//         'Lokasi Out',
//         'Alamat Out',
//         'Durasi',
//         'Status',
//         'Terlambat',
//         'Catatan',
//       ]],
//       body: rows,
//       styles: {
//        fontSize: 5.5,
//        cellPadding: 1.5,
//         valign: 'middle',
//        overflow: 'linebreak',
//      },
//      headStyles: {
//        fontSize: 5.5,
//        cellPadding: 1.5,
//      },
//      columnStyles: {
//        0: { cellWidth: 8 },
//        1: { cellWidth: 19 },
//        2: { cellWidth: 17 },
//        3: { cellWidth: 17 },
//        4: { cellWidth: 22 },
//        5: { cellWidth: 22 },
//        6: { cellWidth: 17 },
//        7: { cellWidth: 22 },
//        8: { cellWidth: 22 },
//        9: { cellWidth: 17 },
//        10: { cellWidth: 17 },
//        11: { cellWidth: 17 },
//        12: { cellWidth: 17 },
//        13: { cellWidth: 17 },
//        14: { cellWidth: 25 },
//      },
//      margin: {
//        left: 8,
//        right: 8,
//      },
//      didParseCell: (data) => {
//        if (data.section === 'body') {
//          data.cell.styles.minCellHeight = 34
//        }
//      },
//      didDrawCell: (data) => {
//        if (
//          data.section !== 'body' ||
//          (data.column.index !== 4 &&
//            data.column.index !== 8)
//        ) {
//          return
//        }

//        const item = filteredAttendances[data.row.index]
//        if (!item) return

//        const image = photoCache.get(
//          getPhotoUrl(
//            data.column.index === 4
//              ? item.photo_in
//              : item.photo_out
//          ) || ''
//        )

//        if (image) {
//          doc.addImage(
//            image,
//            image.startsWith('data:image/png')
//              ? 'PNG'
//              : 'JPEG',
//            data.cell.x + 1,
//            data.cell.y + 1,
//            data.cell.width - 2,
//            data.cell.height - 2
//          )
//        }
//      },
//      didDrawPage: () => {
//        doc.setFontSize(6)
//        doc.text('Minera ClockIn', 8, 202)
//      },
//    })

//     const filename =
//       `data-absensi-${new Date()
//         .toISOString()
//         .slice(0, 10)}.pdf`

//     doc.save(filename)

//   } catch (error) {
//     console.error(
//       'Export PDF error:',
//       error,
//     )

//     alert(
//       'Gagal membuat PDF. Pastikan foto absensi dapat diakses oleh browser.',
//     )
//   }
// }

const exportPDF2 = async (
  formData: {
  namaKaryawan: string
  nipJabatan: string
  bagianDept: string
  lokasiProyek: string
}
) => {
  if (filteredAttendances.length === 0) {
    alert('Tidak ada data untuk diexport.')
    return
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // =========================================================
    // UKURAN HALAMAN
    // =========================================================

    const pageWidth =
      doc.internal.pageSize.getWidth()

    const margin = 10

    const headerX = margin
    const headerY = 10

    const headerWidth =
      pageWidth - margin * 2

    // =========================================================
    // HEADER
    // =========================================================

    const headerHeight = 20

    // =========================================================
    // LEBAR 3 KOLOM HEADER
    // =========================================================

    const col1Width = 30
    const col2Width = 114

    const col3Width =
      headerWidth -
      col1Width -
      col2Width

    const col1X = headerX
    const col2X =
      col1X + col1Width

    const col3X =
      col2X + col2Width

    // =========================================================
    // HEADER - 3 KOLOM
    // =========================================================

    doc.setLineWidth(0.4)

    // ---------------------------------------------------------
    // Kolom 1 - Logo
    // ---------------------------------------------------------

    doc.rect(
      col1X,
      headerY,
      col1Width,
      headerHeight
    )

    // ---------------------------------------------------------
    // Kolom 2 - Judul
    // ---------------------------------------------------------

    doc.rect(
      col2X,
      headerY,
      col2Width,
      headerHeight
    )

    // ---------------------------------------------------------
    // Kolom 3 - Informasi Dokumen
    // ---------------------------------------------------------

    doc.rect(
      col3X,
      headerY,
      col3Width,
      headerHeight
    )

    // =========================================================
    // LOGO PERUSAHAAN
    // =========================================================

    const logoDataUrl =
      await imageToDataUrl(logo)

    if (logoDataUrl) {
      const logoWidth = 18
      const logoHeight = 18

      const imageFormat =
        logoDataUrl.startsWith(
          'data:image/png'
        )
          ? 'PNG'
          : 'JPEG'

      doc.addImage(
        logoDataUrl,
        imageFormat,
        col1X +
          (col1Width - logoWidth) / 2,
        headerY +
          (headerHeight - logoHeight) / 2,
        logoWidth,
        logoHeight
      )
    }

    // =========================================================
    // KOLOM 2 - JUDUL
    // =========================================================

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(14)

    doc.text(
      'ABSENSI KARYAWAN STANDBY / DINAS',
      col2X +
        col2Width / 2,
      headerY +
        headerHeight / 2 +
        1,
      {
        align: 'center',
        baseline: 'middle',
      }
    )

    // =========================================================
    // KOLOM 3 - INFORMASI DOKUMEN
    // =========================================================

    const rowHeight =
      headerHeight / 3

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(9)

    // Row 1
    doc.text(
      'No. Form :',
      col3X + 2,
      headerY +
        rowHeight / 2 +
        1
    )

    // Row 2
    doc.text(
      'No. Revisi :',
      col3X + 2,
      headerY +
        rowHeight +
        rowHeight / 2 +
        1
    )

    // Row 3
    doc.text(
      'Tgl Berlaku :',
      col3X + 2,
      headerY +
        rowHeight * 2 +
        rowHeight / 2 +
        1
    )

    // =========================================================
    // INFORMASI KARYAWAN
    // 2 KOLOM - TANPA BORDER
    // =========================================================

    const infoStartY =
      headerY +
      headerHeight +
      4

    const infoColWidth =
      headerWidth / 2

    const infoCol1X = margin

    const infoCol2X =
      margin +
      infoColWidth

    const infoRowHeight = 5

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(9)

    // ---------------------------------------------------------
    // KOLOM KIRI
    // ---------------------------------------------------------

    const infoLabelGap = 2
    doc.text(
      'Nama Karyawan',
      infoCol1X,
      infoStartY
    )

    doc.text(
      ':',
      infoCol1X + 30 + infoLabelGap,
      infoStartY
    )

    doc.text(
      formData.namaKaryawan,
      infoCol1X + 30 + infoLabelGap + 2,
      infoStartY
    )

    doc.text(
      'NIP / Jabatan',
      infoCol1X,
      infoStartY + infoRowHeight
    )

    doc.text(
      ':',
      infoCol1X + 30 + infoLabelGap,
      infoStartY + infoRowHeight
    )

    doc.text(
      formData.nipJabatan,
      infoCol1X + 30 + infoLabelGap + 2,
      infoStartY + infoRowHeight
    )

    // ---------------------------------------------------------
    // KOLOM KANAN
    // ---------------------------------------------------------

    doc.text(
      'Bagian / Dept',
      infoCol2X,
      infoStartY
    )

    doc.text(
      ':',
      infoCol2X + 30 + infoLabelGap,
      infoStartY
    )

    doc.text(
      formData.bagianDept,
      infoCol2X + 30 + infoLabelGap + 2,
      infoStartY
    )

    doc.text(
      'Lokasi Proyek',
      infoCol2X,
      infoStartY + infoRowHeight
    )

    doc.text(
      ':',
      infoCol2X + 30 + infoLabelGap,
      infoStartY + infoRowHeight
    )

    doc.text(
      formData.lokasiProyek,
      infoCol2X + 30 + infoLabelGap + 2,
      infoStartY + infoRowHeight
    )

    // =========================================================
    // CACHE FOTO
    // =========================================================

    const photoCache =
      new Map<string, string>()

    // =========================================================
    // AMBIL FOTO DARI filteredAttendances
    // =========================================================

    for (
      const item of filteredAttendances
    ) {
      const photoUrls = [
        getPhotoUrl(item.photo_in),
        getPhotoUrl(item.photo_out),
      ]

      for (
        const photoUrl of photoUrls
      ) {
        if (
          photoUrl &&
          !photoCache.has(photoUrl)
        ) {
          const dataUrl =
            photoUrl.startsWith(
              'data:image/'
            )
              ? photoUrl
              : await imageToDataUrl(
                  photoUrl
                )

          if (dataUrl) {
            photoCache.set(
              photoUrl,
              dataUrl
            )
          } else {
            console.error(
              'Foto gagal dimuat untuk PDF:',
              photoUrl
            )
          }
        }
      }
    }

    // =========================================================
    // FUNGSI FORMAT TANGGAL
    // =========================================================

    const formatTanggalPDF = (
      value: any
    ) => {
      if (!value) return '-'

      try {
        return formatDate(value)
      } catch {
        return String(value)
      }
    }

    // =========================================================
    // DATA ROW TABEL
    // =========================================================

    const rows =
      filteredAttendances.map(
        (item) => {
          const photoIn =
            getPhotoUrl(
              item.photo_in
            )

          const photoOut =
            getPhotoUrl(
              item.photo_out
            )

          return [
            // -------------------------------------------------
            // 1. HARI / TANGGAL
            // -------------------------------------------------
            formatTanggalPDF(
              item.date
            ),

            // -------------------------------------------------
            // 2. JAM MASUK
            // -------------------------------------------------
            item.clock_in || '-',

            // -------------------------------------------------
            // 3. JAM PULANG
            // -------------------------------------------------
            item.clock_out || '-',

            // -------------------------------------------------
            // 4. FOTO MASUK / PULANG
            // -------------------------------------------------
            {
              content: '',
              photoIn:
                photoIn &&
                photoCache.has(
                  photoIn
                )
                  ? photoCache.get(
                      photoIn
                    )
                  : null,
              photoOut:
                photoOut &&
                photoCache.has(
                  photoOut
                )
                  ? photoCache.get(
                      photoOut
                    )
                  : null,
            },

            // -------------------------------------------------
            // 5. CATATAN
            // -------------------------------------------------
            item.notes || '-',
          ]
        }
      )

    // =========================================================
    // POSISI TABEL
    // =========================================================

    const tableStartY =
      infoStartY +
      infoRowHeight * 2 +
      6

    // =========================================================
    // TABEL ABSENSI
    // =========================================================

    autoTable(doc, {
  startY: infoStartY + 7,

  head: [[
    'Hari / Tanggal',
    'Jam Masuk',
    'Jam Pulang',
    'Foto Masuk / Pulang',
    'Catatan',
  ]],

  body: filteredAttendances.map((item) => [
    formatDate(item.date),
    item.clock_in || '-',
    item.clock_out || '-',
    '',
    item.notes || '-',
  ]),

  theme: 'grid',

  tableWidth: headerWidth,

  margin: {
    left: margin,
    right: margin,
  },

  styles: {
    font: 'helvetica',
    fontStyle: 'normal',
    fontSize: 8,
    textColor: [0, 0, 0],
    fillColor: [255, 255, 255],
    cellPadding: 2,
    valign: 'middle',
    halign: 'center',
    overflow: 'linebreak',
    lineWidth: 0.5,
    lineColor: [0, 0, 0],
  },

  headStyles: {
    font: 'helvetica',
    fontStyle: 'bold',
    fontSize: 8.5,
    textColor: [0, 0, 0],
    fillColor: [255, 255, 255],
    cellPadding: 2,
    halign: 'center',
    valign: 'middle',
    lineWidth: 0.5,
    lineColor: [0, 0, 0],
  },

  columnStyles: {
    // Total = 190 mm
    // 10 + 190 = 200, sama persis dengan header

    0: {
      cellWidth: 28,
      halign: 'center',
    },

    1: {
      cellWidth: 25,
      halign: 'center',
    },

    2: {
      cellWidth: 25,
      halign: 'center',
    },

    3: {
      cellWidth: 55,
      halign: 'center',
    },

    4: {
      cellWidth: 57,
      halign: 'center',
    },
  },

  didParseCell: (data) => {
    if (data.section === 'body') {
      data.cell.styles.minCellHeight = 32
    }
  },

  didDrawCell: (data) => {
    if (
      data.section !== 'body' ||
      data.column.index !== 3
    ) {
      return
    }

    const item = filteredAttendances[data.row.index]

    if (!item) return

    const photoIn = getPhotoUrl(item.photo_in)
    const photoOut = getPhotoUrl(item.photo_out)

    const imageIn = photoIn
      ? photoCache.get(photoIn)
      : undefined

    const imageOut = photoOut
      ? photoCache.get(photoOut)
      : undefined

    const padding = 1
    const dividerX =
      data.cell.x + data.cell.width / 2

    // Garis pemisah Foto IN dan Foto OUT
    doc.setLineWidth(0.2)

    doc.line(
      dividerX,
      data.cell.y,
      dividerX,
      data.cell.y + data.cell.height
    )

    const imageWidth =
      data.cell.width / 2 - padding * 2

    const imageHeight =
      data.cell.height - padding * 2

    // FOTO MASUK
    if (imageIn) {
      const format = imageIn.startsWith('data:image/png')
        ? 'PNG'
        : 'JPEG'

      doc.addImage(
        imageIn,
        format,
        data.cell.x + padding,
        data.cell.y + padding,
        imageWidth,
        imageHeight
      )
    } else {
      doc.setFontSize(7)
      doc.text(
        'IN',
        data.cell.x + data.cell.width / 4,
        data.cell.y + data.cell.height / 2,
        {
          align: 'center',
          baseline: 'middle',
        }
      )
    }

    // FOTO PULANG
    if (imageOut) {
      const format = imageOut.startsWith('data:image/png')
        ? 'PNG'
        : 'JPEG'

      doc.addImage(
        imageOut,
        format,
        dividerX + padding,
        data.cell.y + padding,
        imageWidth,
        imageHeight
      )
    } else {
      doc.setFontSize(7)
      doc.text(
        'OUT',
        dividerX + data.cell.width / 4,
        data.cell.y + data.cell.height / 2,
        {
          align: 'center',
          baseline: 'middle',
        }
      )
    }
  },

  didDrawPage: () => {
    const pageHeight =
      doc.internal.pageSize.getHeight()

    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(7)

    doc.text(
      'Minera ClockIn',
      margin,
      pageHeight - 8
    )
  },
})

    // =========================================================
    // SIMPAN PDF
    // =========================================================

    const filename =
      `header-absensi-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`

    doc.save(filename)

  } catch (error) {
    console.error(
      'Export PDF error:',
      error
    )

    alert(
      'Gagal membuat PDF. Pastikan foto absensi dapat diakses oleh browser.'
    )
  }
}
  // ============================================================
  // OPEN MAP
  // ============================================================

  const openMap = (
    latitude:
      | string
      | number
      | null,
    longitude:
      | string
      | number
      | null,
    title: string
  ) => {
    const coordinates =
      getCoordinates(
        latitude,
        longitude
      )

    if (!coordinates) {
      alert(
        'Koordinat lokasi tidak tersedia atau tidak valid.'
      )

      return
    }

    setMapData({
      latitude:
        coordinates.latitude,
      longitude:
        coordinates.longitude,
      title,
    })
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">

      <MapModal
        data={mapData}
        onClose={() =>
          setMapData(null)
        }
      />

      <div className="mx-auto max-w-[1800px]">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Data Absensi
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Kelola dan lihat seluruh data absensi karyawan.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              Logout
            </button>

            <button
            type="button"
            onClick={() => navigate('/users')}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            👥 Kelola User
          </button>

            <button
              type="button"
              onClick={loadAttendances}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ↻ Refresh
            </button>

            <button
              type="button"
              onClick={exportExcel}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              📊 Excel
            </button>

            <button
              type="button"
              onClick={() => {
                if (filteredAttendances.length === 0) {
                  alert('Tidak ada data untuk diexport.')
                  return
                }

                setShowPDF2Form(true)
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              📄 PDF
            </button>

          </div>
        </div>

        {/* FILTER */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

          <div className="mb-4">
            <h2 className="font-semibold text-slate-800">
              Filter Data
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

            {/* NAMA */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nama
              </label>

              <input
                type="text"
                value={searchName}
                onChange={(e) =>
                  setSearchName(
                    e.target.value
                  )
                }
                placeholder="Cari nama..."
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* START */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Dari Tanggal
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* END */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Sampai Tanggal
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* RESET */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilter}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset Filter
              </button>
            </div>

          </div>

          {/* RESULT */}
          <div className="mt-4 flex flex-wrap gap-3">

            <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
              Total:{' '}
              <strong>
                {filteredAttendances.length}
              </strong>
            </div>

            {searchName && (
              <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600">
                Nama:{' '}
                <strong>
                  {searchName}
                </strong>
              </div>
            )}

            {startDate && (
              <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600">
                Dari:{' '}
                <strong>
                  {startDate}
                </strong>
              </div>
            )}

            {endDate && (
              <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600">
                Sampai:{' '}
                <strong>
                  {endDate}
                </strong>
              </div>
            )}

          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          {loading ? (

            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">

                <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="text-sm text-slate-500">
                  Memuat data absensi...
                </p>

              </div>
            </div>

          ) : filteredAttendances.length === 0 ? (

            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">

                <div className="mb-3 text-5xl">
                  📋
                </div>

                <h3 className="font-semibold text-slate-700">
                  Data tidak ditemukan
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Tidak ada data yang sesuai dengan filter.
                </p>

              </div>
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="min-w-[1750px] w-full text-left text-sm">

                <thead className="bg-slate-800 text-white">

                  <tr>

                    <th className="px-4 py-4 text-center">
                      No
                    </th>

                    <th className="px-4 py-4">
                      Nama
                    </th>

                    <th className="px-4 py-4">
                      Tanggal
                    </th>

                    <th className="px-4 py-4">
                      Clock In
                    </th>

                    <th className="px-4 py-4">
                      Foto In
                    </th>

                    <th className="px-4 py-4">
                      Lokasi In
                    </th>

                    <th className="px-4 py-4">
                      Clock Out
                    </th>

                    <th className="px-4 py-4">
                      Foto Out
                    </th>

                    <th className="px-4 py-4">
                      Lokasi Out
                    </th>

                    <th className="px-4 py-4">
                      Durasi
                    </th>

                    <th className="px-4 py-4">
                      Status
                    </th>

                    <th className="px-4 py-4">
                      Terlambat
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-200">

                  {filteredAttendances.map(
                    (item, index) => {

                      const photoIn =
                        getPhotoUrl(
                          item.photo_in
                        )

                      const photoOut =
                        getPhotoUrl(
                          item.photo_out
                        )

                      const locationIn =
                        getCoordinates(
                          item.latitude_in,
                          item.longitude_in
                        )

                      const locationOut =
                        getCoordinates(
                          item.latitude_out,
                          item.longitude_out
                        )

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50"
                        >

                          {/* NO */}
                          <td className="px-4 py-4 text-center text-slate-500">
                            {index + 1}
                          </td>

                          {/* NAMA */}
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-800">
                              {item.user?.name ||
                                '-'}
                            </div>

                            <div className="text-xs text-slate-400">
                              @
                              {item.user
                                ?.username ||
                                '-'}
                            </div>
                          </td>

                          {/* TANGGAL */}
                          <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                            {formatDate(
                              item.date
                            )}
                          </td>

                          {/* CLOCK IN */}
                          <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-700">
                            {item.clock_in ||
                              '-'}
                          </td>

                          {/* FOTO IN */}
                          <td className="px-4 py-4">

                            {photoIn ? (
                              <img
                                src={photoIn}
                                alt="Foto clock in"
                                className="h-16 w-16 rounded-lg object-cover shadow-sm"
                              />
                            ) : (
                              <span className="text-slate-400">
                                -
                              </span>
                            )}

                          </td>

                          {/* LOKASI IN */}
                          <td className="px-4 py-4">

                            <div className="text-xs text-slate-600">
                              {formatLocation(
                                item.latitude_in,
                                item.longitude_in
                              )}
                            </div>

                            {locationIn && (
                              <button
                                type="button"
                                onClick={() =>
                                  openMap(
                                    item.latitude_in,
                                    item.longitude_in,
                                    `Lokasi Clock In - ${
                                      item.user?.name ||
                                      ''
                                    }`
                                  )
                                }
                                className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                🗺 Map
                              </button>
                            )}

                          </td>

                          {/* CLOCK OUT */}
                          <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-700">
                            {item.clock_out ||
                              '-'}
                          </td>

                          {/* FOTO OUT */}
                          <td className="px-4 py-4">

                            {photoOut ? (
                              <img
                                src={photoOut}
                                alt="Foto clock out"
                                className="h-16 w-16 rounded-lg object-cover shadow-sm"
                              />
                            ) : (
                              <span className="text-slate-400">
                                -
                              </span>
                            )}

                          </td>

                          {/* LOKASI OUT */}
                          <td className="px-4 py-4">

                            <div className="text-xs text-slate-600">
                              {formatLocation(
                                item.latitude_out,
                                item.longitude_out
                              )}
                            </div>

                            {locationOut && (
                              <button
                                type="button"
                                onClick={() =>
                                  openMap(
                                    item.latitude_out,
                                    item.longitude_out,
                                    `Lokasi Clock Out - ${
                                      item.user?.name ||
                                      ''
                                    }`
                                  )
                                }
                                className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                🗺 Map
                              </button>
                            )}

                          </td>

                          {/* DURASI */}
                          <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                            {formatDuration(
                              item.work_duration
                            )}
                          </td>

                          {/* STATUS */}
                          <td className="px-4 py-4">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                item.status ===
                                'present'
                                  ? 'bg-green-100 text-green-700'
                                  : item.status ===
                                    'sick'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : item.status ===
                                    'leave'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {formatStatus(item.status)}
                            </span>

                          </td>

                          {/* TERLAMBAT */}
                          <td className="px-4 py-4">

                            {item.is_late ? (
                              <span className="font-semibold text-red-600">
                                {
                                  item.late_duration
                                }{' '}
                                menit
                              </span>
                            ) : (
                              <span className="text-green-600">
                                Tidak
                              </span>
                            )}

                          </td>

                        </tr>
                      )
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </div>
    
    {showPDF2Form && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">

      {/* HEADER MODAL */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Informasi Absensi
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Masukkan informasi yang akan ditampilkan pada PDF.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPDF2Form(false)}
          className="text-2xl leading-none text-slate-400 hover:text-slate-700"
        >
          ×
        </button>
      </div>

      {/* FORM */}
      <div className="space-y-4 px-6 py-5">

        {/* NAMA */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Nama Karyawan
          </label>

          <input
            type="text"
            value={pdf2Form.namaKaryawan}
            onChange={(e) =>
              setPdf2Form({
                ...pdf2Form,
                namaKaryawan: e.target.value,
              })
            }
            placeholder="Masukkan nama karyawan"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>

        {/* NIP / JABATAN */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            NIP / Jabatan
          </label>

          <input
            type="text"
            value={pdf2Form.nipJabatan}
            onChange={(e) =>
              setPdf2Form({
                ...pdf2Form,
                nipJabatan: e.target.value,
              })
            }
            placeholder="Contoh: 123456 / Operator"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>

        {/* BAGIAN / DEPT */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Bagian / Dept
          </label>

          <input
            type="text"
            value={pdf2Form.bagianDept}
            onChange={(e) =>
              setPdf2Form({
                ...pdf2Form,
                bagianDept: e.target.value,
              })
            }
            placeholder="Contoh: Operasional"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>

        {/* LOKASI PROYEK */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Lokasi Proyek
          </label>

          <input
            type="text"
            value={pdf2Form.lokasiProyek}
            onChange={(e) =>
              setPdf2Form({
                ...pdf2Form,
                lokasiProyek: e.target.value,
              })
            }
            placeholder="Masukkan lokasi proyek"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex justify-end gap-3 border-t bg-slate-50 px-6 py-4">

        <button
          type="button"
          onClick={() => setShowPDF2Form(false)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Batal
        </button>

        <button
          type="button"
          onClick={() => {
            if (!pdf2Form.namaKaryawan.trim()) {
              alert('Nama Karyawan wajib diisi.')
              return
            }

            if (!pdf2Form.nipJabatan.trim()) {
              alert('NIP / Jabatan wajib diisi.')
              return
            }

            if (!pdf2Form.bagianDept.trim()) {
              alert('Bagian / Dept wajib diisi.')
              return
            }

            if (!pdf2Form.lokasiProyek.trim()) {
              alert('Lokasi Proyek wajib diisi.')
              return
            }

            setShowPDF2Form(false)

            exportPDF2(pdf2Form)
          }}
          className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          📄 Generate PDF
        </button>

      </div>
    </div>
  </div>
    )}
    </>
  )
}
