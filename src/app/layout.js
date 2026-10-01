import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "../context/AuthContext";

// Menggantikan Archivo_Black dengan Plus_Jakarta_Sans agar tampilan judul
// modern, berlekuk luwes, proporsional, dan tidak kaku/kotak-kotak.
const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata = {
  metadataBase: new URL("https://cert.krovida.my.id"),
  title: "SertiGen — Generator Sertifikat Massal Otomatis dari Excel & CSV",
  description:
    "Cetak ratusan hingga ribuan sertifikat PDF berkualitas tinggi dalam hitungan detik. Cukup unggah template PDF dan daftar nama peserta dari CSV/Excel. Cepat, presisi, dan diproses langsung di browser.",
  keywords: [
    "generator sertifikat massal",
    "aplikasi pembuat sertifikat otomatis",
    "cetak sertifikat dari excel",
    "mail merge sertifikat pdf",
    "buat sertifikat online gratis",
    "sertifikat webinar otomatis",
    "SertiGen",
  ],
  authors: [{ name: "SertiGen Team" }],
  creator: "SertiGen",
  publisher: "SertiGen",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "SertiGen — Generator Sertifikat Massal Otomatis dari Excel & CSV",
    description:
      "Tinggalkan edit sertifikat manual satu per satu. Pasang template PDF, masukkan CSV peserta, dan unduh berkas PDF siap cetak beresolusi tinggi langsung dari browser.",
    url: "https://cert.krovida.my.id",
    siteName: "SertiGen",
    locale: "id_ID",
    type: "website",
    // Property 'images' otomatis disisipkan Next.js lewat opengraph-image.png
  },
  twitter: {
    card: "summary_large_image",
    title: "SertiGen — Generator Sertifikat Massal Otomatis",
    description:
      "Otomatisasi pembuatan sertifikat massal bertenaga Rust WebAssembly. Cepat, aman, dan tanpa instalasi aplikasi berat.",
    // Property 'images' otomatis disisipkan Next.js lewat twitter-image.png
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Montserrat:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Poppins:wght@400;600;700&family=Lora:ital,wght@0,600;1,400&family=Pacifico&family=Caveat:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} bg-[#FFFFFF] text-[#111111] antialiased`}
      >
        <AuthContextProvider>{children}</AuthContextProvider>
      </body>
    </html>
  );
}