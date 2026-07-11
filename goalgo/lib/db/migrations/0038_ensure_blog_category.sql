-- Portal geneli tek kategori tablosu; blog vitrin linkleri /kategori/blog için slug gerekir.
INSERT INTO categories (name, slug, color)
VALUES ('Blog', 'blog', '#64748b')
ON CONFLICT (slug) DO NOTHING;
