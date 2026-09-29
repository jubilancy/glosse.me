# Fills the footer's "built N pages · N KB" placeholders once every page has
# been rendered, so the numbers describe the site that is actually written.
Jekyll::Hooks.register :site, :post_render do |site, _payload|
  html  = site.pages.select { |p| p.output_ext == ".html" }
  bytes = (site.pages + site.documents).sum { |d| d.output.to_s.bytesize } +
          site.static_files.sum { |f| File.size(f.path) }
  kb    = (bytes / 1024.0).round

  html.each do |page|
    page.output = page.output.gsub("__BUILD_PAGES__", html.size.to_s)
                             .gsub("__BUILD_KB__", kb.to_s)
  end
end
