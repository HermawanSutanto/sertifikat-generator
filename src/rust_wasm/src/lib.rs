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
    pub page_number: Option<usize>,
}

pub fn sanitize_name(nama: &str) -> String {
    nama.trim()
        .replace('/', "_")
        .replace('\\', "_")
        .replace(':', "_")
}

// Algoritma Word-Wrapping Presisi dengan Alokasi Memori Efisien
fn wrap_text(text: &str, font_size: f32, max_width: f32) -> Vec<String> {
    let approx_char_width = font_size * 0.52;
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut lines = Vec::with_capacity(4);
    let mut current_line = String::with_capacity(64);

    for word in words {
        let word_width = word.len() as f32 * approx_char_width;

        // Fallback: Kata tunggal yang melebihi max_width
        if word_width > max_width {
            if !current_line.is_empty() {
                lines.push(current_line.clone());
                current_line.clear();
            }

            let mut char_chunk = String::with_capacity(32);
            for ch in word.chars() {
                let char_len = ch.len_utf8();
                let test_len = char_chunk.len() + char_len;

                if (test_len as f32 * approx_char_width) > max_width && !char_chunk.is_empty() {
                    lines.push(char_chunk.clone());
                    char_chunk.clear();
                }
                char_chunk.push(ch);
            }
            if !char_chunk.is_empty() {
                current_line = char_chunk;
            }
            continue;
        }

        // Kasus Normal Word-Level Break
        let space_needed = if current_line.is_empty() { 0 } else { 1 };
        let test_len = current_line.len() + space_needed + word.len();
        let test_width = test_len as f32 * approx_char_width;

        if test_width > max_width && !current_line.is_empty() {
            lines.push(current_line.clone());
            current_line.clear();
            current_line.push_str(word);
        } else {
            if !current_line.is_empty() {
                current_line.push(' ');
            }
            current_line.push_str(word);
        }
    }

    if !current_line.is_empty() {
        lines.push(current_line);
    }

    lines
}

// Interpolasi Template String Tanpa Regex untuk Kecepatan Maksimal
fn interpolate_template(template: &str, row: &serde_json::Value) -> String {
    let mut result = template.to_string();

    if let Some(obj) = row.as_object() {
        for (key, val) in obj {
            let val_str = match val {
                serde_json::Value::String(s) => s.as_str(),
                serde_json::Value::Number(n) => &n.to_string(),
                _ => "",
            };

            let placeholder_normal = format!("{{{}}}", key);
            if result.contains(&placeholder_normal) {
                result = result.replace(&placeholder_normal, val_str);
            }

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

    // Load PDF Base Template Sekali di Awal
    let mut base_doc = Document::load_mem(template_bytes)
        .map_err(|e| JsValue::from_str(&format!("Gagal membaca template PDF: {}", e)))?;

    // Registrasi Font Helvetica-Bold Sekali di Master Template
    let font_dict = dictionary! {
        "Type" => "Font",
        "Subtype" => "Type1",
        "BaseFont" => "Helvetica-Bold",
    };
    let font_id = base_doc.add_object(font_dict);

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

    let mut zip_buffer = Vec::with_capacity(1024 * 1024 * 10); // Pre-allocate 10MB Buffer
    {
        let mut zip = ZipWriter::new(Cursor::new(&mut zip_buffer));
        
        // OPTIMASI UTAMA: Gunakan Stored (tanpa re-kompresi) agar ZIP tereksekusi instan
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
                let mut operations = Vec::with_capacity(32);
                operations.push(Operation::new("BT", vec![]));
                operations.push(Operation::new("rg", vec![0.1.into(), 0.1.into(), 0.1.into()]));

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

            let mut pdf_bytes = Vec::with_capacity(1024 * 100);
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