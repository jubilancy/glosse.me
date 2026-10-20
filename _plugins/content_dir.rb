# Keep one-off pages in content/ without changing their URLs:
#   content/about.md          -> /about/
#   content/guestbook/index.md -> /guestbook/
#   content/search.json       -> /search.json
# A page that sets its own `permalink:` is left alone. content/ is skipped by
# the sections generator (see `sections_ignore` in _config.yml).
Jekyll::Hooks.register :pages, :post_init do |page|
  rel = page.path.to_s
  next unless rel.start_with?("content/") && page.data["permalink"].nil?

  rel = rel.delete_prefix("content/")
  ext = File.extname(rel)
  stem = rel.chomp(ext)
  page.data["permalink"] =
    if %w[.md .markdown .html].include?(ext.downcase)
      stem == "index" ? "/" : "/" + stem.sub(%r{(?:\A|/)index\z}, "") + "/"
    else
      "/" + rel
    end
end
