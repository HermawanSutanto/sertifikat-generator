import { Fraunces, Public_Sans } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "../context/AuthContext"; // <-- IMPORT

// Font tema SertiGen: Fraunces untuk judul/display, Public Sans untuk body.
// Disamakan dengan yang dipakai di landing page (page.js) agar konsisten
// di seluruh aplikasi (login, register, dashboard, dsb).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display"
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body"
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
      <body className={`${fraunces.variable} ${publicSans.variable} bg-[#F2EAD3] text-[#17233D]`}>
        <AuthContextProvider>{children}</AuthContextProvider>
      </body>
    </html>
  );
}
