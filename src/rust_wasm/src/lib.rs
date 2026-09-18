use lopdf::content::{Content, Operation};
use lopdf::{dictionary, Document, Object, StringFormat};
use std::io::{Cursor, Write};
use wasm_bindgen::prelude::*;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

pub fn sanitize_name(nama: &str) -> String {
    nama.trim()
        .replace('/', "_")
        .replace('\\', "_")
        .replace(':', "_")
}

#[wasm_bindgen]
pub fn generate_certificates_zip(
    template_bytes: &[u8],
    names: JsValue,
) -> Result<Vec<u8>, JsValue> {
    let list_nama: Vec<String> = serde_wasm_bindgen::from_value(names)
        .map_err(|e| JsValue::from_str(&format!("Gagal membaca daftar nama: {}", e)))?;

    let doc_template = Document::load_mem(template_bytes)
        .map_err(|e| JsValue::from_str(&format!("Gagal membaca template PDF: {}", e)))?;

    let mut zip_buffer = Vec::new();
    {
        let mut zip = ZipWriter::new(Cursor::new(&mut zip_buffer));
        let zip_options = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        for (i, raw_nama) in list_nama.iter().enumerate() {
            let nama = sanitize_name(raw_nama);
            let mut doc = doc_template.clone();

            let pages = doc.get_pages();
            let page_id = *pages.get(&1).ok_or_else(|| {
                JsValue::from_str("Template PDF tidak memiliki halaman pertama.")
            })?;

            let (page_width, page_height) = get_page_size(&doc, page_id);

            // 1. DAFTARKAN FONT HELVETICA-BOLD
            let font_dict = dictionary! {
                "Type" => "Font",
                "Subtype" => "Type1",
                "BaseFont" => "Helvetica-Bold",
            };
            let font_id = doc.add_object(font_dict);

            // 2. MASUKKAN FONT F1 KE DALAM DICTIONARY RESOURCES HALAMAN
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
                } else {
                    page_dict.set(
                        "Resources",
                        dictionary! {
                            "Font" => dictionary! { "F1" => font_id }
                        },
                    );
                }
            }

            // 3. KALKULASI UKURAN FONT & POSISI TEKS
            let mut font_size = 32.0f32;
            if nama.len() > 25 {
                font_size = 24.0;
            } else if nama.len() > 35 {
                font_size = 18.0;
            }

            let approx_char_width = font_size * 0.52;
            let text_width = nama.len() as f32 * approx_char_width;
            let x_pos = (page_width - text_width) / 2.0;
            let y_pos = (page_height / 2.0) - 10.0;

            // 4. SUSUN OPERASI OPERATOR PDF STREAM
            let content_ops = Content {
                operations: vec![
                    Operation::new("BT", vec![]),
                    Operation::new("Tf", vec!["F1".into(), font_size.into()]), // Operator font & size
                    Operation::new("rg", vec![0.1.into(), 0.1.into(), 0.1.into()]), // Warna RGB Hitam Pekat
                    Operation::new("Td", vec![x_pos.into(), y_pos.into()]), // Pindahkan posisi kursor
                    Operation::new("Tj", vec![Object::String(nama.as_bytes().to_vec(), StringFormat::Literal)]),
                    Operation::new("ET", vec![]),
                ],
            };

            let _ = doc.add_to_page_content(page_id, content_ops);

            let mut pdf_bytes = Vec::new();
            doc.save_to(&mut pdf_bytes)
                .map_err(|e| JsValue::from_str(&format!("Gagal membuat sertifikat: {}", e)))?;

            let file_name = format!("sertifikat_{}_{}.pdf", nama.to_lowercase().replace(' ', "_"), i + 1);
            zip.start_file(file_name, zip_options)
                .map_err(|e| JsValue::from_str(&format!("Gagal menambahkan ke ZIP: {}", e)))?;
            zip.write_all(&pdf_bytes)
                .map_err(|e| JsValue::from_str(&format!("Gagal menulis byte ZIP: {}", e)))?;
        }

        zip.finish()
            .map_err(|e| JsValue::from_str(&format!("Gagal menyelesaikan kompresi ZIP: {}", e)))?;
    }

    Ok(zip_buffer)
}

fn get_page_size(doc: &Document, page_id: (u32, u16)) -> (f32, f32) {
    if let Ok(page_dict) = doc.get_dictionary(page_id) {
        if let Ok(box_obj) = page_dict.get(b"MediaBox") {
            if let Ok(array) = box_obj.as_array() {
                if array.len() >= 4 {
                    let w = array[2].as_float().unwrap_or(595.28);
                    let h = array[3].as_float().unwrap_or(841.89);
                    return (w, h);
                }
            }
        }
    }
    (595.28, 841.89)
}