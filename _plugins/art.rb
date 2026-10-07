require_relative "glosse_net"
require_relative "linkmeta"

# _data/art.yml is a list of links (a bare URL, or { url:, note:, title:, artist:,
# date:, medium:, image: } to override anything). Metadata and the image are
# looked up from each link at build time -> site.data.art_items.
module Glosse
  class Art < Jekyll::Generator
    safe true

    FIELDS = %w[title artist date medium credit image description].freeze

    def generate(site)
      list = site.data["art"]
      list = list["items"] if list.is_a?(Hash)
      list = Array(list).map { |e| e.is_a?(String) ? { "url" => e } : e }.select { |e| e.is_a?(Hash) && e["url"] }
      return if list.empty?

      metas = Web.pmap(list) { |e| e["image"] && e["title"] ? {} : LinkMeta.fetch(site, e["url"]) }
      items = list.each_with_index.map do |e, i|
        m = metas[i] || {}
        item = { "url" => e["url"], "note" => e["note"], "site" => m["site"] || URI.parse(e["url"]).host.to_s.sub(/\Awww\./, "") }
        FIELDS.each { |k| item[k] = e[k] || m[k] }
        item["title"] ||= File.basename(URI.parse(e["url"]).path).tr("-_", "  ").then { |t| t.empty? ? item["site"] : t }
        item["ok"] = !metas[i].nil? || (e["image"] && e["title"]) ? true : false
        item
      end

      Web.log "art: #{items.count { |x| x['ok'] }}/#{items.size} looked up, #{items.count { |x| x['image'] }} with images"
      site.data["art_items"] = items
      (site.data["terminal_lists"] ||= {})["art"] = items.map do |x|
        { "title" => [x["title"], x["artist"]].compact.join(" - "), "url" => x["url"], "date" => x["date"].to_s[0, 10] }
      end
    end
  end
end
