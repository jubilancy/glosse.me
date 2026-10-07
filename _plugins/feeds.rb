require "rexml/document"
require "rexml/xpath"
require_relative "glosse_net"

# Reads _data/feeds.yml (hand-picked feeds), fetches each at build time, and
# exposes site.data.feed_items / feed_sources for the /reading/ page. Fetching
# at build time means no CORS proxy and no key; the daily deploy keeps it fresh.
# A URL may be a feed or just a site: feeds are auto-discovered from the page.
module Glosse
  class Feeds < Jekyll::Generator
    safe true

    PER_FEED = 8
    TOTAL    = 120

    def generate(site)
      list = site.data["feeds"]
      list = list["feeds"] if list.is_a?(Hash)
      list = Array(list).select { |f| f.is_a?(Hash) && f["url"] }
      return if list.empty?

      per = (site.config["feed_items_per_source"] || PER_FEED).to_i
      results = Web.pmap(list) { |f| load(site, f, per) }

      sources = []
      items = []
      list.each_with_index do |f, i|
        r = results[i] || { ok: false, items: [] }
        slug = Jekyll::Utils.slugify((f["name"] || r[:title] || f["url"]).to_s)
        name = f["name"] || r[:title] || URI.parse(f["url"]).host.to_s
        sources << { "name" => name, "slug" => slug, "note" => f["note"], "feed" => r[:feed] || f["url"],
                     "site" => f["site"] || r[:site], "ok" => r[:ok], "count" => r[:items].size }
        r[:items].each { |it| items << it.merge("source" => name, "slug" => slug) }
      end

      items.sort_by! { |it| -(it["date"] ? it["date"].to_i : 0) }
      site.data["feed_sources"] = sources
      site.data["feed_items"] = items.first(TOTAL)
      Web.log "feeds: #{sources.count { |s| s['ok'] }}/#{sources.size} fetched, #{site.data['feed_items'].size} items"

      add_opml(site, sources)
      (site.data["terminal_lists"] ||= {})["reading"] = site.data["feed_items"].first(20).map do |it|
        { "title" => "#{it['source']}: #{it['title']}", "url" => it["url"], "date" => it["date"] ? it["date"].strftime("%Y-%m-%d") : "" }
      end
    end

    private

    def load(site, feed, per)
      body, _ct, final = Web.cached_get(site, feed["url"], accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*")
      return { ok: false, items: [] } unless body

      if body !~ /<(rss|feed|rdf:RDF)\b/i && (alt = discover(body, final || feed["url"]))
        body, _ct, final = Web.cached_get(site, alt, accept: "application/rss+xml, application/atom+xml, */*")
        return { ok: false, items: [] } unless body
      end

      parse(body, final || feed["url"], per)
    rescue REXML::ParseException => e
      Web.warn "#{feed['url']} - not valid xml (#{e.class})"
      { ok: false, items: [] }
    end

    def discover(html, base)
      tag = html.scan(/<link\s[^>]*>/im).find do |t|
        t =~ /rel\s*=\s*["']?alternate/i && t =~ %r{type\s*=\s*["']?application/(rss|atom)\+xml}i
      end
      tag && Web.absolute(base, CGI.unescapeHTML(tag[/href\s*=\s*["']([^"']+)/i, 1].to_s))
    end

    def text(el, *names)
      names.each do |n|
        c = REXML::XPath.first(el, "*[local-name()='#{n}']")
        next unless c
        t = c.texts.map(&:value).join.strip
        return t unless t.empty?
      end
      nil
    end

    def parse(xml, base, per)
      doc = REXML::Document.new(xml)
      root = doc.root
      return { ok: false, items: [] } unless root

      channel = REXML::XPath.first(root, "*[local-name()='channel']") || root
      title = text(channel, "title")
      site_link = begin
        l = REXML::XPath.match(channel, "*[local-name()='link']").find { |e| e.attributes["rel"].to_s != "self" }
        l && (l.attributes["href"] || l.texts.map(&:value).join.strip)
      end

      nodes = REXML::XPath.match(doc, "//*[local-name()='item' or local-name()='entry']")
      items = nodes.first(per).filter_map { |n| item(n, base) }
      { ok: true, items: items, title: title, site: Web.absolute(base, site_link), feed: base }
    end

    def item(n, base)
      link = REXML::XPath.match(n, "*[local-name()='link']").map do |l|
        rel = l.attributes["rel"]
        [(rel.nil? || rel == "alternate" ? 0 : 1), l.attributes["href"] || l.texts.map(&:value).join.strip]
      end.min_by(&:first)&.last
      link ||= text(n, "guid", "id")
      link = Web.absolute(base, link)
      title = Web.strip_html(text(n, "title"))
      return nil unless Web.http_url?(link) && !title.empty?

      body = text(n, "encoded", "content", "summary", "description")
      date = begin
        d = text(n, "pubDate", "published", "updated", "date")
        d && Time.parse(d)
      rescue ArgumentError
        nil
      end
      thumb = REXML::XPath.match(n, "*[local-name()='thumbnail' or local-name()='content' or local-name()='enclosure']")
                          .map { |e| e.attributes["url"] if e.attributes["type"].to_s !~ %r{\A(audio|video)/} }.compact.first
      thumb ||= body.to_s[/<img[^>]+src=["']([^"']+)/i, 1] && CGI.unescapeHTML(body[/<img[^>]+src=["']([^"']+)/i, 1])
      thumb = Web.absolute(base, thumb)

      { "title" => title, "url" => link, "date" => date,
        "summary" => Web.strip_html(text(n, "description", "summary") || body, 220),
        "image" => Web.http_url?(thumb) ? thumb : nil }
    end

    def add_opml(site, sources)
      esc = ->(s) { CGI.escapeHTML(s.to_s) }
      xml = +%(<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>#{esc.(site.config['title'])} reading</title></head>\n  <body>\n)
      sources.each do |s|
        xml << %(    <outline type="rss" text="#{esc.(s['name'])}" title="#{esc.(s['name'])}" xmlUrl="#{esc.(s['feed'])}"#{s['site'] ? %( htmlUrl="#{esc.(s['site'])}") : ''}/>\n)
      end
      xml << "  </body>\n</opml>\n"
      page = Jekyll::PageWithoutAFile.new(site, site.source, "reading", "feeds.opml")
      page.content = xml
      page.data.merge!("permalink" => "/reading/feeds.opml", "layout" => nil, "render_with_liquid" => false, "sitemap" => false)
      site.pages << page
    end
  end
end
