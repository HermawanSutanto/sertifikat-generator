use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct TextLayout {
    pub x: f32,
    pub y: f32,
    pub font_size: f32,
}

#[wasm_bindgen]
pub fn calculate_text_layout(nama: &str, page_width: f32, page_height: f32) -> TextLayout {
    let mut font_size = 32.0;
    
    // Auto-scale down jika nama peserta terlalu panjang agar tidak terpotong
    if nama.len() > 25 {
        font_size = 24.0;
    } else if nama.len() > 35 {
        font_size = 18.0;
    }

    // Estimasi lebar teks dan center-alignment
    let approx_char_width = font_size * 0.55;
    let text_width = nama.len() as f32 * approx_char_width;
    let x_pos = (page_width - text_width) / 2.0;
    let y_pos = (page_height / 2.0) - 20.0;

    TextLayout {
        x: x_pos,
        y: y_pos,
        font_size,
    }
}

#[wasm_bindgen]
pub fn sanitize_name(nama: &str) -> String {
    nama.trim()
        .replace('/', "_")
        .replace('\\', "_")
        .replace(':', "_")
}