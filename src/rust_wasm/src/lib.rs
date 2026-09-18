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
    pub align: Option<String>, // "left", "center", atau "right"
}

pub fn sanitize_name(nama: &str) -> String {
    nama.trim()
        .replace('/', "_")
        .replace('\\', "_")
        .replace(':', "_")
}

fn wrap_text(text: &str, font_size: f32, max_width: f32) -> Vec<String> {
    let approx_char_width = font_size * 0.52;
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut lines = Vec::new();
    let mut current_line = String::new();

    for word in words {
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
            let page_id = *pages.get(&1).ok_or_else(|| {
                JsValue::from_str("Template PDF tidak memiliki halaman pertama.")
            })?;

            // Registrasi Font Helvetica-Bold
            let font_dict = dictionary! {
                "Type" => "Font",
                "Subtype" => "Type1",
                "BaseFont" => "Helvetica-Bold",
            };
            let font_id = doc.add_object(font_dict);

            if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
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

            let main_name = row
                .get("Nama")
                .or_else(|| row.get("nama"))
                .and_then(|v| v.as_str())
                .unwrap_or("peserta");
            let file_name_sanitized = sanitize_name(main_name);

            let mut operations = vec![
                Operation::new("BT", vec![]),
                Operation::new("rg", vec![0.1.into(), 0.1.into(), 0.1.into()]),
            ];

            for cfg in &configs {
                let text_val = if let Some(ref st) = cfg.static_text {
                        st.as_str()
                    } else {
                        row.get(&cfg.column_name)
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                    };

                if text_val.is_empty() {
                    continue;
                }

                let lines = wrap_text(text_val, cfg.font_size, cfg.max_width);
                let line_height = cfg.line_height.unwrap_or(cfg.font_size * 1.2);
                let align = cfg.align.as_deref().unwrap_or("left");
                let approx_char_width = cfg.font_size * 0.52;

                for (line_idx, line_str) in lines.iter().enumerate() {
                    let current_y = cfg.y - (line_idx as f32 * line_height);
                    let line_width = line_str.len() as f32 * approx_char_width;

                    // Hitung Offset X berdasarkan pilihan Alignment
                    let adjusted_x = match align {
                        "center" => cfg.x + ((cfg.max_width - line_width) / 2.0),
                        "right" => cfg.x + (cfg.max_width - line_width),
                        _ => cfg.x, // "left" / default
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

            operations.push(Operation::new("ET", vec![]));

            let content_ops = Content { operations };
            let _ = doc.add_to_page_content(page_id, content_ops);

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