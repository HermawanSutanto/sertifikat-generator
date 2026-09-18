use lopdf::content::{Content, Operation};
use lopdf::{dictionary, Document, Object, StringFormat};
use serde::{Deserialize, Serialize};
use std::io::{Cursor, Write};
use wasm_bindgen::prelude::*;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

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
    pub page_number: Option<usize>, // Halaman target (Default: 1)
}

pub fn sanitize_name(nama: &str) -> String {
    nama.trim()
        .replace('/', "_")
        .replace('\\', "_")
        .replace(':', "_")
}

// Algoritma Word-Wrapping Presisi dengan Character-Level Break
fn wrap_text(text: &str, font_size: f32, max_width: f32) -> Vec<String> {
    let approx_char_width = font_size * 0.52; // Estimasi lebar karakter Helvetica-Bold
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut lines = Vec::new();
    let mut current_line = String::new();

    for word in words {
        let word_width = word.len() as f32 * approx_char_width;

        // KASUS KATA SANGAT PANJANG (melebihi max_width sendirian): Potong per karakter
        if word_width > max_width {
            if !current_line.is_empty() {
                lines.push(current_line.clone());
                current_line.clear();
            }

            let mut char_chunk = String::new();
            for ch in word.chars() {
                let test_chunk = format!("{}{}", char_chunk, ch);
                if (test_chunk.len() as f32 * approx_char_width) > max_width && !char_chunk.is_empty() {
                    lines.push(char_chunk);
                    char_chunk = ch.to_string();
                } else {
                    char_chunk = test_chunk;
                }
            }
            if !char_chunk.is_empty() {
                current_line = char_chunk;
            }
            continue;
        }

        // KASUS NORMAL: Gabungkan kata ke baris aktif
        let test_line = if current_line.is_empty() {
            word.to_string()
        } else {
            format!("{} {}", current_line, word)
        };

        let test_width = test_line.len() as f32 * approx_char_width;

        if test_width > max_width && !current_line.is_empty() {
            lines.push(current_line);
            current_line = word.to_string();
        } else {
            current_line = test_line;
        }
    }

    if !current_line.is_empty() {
        lines.push(current_line);
    }

    lines
}

// Helper untuk parsing template string {Kolom} dan {Kolom:uppercase}
fn interpolate_template(template: &str, row: &serde_json::Value) -> String {
    let mut result = template.to_string();

    if let Some(obj) = row.as_object() {
        for (key, val) in obj {
            let val_str = match val {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Number(n) => n.to_string(),
                _ => String::new(),
            };

            // 1. Placeholder standar {Nama}
            let placeholder_normal = format!("{{{}}}", key);
            if result.contains(&placeholder_normal) {
                result = result.replace(&placeholder_normal, &val_str);
            }

            // 2. Placeholder modifier {Nama:uppercase}
            let placeholder_upper = format!("{{{}:uppercase}}", key);
            if result.contains(&placeholder_upper) {
                result = result.replace(&placeholder_upper, &val_str.to_uppercase());
            }
        }
    }

    result
}

#[wasm_bindgen]
pub fn generate_certificates_chunk(
    template_bytes: &[u8],
    csv_rows_json: JsValue,
    configs_json: JsValue,
    start_idx: usize,
) -> Result<Vec<u8>, JsValue> {
    let csv_rows: Vec<serde_json::Value> = serde_wasm_bindgen::from_value(csv_rows_json)
        .map_err(|e| JsValue::from_str(&format!("Gagal membaca data CSV: {}", e)))?;

    let configs: Vec<TextElementConfig> = serde_wasm_bindgen::from_value(configs_json)
        .map_err(|e| JsValue::from_str(&format!("Gagal membaca konfigurasi elemen: {}", e)))?;

    let doc_template = Document::load_mem(template_bytes)
        .map_err(|e| JsValue::from_str(&format!("Gagal membaca template PDF: {}", e)))?;

    let mut zip_buffer = Vec::new();
    {
        let mut zip = ZipWriter::new(Cursor::new(&mut zip_buffer));
        let zip_options = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        for (i, row) in csv_rows.iter().enumerate() {
            let global_idx = start_idx + i + 1;
            let mut doc = doc_template.clone();

            let pages = doc.get_pages();

            // Registrasi Font Helvetica-Bold di semua halaman PDF yang ada
            let font_dict = dictionary! {
                "Type" => "Font",
                "Subtype" => "Type1",
                "BaseFont" => "Helvetica-Bold",
            };
            let font_id = doc.add_object(font_dict);

            for page_id in pages.values() {
                if let Ok(page_dict) = doc.get_dictionary_mut(*page_id) {
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

            let main_name = row
                .get("Nama")
                .or_else(|| row.get("nama"))
                .and_then(|v| v.as_str())
                .unwrap_or("peserta");
            let file_name_sanitized = sanitize_name(main_name);

            // Grouping elemen teks berdasarkan target halaman (page_number)
            for (page_num, page_id) in &pages {
                let mut operations = vec![
                    Operation::new("BT", vec![]),
                    Operation::new("rg", vec![0.1.into(), 0.1.into(), 0.1.into()]),
                ];

                let mut has_operations = false;

                for cfg in &configs {
                    let target_page = cfg.page_number.unwrap_or(1);
                    if target_page as u32 != *page_num {
                        continue;
                    }

                    // Tentukan isi teks: Interpolasi template jika ada static_text, atau ambil langsung dari CSV
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

                    let lines = wrap_text(&raw_text, cfg.font_size, cfg.max_width);
                    let line_height = cfg.line_height.unwrap_or(cfg.font_size * 1.2);
                    let align = cfg.align.as_deref().unwrap_or("left");
                    let approx_char_width = cfg.font_size * 0.52;

                    for (line_idx, line_str) in lines.iter().enumerate() {
                        let current_y = cfg.y - (line_idx as f32 * line_height);
                        let line_width = line_str.len() as f32 * approx_char_width;

                        let adjusted_x = match align {
                            "center" => cfg.x + ((cfg.max_width - line_width) / 2.0),
                            "right" => cfg.x + (cfg.max_width - line_width),
                            _ => cfg.x,
                        };

                        operations.push(Operation::new("Tf", vec!["F1".into(), cfg.font_size.into()]));
                        operations.push(Operation::new("Td", vec![adjusted_x.into(), current_y.into()]));
                        operations.push(Operation::new(
                            "Tj",
                            vec![Object::String(line_str.as_bytes().to_vec(), StringFormat::Literal)],
                        ));
                        operations.push(Operation::new("Td", vec![(-adjusted_x).into(), (-current_y).into()]));
                    }
                }

                if has_operations {
                    operations.push(Operation::new("ET", vec![]));
                    let content_ops = Content { operations };
                    let _ = doc.add_to_page_content(*page_id, content_ops);
                }
            }

            let mut pdf_bytes = Vec::new();
            doc.save_to(&mut pdf_bytes)
                .map_err(|e| JsValue::from_str(&format!("Gagal menyusun sertifikat: {}", e)))?;

            let file_name = format!(
                "sertifikat_{}_{}.pdf",
                file_name_sanitized.to_lowercase().replace(' ', "_"),
                global_idx
            );
            zip.start_file(file_name, zip_options).unwrap();
            zip.write_all(&pdf_bytes).unwrap();
        }

        zip.finish().unwrap();
    }

    Ok(zip_buffer)
}