import { Archivo_Black, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "../context/AuthContext"; // <-- IMPORT

// Font tema SertiGen: Archivo Black untuk judul/display, Inter untuk body,
// JetBrains Mono untuk label/UI teknis. Disamakan dengan yang dipakai di
// landing page (page.js) dan dashboard (dashboard/page.js) agar konsisten
// di seluruh aplikasi (login, register, blog, dsb).
const displayFont = Archivo_Black({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display"
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body"
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export const metadata = {
  title: "SertiGen: Generator Sertifikat Online Cepat & Mudah",
  description:
    "Buat ribuan sertifikat personal secara otomatis. Cukup unggah template, masukkan daftar nama, dan unduh sertifikat berkualitas tinggi dalam hitungan menit.",
  keywords:
    "generator sertifikat, buat sertifikat online, aplikasi sertifikat, sertifikat massal, otomatisasi sertifikat, SertiGen",
  openGraph: {
    title: "SertiGen: Generator Sertifikat Online Cepat & Mudah",
    description: "Buat ribuan sertifikat personal secara otomatis dan cepat.",
    url: "https://cert.krovida.my.id//", // Ganti dengan URL domain Anda
    siteName: "SertiGen",
    images: [
      {
        url: "/og-image.png", // Pastikan gambar ini ada di folder /public
        width: 1200,
        height: 630
      }
    ],
    icons: {
    icon: '/favicon.png', // Mengarah ke public/favicon.png
    },
    locale: "id_ID",
    type: "website"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto&family=Montserrat&family=Playfair+Display&family=Poppins&family=Lora&family=Pacifico&family=Caveat&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} bg-[#EBE9E4] text-[#111111]`}>
        <AuthContextProvider>{children}</AuthContextProvider>
      </body>
    </html>
  );
}
