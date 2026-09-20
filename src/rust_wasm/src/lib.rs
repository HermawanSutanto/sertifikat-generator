use lopdf::content::{Content, Operation};
use lopdf::{dictionary, Document, Object, StringFormat};
use serde::{Deserialize, Serialize};
use std::io::{Cursor, Write};
use ttf_parser::Face;
use wasm_bindgen::prelude::*;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

// ---------------------------------------------------------------------------
// Konstanta layout — HARUS sama dengan preview di page.js (lineHeight: 1.2)
// ---------------------------------------------------------------------------
const LINE_HEIGHT_RATIO: f32 = 1.2;
// Metrik fallback (Arial/Helvetica) saat tidak ada font kustom.
const FALLBACK_ASCENT: f32 = 0.905;
const FALLBACK_DESCENT: f32 = 0.212;

const FIRST_CHAR: u32 = 32;
const LAST_CHAR: u32 = 255;
const MISSING_WIDTH: f32 = 500.0;
// Warna teks bawaan (#1A1A1A) bila elemen tidak punya warna / format tidak valid.
const DEFAULT_COLOR: [f32; 3] = [0.1, 0.1, 0.1];

/// Konfigurasi satu elemen teks.
///
/// Koordinat `x`/`y` adalah pojok KIRI-ATAS kotak elemen pada preview
/// (satuan pt, origin di kiri-atas halaman). Konversi ke koordinat PDF
/// (origin kiri-bawah) dan penentuan baseline dilakukan di sini, memakai
/// metrik font yang benar-benar dipakai, sehingga hasilnya sama dengan preview.
#[derive(Serialize, Deserialize, Debug)]
pub struct TextElementConfig {
    pub column_name: String,
    pub static_text: Option<String>,
    pub x: f32,
    pub y: f32,
    pub font_size: f32,
    pub max_width: f32,
    pub line_height: Option<f32>,
    pub align: Option<String>,
    pub page_number: Option<usize>,
    /// Tinggi halaman tujuan (pt), dikirim dari page.js per halaman.
    pub page_height: f32,
    /// Warna teks hex ("#RRGGBB" atau "#RGB"). Opsional.
    pub color: Option<String>,
}

/// Parse "#RRGGBB" / "#RGB" (tanpa/dengan '#') menjadi komponen 0.0..=1.0.
fn parse_hex_color(input: &str) -> Option<[f32; 3]> {
    let h = input.trim().trim_start_matches('#');
    if !h.is_ascii() {
        return None;
    }
    let (r, g, b) = match h.len() {
        3 => {
            let d = |i: usize| u8::from_str_radix(&h[i..i + 1], 16).ok().map(|v| v * 17);
            (d(0)?, d(1)?, d(2)?)
        }
        6 => {
            let d = |i: usize| u8::from_str_radix(&h[i..i + 2], 16).ok();
            (d(0)?, d(2)?, d(4)?)
        }
        _ => return None,
    };
    Some([r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0])
}

pub fn sanitize_name(nama: &str) -> String {
    nama.trim()
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Encoding WinAnsi (dipakai oleh font kustom maupun fallback Helvetica-Bold)
// ---------------------------------------------------------------------------
const WINANSI_80_9F: [char; 32] = [
    '€', '\u{81}', '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ', '‰', 'Š', '‹', 'Œ', '\u{8D}', 'Ž', '\u{8F}',
    '\u{90}', '‘', '’', '“', '”', '•', '–', '—', '˜', '™', 'š', '›', 'œ', '\u{9D}', 'ž', 'Ÿ',
];

fn winansi_to_char(code: u32) -> char {
    if (0x80..=0x9F).contains(&code) {
        WINANSI_80_9F[(code - 0x80) as usize]
    } else {
        char::from_u32(code).unwrap_or(' ')
    }
}

fn encode_winansi_char(ch: char) -> u8 {
    let c = ch as u32;
    if c < 0x20 {
        return b' ';
    }
    if c < 0x7F || (0xA0..=0xFF).contains(&c) {
        return c as u8;
    }
    match WINANSI_80_9F.iter().position(|&x| x == ch) {
        // 0x81, 0x8D, 0x8F, 0x90, 0x9D tidak terdefinisi di WinAnsi
        Some(i) if !matches!(i, 1 | 13 | 15 | 16 | 29) => 0x80 + i as u8,
        _ => b'?',
    }
}

fn encode_winansi(text: &str) -> Vec<u8> {
    text.chars().map(encode_winansi_char).collect()
}

// Lebar glyph Helvetica-Bold (AFM), kode 32..=126, satuan 1/1000 em.
const HELVETICA_BOLD_WIDTHS: [u16; 95] = [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, // 32-47
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, // 48-57
    333, 333, 584, 584, 584, 611, 975, // 58-64
    722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, // A-M
    722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, // N-Z
    333, 278, 333, 584, 556, 333, // 91-96
    556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, // a-m
    611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, // n-z
    389, 280, 389, 584, // 123-126
];

fn helvetica_bold_width(code: u8) -> f32 {
    match code {
        32..=126 => HELVETICA_BOLD_WIDTHS[(code - 32) as usize] as f32,
        0x85 | 0x97 => 1000.0,
        0x91 | 0x92 | 0xA0 => 278.0,
        0x93 | 0x94 => 500.0,
        0x95 => 350.0,
        0x96 => 556.0,
        _ => 611.0,
    }
}

// ---------------------------------------------------------------------------
// Pengukuran teks — satu sumber kebenaran untuk wrap, align, dan baseline
// ---------------------------------------------------------------------------
fn face_width_1000(face: &Face, units_per_em: f32, ch: char) -> Option<f32> {
    face.glyph_index(ch)
        .and_then(|gid| face.glyph_hor_advance(gid))
        .map(|w| w as f32 * 1000.0 / units_per_em)
}

struct FontMetrics<'a> {
    face: Option<Face<'a>>,
    units_per_em: f32,
    /// Rasio ascent/descent terhadap font size (descent bernilai positif).
    ascent: f32,
    descent: f32,
}

impl<'a> FontMetrics<'a> {
    fn new(font_bytes: Option<&'a [u8]>) -> Self {
        if let Some(face) = font_bytes.and_then(|b| Face::parse(b, 0).ok()) {
            let upm = face.units_per_em() as f32;
            if upm > 0.0 {
                let ascent = face.ascender() as f32 / upm;
                let descent = -(face.descender() as f32) / upm;
                if ascent + descent > 0.0 {
                    return Self { face: Some(face), units_per_em: upm, ascent, descent };
                }
            }
        }
        Self {
            face: None,
            units_per_em: 1000.0,
            ascent: FALLBACK_ASCENT,
            descent: FALLBACK_DESCENT,
        }
    }

    /// Lebar satu byte WinAnsi dalam 1/1000 em.
    fn code_width_1000(&self, code: u8) -> f32 {
        match &self.face {
            Some(face) => face_width_1000(face, self.units_per_em, winansi_to_char(code as u32))
                .unwrap_or(MISSING_WIDTH),
            None => helvetica_bold_width(code),
        }
    }

    fn char_width(&self, ch: char, font_size: f32) -> f32 {
        self.code_width_1000(encode_winansi_char(ch)) / 1000.0 * font_size
    }

    fn text_width(&self, text: &str, font_size: f32) -> f32 {
        text.chars().map(|c| self.char_width(c, font_size)).sum()
    }
}

/// Word-wrap greedy berdasarkan lebar glyph asli (bukan perkiraan per karakter).
fn wrap_text(text: &str, font_size: f32, max_width: f32, m: &FontMetrics) -> Vec<String> {
    let space_w = m.char_width(' ', font_size);
    let mut lines: Vec<String> = Vec::with_capacity(4);
    let mut current = String::with_capacity(64);
    let mut current_w = 0.0_f32;

    for word in text.split_whitespace() {
        let word_w = m.text_width(word, font_size);

        // Kata tunggal lebih lebar dari kotak: pecah per karakter.
        if word_w > max_width {
            if !current.is_empty() {
                lines.push(std::mem::take(&mut current));
            }
            let mut chunk = String::with_capacity(32);
            let mut chunk_w = 0.0_f32;
            for ch in word.chars() {
                let cw = m.char_width(ch, font_size);
                if chunk_w + cw > max_width && !chunk.is_empty() {
                    lines.push(std::mem::take(&mut chunk));
                    chunk_w = 0.0;
                }
                chunk.push(ch);
                chunk_w += cw;
            }
            current = chunk;
            current_w = chunk_w;
            continue;
        }

        if current.is_empty() {
            current.push_str(word);
            current_w = word_w;
        } else if current_w + space_w + word_w > max_width {
            lines.push(std::mem::replace(&mut current, word.to_string()));
            current_w = word_w;
        } else {
            current.push(' ');
            current.push_str(word);
            current_w += space_w + word_w;
        }
    }

    if !current.is_empty() {
        lines.push(current);
    }
    lines
}

fn interpolate_template(template: &str, row: &serde_json::Value) -> String {
    let mut result = template.to_string();

    if let Some(obj) = row.as_object() {
        for (key, val) in obj {
            let val_str: String = match val {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Number(n) => n.to_string(),
                _ => String::new(),
            };

            let placeholder_normal = format!("{{{}}}", key);
            if result.contains(&placeholder_normal) {
                result = result.replace(&placeholder_normal, &val_str);
            }

            let placeholder_upper = format!("{{{}:uppercase}}", key);
            if result.contains(&placeholder_upper) {
                result = result.replace(&placeholder_upper, &val_str.to_uppercase());
            }
        }
    }

    result
}

fn embed_truetype_font(doc: &mut Document, font_bytes: &[u8]) -> Result<lopdf::ObjectId, String> {
    let face = Face::parse(font_bytes, 0).map_err(|e| format!("Font gagal diparse: {:?}", e))?;

    let units_per_em = face.units_per_em() as f32;
    let scale = if units_per_em > 0.0 { 1000.0 / units_per_em } else { 1.0 };

    // Lebar per kode WinAnsi — dibangun dengan pemetaan yang sama seperti
    // encode_winansi(), jadi /Widths konsisten dengan pengukuran teks.
    let mut widths = Vec::with_capacity((LAST_CHAR - FIRST_CHAR + 1) as usize);
    for code in FIRST_CHAR..=LAST_CHAR {
        let ch = winansi_to_char(code);
        let width = face
            .glyph_index(ch)
            .and_then(|gid| face.glyph_hor_advance(gid))
            .map(|w| w as f32 * scale)
            .unwrap_or(MISSING_WIDTH);
        widths.push(Object::Integer(width.round() as i64));
    }

    let bbox = face.global_bounding_box();
    let font_bbox = vec![
        Object::Real(bbox.x_min as f32 * scale),
        Object::Real(bbox.y_min as f32 * scale),
        Object::Real(bbox.x_max as f32 * scale),
        Object::Real(bbox.y_max as f32 * scale),
    ];

    let ascent = (face.ascender() as f32 * scale).round();
    let descent = (face.descender() as f32 * scale).round();
    let cap_height = face.capital_height().map(|h| (h as f32 * scale).round()).unwrap_or(ascent);
    let italic_angle = face.italic_angle().unwrap_or(0.0);

    let mut font_file_stream = lopdf::Stream::new(
        dictionary! { "Length1" => font_bytes.len() as i64 },
        font_bytes.to_vec(),
    );
    let _ = font_file_stream.compress();
    let font_file_id = doc.add_object(font_file_stream);

    let descriptor_dict = dictionary! {
        "Type" => "FontDescriptor",
        "FontName" => "CustomFont",
        "Flags" => 32i64,
        "FontBBox" => font_bbox,
        "ItalicAngle" => italic_angle,
        "Ascent" => ascent,
        "Descent" => descent,
        "CapHeight" => cap_height,
        "StemV" => 80i64,
        "MissingWidth" => MISSING_WIDTH as i64,
        "FontFile2" => font_file_id,
    };
    let descriptor_id = doc.add_object(descriptor_dict);

    let font_dict = dictionary! {
        "Type" => "Font",
        "Subtype" => "TrueType",
        "BaseFont" => "CustomFont",
        "FirstChar" => FIRST_CHAR as i64,
        "LastChar" => LAST_CHAR as i64,
        "Widths" => widths,
        "FontDescriptor" => descriptor_id,
        "Encoding" => "WinAnsiEncoding",
    };

    Ok(doc.add_object(font_dict))
}

#[wasm_bindgen]
pub fn generate_certificates_chunk(
    template_bytes: &[u8],
    csv_rows_json: JsValue,
    configs_json: JsValue,
    start_idx: usize,
    font_bytes: Option<Vec<u8>>,
) -> Result<Vec<u8>, JsValue> {
    let csv_rows: Vec<serde_json::Value> = serde_wasm_bindgen::from_value(csv_rows_json)
        .map_err(|e| JsValue::from_str(&format!("Gagal membaca data CSV: {}", e)))?;

    let configs: Vec<TextElementConfig> = serde_wasm_bindgen::from_value(configs_json)
        .map_err(|e| JsValue::from_str(&format!("Gagal membaca konfigurasi elemen: {}", e)))?;

    let mut base_doc = Document::load_mem(template_bytes)
        .map_err(|e| JsValue::from_str(&format!("Gagal membaca template PDF: {}", e)))?;

    let font_id = match font_bytes.as_deref() {
        Some(bytes) => embed_truetype_font(&mut base_doc, bytes)
            .map_err(|err| JsValue::from_str(&format!("Gagal embed font kustom: {}", err)))?,
        None => {
            // WinAnsi supaya karakter Latin-1 (é, ü, dst.) dan tanda kutip melengkung tampil benar.
            let font_dict = dictionary! {
                "Type" => "Font",
                "Subtype" => "Type1",
                "BaseFont" => "Helvetica-Bold",
                "Encoding" => "WinAnsiEncoding",
            };
            base_doc.add_object(font_dict)
        }
    };

    let pages = base_doc.get_pages();
    for page_id in pages.values() {
        if let Ok(page_dict) = base_doc.get_dictionary_mut(*page_id) {
            if let Ok(resources_obj) = page_dict.get_mut(b"Resources") {
                if let Ok(res_dict) = resources_obj.as_dict_mut() {
                    if let Ok(font_obj) = res_dict.get_mut(b"Font") {
                        if let Ok(font_dict_mut) = font_obj.as_dict_mut() {
                            font_dict_mut.set("F1", font_id);
                        }
                    } else {
                        res_dict.set("Font", dictionary! { "F1" => font_id });
                    }
                }
            }
        }
    }

    // Diparse sekali per chunk, dipakai untuk semua baris.
    let metrics = FontMetrics::new(font_bytes.as_deref());

    let mut zip_buffer = Vec::with_capacity(1024 * 1024 * 10);
    {
        let mut zip = ZipWriter::new(Cursor::new(&mut zip_buffer));
        let zip_options = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored);

        for (i, row) in csv_rows.iter().enumerate() {
            let global_idx = start_idx + i + 1;
            let mut doc = base_doc.clone();

            let main_name = row
                .get("Nama")
                .or_else(|| row.get("nama"))
                .and_then(|v| v.as_str())
                .unwrap_or("peserta");
            let file_name_sanitized = sanitize_name(main_name);

            for (page_num, page_id) in &pages {
                // q/Q mengisolasi graphics state agar tidak terpengaruh isi template.
                let mut operations = Vec::with_capacity(32);
                operations.push(Operation::new("q", vec![]));
                operations.push(Operation::new("BT", vec![]));
                operations.push(Operation::new(
                    "rg",
                    vec![DEFAULT_COLOR[0].into(), DEFAULT_COLOR[1].into(), DEFAULT_COLOR[2].into()],
                ));

                let mut has_operations = false;

                for cfg in &configs {
                    let target_page = cfg.page_number.unwrap_or(1);
                    if target_page as u32 != *page_num {
                        continue;
                    }

                    let raw_text = if let Some(ref st) = cfg.static_text {
                        interpolate_template(st, row)
                    } else {
                        row.get(&cfg.column_name)
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string()
                    };

                    if raw_text.trim().is_empty() {
                        continue;
                    }

                    has_operations = true;

                    // Warna per elemen (persisten di dalam BT, jadi set eksplisit untuk tiap elemen).
                    let [cr, cg, cb] = cfg
                        .color
                        .as_deref()
                        .and_then(parse_hex_color)
                        .unwrap_or(DEFAULT_COLOR);
                    operations.push(Operation::new("rg", vec![cr.into(), cg.into(), cb.into()]));

                    let fs = cfg.font_size;
                    let lines = wrap_text(&raw_text, fs, cfg.max_width, &metrics);
                    let line_height = cfg.line_height.unwrap_or(fs * LINE_HEIGHT_RATIO);
                    let align = cfg.align.as_deref().unwrap_or("left");

                    // Sama dengan CSS: teks berada di tengah line box (half-leading),
                    // baseline = tepi atas line box + half-leading + ascent.
                    let content_h = (metrics.ascent + metrics.descent) * fs;
                    let baseline_from_top = (line_height - content_h) / 2.0 + metrics.ascent * fs;
                    let first_baseline_y = cfg.page_height - cfg.y - baseline_from_top;

                    for (line_idx, line_str) in lines.iter().enumerate() {
                        let current_y = first_baseline_y - (line_idx as f32 * line_height);
                        let line_width = metrics.text_width(line_str, fs);

                        let adjusted_x = match align {
                            "center" => cfg.x + ((cfg.max_width - line_width) / 2.0),
                            "right" => cfg.x + (cfg.max_width - line_width),
                            _ => cfg.x,
                        };

                        operations.push(Operation::new("Tf", vec!["F1".into(), fs.into()]));
                        // Tm absolut: tidak ada state posisi yang menumpuk antar baris.
                        operations.push(Operation::new(
                            "Tm",
                            vec![
                                1.0_f32.into(),
                                0.0_f32.into(),
                                0.0_f32.into(),
                                1.0_f32.into(),
                                adjusted_x.into(),
                                current_y.into(),
                            ],
                        ));
                        operations.push(Operation::new(
                            "Tj",
                            vec![Object::String(encode_winansi(line_str), StringFormat::Literal)],
                        ));
                    }
                }

                if has_operations {
                    operations.push(Operation::new("ET", vec![]));
                    operations.push(Operation::new("Q", vec![]));
                    let content_ops = Content { operations };
                    let _ = doc.add_to_page_content(*page_id, content_ops);
                }
            }

            let mut pdf_bytes = Vec::with_capacity(1024 * 100);
            doc.save_to(&mut pdf_bytes)
                .map_err(|e| JsValue::from_str(&format!("Gagal menyusun sertifikat: {}", e)))?;

            let file_name = format!(
                "sertifikat_{}_{}.pdf",
                file_name_sanitized.to_lowercase().replace(' ', "_"),
                global_idx
            );
            zip.start_file(file_name, zip_options)
                .map_err(|e| JsValue::from_str(&format!("Gagal membuat berkas ZIP: {}", e)))?;
            zip.write_all(&pdf_bytes)
                .map_err(|e| JsValue::from_str(&format!("Gagal menulis ke ZIP: {}", e)))?;
        }

        zip.finish()
            .map_err(|e| JsValue::from_str(&format!("Gagal menutup ZIP: {}", e)))?;
    }

    Ok(zip_buffer)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn winansi_roundtrip() {
        assert_eq!(encode_winansi("Aé’"), vec![b'A', 0xE9, 0x92]);
        assert_eq!(encode_winansi("日"), vec![b'?']);
    }

    #[test]
    fn helvetica_bold_known_widths() {
        let m = FontMetrics::new(None);
        // "AB" = 722 + 722 pada 10pt => 14.44
        assert!((m.text_width("AB", 10.0) - 14.44).abs() < 0.01);
    }

    #[test]
    fn hex_color_parsing() {
        assert_eq!(parse_hex_color("#FF0000"), Some([1.0, 0.0, 0.0]));
        assert_eq!(parse_hex_color("0f0"), Some([0.0, 1.0, 0.0]));
        assert_eq!(parse_hex_color("#12"), None);
        assert_eq!(parse_hex_color("#GGGGGG"), None);
        assert_eq!(parse_hex_color("#éééé"), None);
    }

    #[test]
    fn wrap_respects_width() {
        let m = FontMetrics::new(None);
        let lines = wrap_text("Muhammad Rizky Ramadhan Putra", 20.0, 150.0, &m);
        assert!(lines.len() > 1);
        for l in &lines {
            assert!(m.text_width(l, 20.0) <= 150.0 + 0.01, "baris melebihi lebar: {}", l);
        }
    }

    #[test]
    fn wrap_splits_overlong_word() {
        let m = FontMetrics::new(None);
        let lines = wrap_text("Supercalifragilisticexpialidocious", 20.0, 100.0, &m);
        assert!(lines.len() > 1);
    }
}