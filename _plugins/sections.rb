require "open3"
require "cgi"
require "time"

# Folders of plain markdown become sections: drop `thoughts/anything.md` in the
# repo and the build makes a post page for it, a section index at /thoughts/,
# prev/next links, an Atom feed, and a nav + `~` terminal entry. No front matter
# needed. See "Adding content" in the README for the rules.
module Glosse
  class Sections < Jekyll::Generator
    safe true
    priority :high

    MD        = /\.(md|markdown)\z/i
    FILE_DATE = /\A(\d{4}-\d{2}-\d{2})-(.+)\z/

    def generate(site)
      @site = site
      @ignore = Array(site.config["sections_ignore"]).map(&:to_s)
      @meta   = site.data["sections"].is_a?(Hash) ? site.data["sections"] : {}

      sections = collect
      return if sections.empty?

      sections.each_value { |s| finish_section(s) }
      relink(sections)
      sections.each { |name, s| publish(name, s) }
      add_nav(sections)
      add_feeds(sections)

      site.config["sections_feed"] = true
      lists = (site.data["terminal_lists"] ||= {})
      sections.each do |name, s|
        lists[name] = s[:entries].map { |e| { "title" => e[:title], "url" => e[:url], "date" => e[:date].strftime("%Y-%m-%d") } }
      end
    end

    private

    # ---- collecting ------------------------------------------------------

    # { "thoughts" => { entries: [...], index: <existing index or nil> } }
    def collect
      sections = Hash.new { |h, k| h[k] = { entries: [], index: nil, index_page: nil } }
      now = Time.now

      candidates.each do |c|
        parts = c[:rel].split("/")
        next if parts.size < 2
        top = parts.first
        next if top.start_with?("_", ".") || @ignore.include?(top)

        base = File.basename(c[:rel])
        next if base =~ /\Areadme\.(md|markdown)\z/i

        if parts.size == 2 && base =~ /\Aindex\.(md|markdown)\z/i
          sections[top][:index] = c
          next
        end

        entry = build_entry(top, parts, c)
        if entry.nil? || (entry[:scheduled] && entry[:date] > now)
          drop(c)
          next
        end
        drop(c)
        sections[top][:entries] << entry.merge(source: c)
      end

      sections.select { |_, s| s[:entries].any? }
    end

    def candidates
      list = []
      @site.static_files.each do |f|
        rel = f.relative_path.sub(%r{\A/}, "")
        next unless rel =~ MD
        list << { rel: rel, file: f, abs: f.path, data: {}, raw: File.read(f.path, encoding: "bom|utf-8") }
      end
      @site.pages.each do |p|
        next unless p.path.to_s =~ MD && p.respond_to?(:content) && !p.is_a?(Jekyll::PageWithoutAFile)
        list << { rel: p.path.to_s, page: p, abs: File.join(@site.source, p.path.to_s), data: p.data.dup, raw: p.content }
      end
      list
    end

    def drop(c)
      return unless c
      @site.static_files.delete(c[:file]) if c[:file]
      @site.pages.delete(c[:page]) if c[:page]
    end

    # ---- one entry -------------------------------------------------------

    def build_entry(top, parts, c)
      data = c[:data]
      return nil if data["draft"] == true || data["published"] == false

      base   = File.basename(parts.last, File.extname(parts.last))
      subdir = parts[1...-1]
      slug_src = base
      slug_src = subdir.pop if base.downcase == "index" && subdir.any? # a/b/index.md -> /a/b/
      file_date = nil
      if (m = FILE_DATE.match(slug_src))
        file_date = Time.parse(m[1] + " 12:00:00") rescue nil
        slug_src = m[2]
      end
      slug = Jekyll::Utils.slugify(slug_src.to_s, mode: "pretty")
      slug = Jekyll::Utils.slugify(slug_src.to_s) if slug.empty?
      return nil if slug.empty?

      content = c[:raw].to_s.sub(/\A﻿/, "")
      title = data["title"]
      if title.nil? && (m = content.match(/\A\s*#[ \t]+(.+?)[ \t]*#*[ \t]*(?:\r?\n|\z)/))
        title = m[1]
        content = m.post_match.sub(/\A\s+/, "")
      end
      title ||= humanize(slug_src)

      explicit = parse_time(data["date"]) || file_date
      first, last = git_dates(c[:rel])
      date = explicit || first || mtime(c[:abs])
      updated = parse_time(data["updated"]) || last
      updated = nil if updated.nil? || (updated - date).abs < 86_400 * 2

      {
        title: title.to_s,
        description: (data["description"] || summary(content)).to_s,
        content: content,
        data: data,
        date: date,
        updated: updated,
        scheduled: !explicit.nil?,
        section: top,
        dir: ([top] + subdir).join("/"),
        url: "/" + ([top] + subdir + [slug]).join("/") + "/",
        path: "/" + c[:rel],
        tags: Array(data["tags"]).map(&:to_s)
      }
    end

    def humanize(str)
      str.to_s.tr("-_", "  ").squeeze(" ").strip
    end

    def summary(content)
      block = content.split(/\r?\n\s*\r?\n/).map(&:strip).find do |b|
        !b.empty? && b !~ /\A(#|>|```|~~~|!\[|\||[-*+] |\d+\. |<)/
      end
      return "" unless block
      text = block.gsub(/!?\[([^\]]*)\]\([^)]*\)/, '\1').gsub(/[*_`]/, "").gsub(/\s+/, " ")
      text.length > 160 ? text[0, 159].sub(/\s+\S*\z/, "") + "…" : text
    end

    def parse_time(val)
      case val
      when nil then nil
      when Time then val
      when Date then Time.utc(val.year, val.month, val.day, 12)
      else Time.parse(val.to_s)
      end
    rescue ArgumentError
      nil
    end

    def mtime(abs)
      File.exist?(abs) ? File.mtime(abs) : @site.time
    end

    # [first-commit, last-commit] author dates for a file. Needs full history
    # (the deploy workflow checks out with fetch-depth: 0); untracked files or
    # no git give [nil, nil] and callers fall back to file mtime.
    def git_dates(rel)
      @git ||= {}
      @git[rel] ||= begin
        out, st = Open3.capture2("git", "-C", @site.source, "log", "--follow", "--format=%aI", "--", rel, err: File::NULL)
        dates = st.success? ? out.lines.map { |l| parse_time(l.strip) }.compact : []
        [dates.last, dates.first]
      rescue SystemCallError
        [nil, nil]
      end
    end

    # ---- per section -----------------------------------------------------

    def finish_section(s)
      s[:entries].sort_by! { |e| [-e[:date].to_i, e[:title].downcase] }
      s[:entries].each_with_index do |e, i|
        e[:newer] = i.positive? ? s[:entries][i - 1] : nil
        e[:older] = s[:entries][i + 1]
      end
    end

    # Make relative image/link paths work from the post's own URL, and let
    # [text](other-note.md) point at the generated page.
    def relink(sections)
      by_path = {}
      sections.each_value { |s| s[:entries].each { |e| by_path[e[:path]] = e[:url] } }

      sections.each_value do |s|
        s[:entries].each do |e|
          base = "/" + File.dirname(e[:path]).sub(%r{\A/}, "") + "/"
          e[:content] = rewrite(e[:content], base, by_path)
        end
      end
    end

    def rewrite(content, base, by_path)
      skip = %r{\A(?:[a-z][a-z0-9+.\-]*:|//|/|#|\{)}i
      fix = lambda do |target|
        next target if target.empty? || target =~ skip
        path, frag = target.split(/(?=[?#])/, 2)
        abs = File.expand_path(path, base)
        (by_path[abs] || abs) + (frag || "")
      end

      content.split(/(^(?:```|~~~).*?^(?:```|~~~)[ \t]*$)/m).each_with_index.map do |seg, i|
        next seg if i.odd?
        seg.gsub(/(\]\()([^)\s]+)/) { "#{$1}#{fix.call($2)}" }
           .gsub(/((?:src|href)=["'])([^"']+)/i) { "#{$1}#{fix.call($2)}" }
      end.join
    end

    def publish(name, s)
      meta = @meta[name].is_a?(Hash) ? @meta[name] : {}

      s[:entries].each do |e|
        page = Jekyll::PageWithoutAFile.new(@site, @site.source, e[:dir], File.basename(e[:path]))
        page.content = e[:content]
        page.data.merge!(e[:data])
        page.data.merge!(
          "layout" => e[:data]["layout"] || "post",
          "title" => e[:title],
          "description" => e[:description],
          "date" => e[:date],
          "updated" => e[:updated],
          "tags" => e[:tags],
          "section" => name,
          "section_title" => meta["title"] || name,
          "permalink" => e[:url],
          "render_with_liquid" => false,
          "newer" => nav_link(e[:newer]),
          "older" => nav_link(e[:older])
        )
        @site.pages << page
      end

      # A hand-made index (index.html, or index.md with its own layout) wins.
      # A bare index.md (no front matter / no layout) is used as the intro text.
      idx = s[:index]
      made = @site.pages.find { |p| p.url == "/#{name}/" }
      return if made && !(idx && idx[:page].equal?(made) && [nil, "section"].include?(idx[:data]["layout"]))
      drop(idx)

      index = Jekyll::PageWithoutAFile.new(@site, @site.source, name, "index.md")
      index.content = s[:index] ? s[:index][:raw].to_s : ""
      index.data.merge!(s[:index] ? s[:index][:data] : {})
      index.data.merge!(
        "layout" => "section",
        "title" => meta["title"] || index.data["title"] || name,
        "lede" => meta["lede"] || index.data["lede"] || index.data["description"],
        "description" => meta["description"] || index.data["description"] || "#{name} on #{@site.config['title']}",
        "section" => name,
        "permalink" => "/#{name}/",
        "generated_section" => true,
        "render_with_liquid" => false,
        "entries" => s[:entries].map { |e| entry_hash(e) }
      )
      @site.pages << index
    end

    def nav_link(e)
      e && { "title" => e[:title], "url" => e[:url] }
    end

    def entry_hash(e)
      { "title" => e[:title], "url" => e[:url], "date" => e[:date],
        "description" => e[:description], "tags" => e[:tags] }
    end

    # ---- nav -------------------------------------------------------------

    def add_nav(sections)
      nav = (@site.data["navigation"] ||= [])
      header = @site.config.fetch("auto_nav", true)
      sections.keys.sort.each do |name|
        url = "/#{name}/"
        next if nav.any? { |n| n["url"] == url }
        meta = @meta[name].is_a?(Hash) ? @meta[name] : {}
        show = meta.key?("nav") ? meta["nav"] : header
        nav << { "title" => meta["title"] || name, "url" => url, "nav" => show ? true : false, "auto" => true }
      end
    end

    # ---- feeds -----------------------------------------------------------

    def add_feeds(sections)
      all = sections.flat_map { |_, s| s[:entries] }.sort_by { |e| -e[:date].to_i }.first(30)
      write_feed("/feed.xml", @site.config["title"], all)
      sections.each do |name, s|
        write_feed("/#{name}/feed.xml", "#{name} | #{@site.config['title']}", s[:entries].first(30))
      end
    end

    def write_feed(url, title, entries)
      root = @site.config["url"].to_s.chomp("/")
      esc = ->(t) { CGI.escapeHTML(t.to_s) }
      updated = (entries.map { |e| e[:updated] || e[:date] }.max || @site.time).iso8601
      xml = +%(<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n)
      xml << "  <title>#{esc.(title)}</title>\n"
      xml << %(  <link href="#{esc.(root + url)}" rel="self"/>\n  <link href="#{esc.(root + '/')}"/>\n)
      xml << "  <id>#{esc.(root + url)}</id>\n  <updated>#{updated}</updated>\n"
      xml << "  <author><name>#{esc.(@site.config['title'])}</name></author>\n"
      entries.each do |e|
        xml << "  <entry>\n    <title>#{esc.(e[:title])}</title>\n"
        xml << %(    <link href="#{esc.(root + e[:url])}"/>\n    <id>#{esc.(root + e[:url])}</id>\n)
        xml << "    <published>#{e[:date].iso8601}</published>\n"
        xml << "    <updated>#{(e[:updated] || e[:date]).iso8601}</updated>\n"
        xml << "    <summary>#{esc.(e[:description])}</summary>\n  </entry>\n" unless e[:description].empty?
        xml << "  </entry>\n" if e[:description].empty?
      end
      xml << "</feed>\n"

      dir, name = File.split(url)
      feed = Jekyll::PageWithoutAFile.new(@site, @site.source, dir == "/" ? "" : dir.sub(%r{\A/}, ""), name)
      feed.content = xml
      feed.data.merge!("permalink" => url, "layout" => nil, "render_with_liquid" => false, "sitemap" => false)
      @site.pages << feed
    end
  end
end
