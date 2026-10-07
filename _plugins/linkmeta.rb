require_relative "glosse_net"

# Turns a URL into { title, description, image, site, artist, date, medium,
# credit, url } using, in order: a museum/Commons API for the few sites that
# publish one (those pages block scrapers), then Open Graph / Twitter / JSON-LD
# tags, then <title>. Returns nil when nothing useful came back.
module Glosse
  module LinkMeta
    IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)(\?.*)?\z/i
    # Pages (not images) that the museum/Commons lookups handle, even when the URL ends in .jpg
    API_PAGE  = %r{metmuseum\.org/art/collection/search/\d+|artic\.edu/artworks/\d+|commons\.wikimedia\.org/wiki/File:}

    module_function

    def direct_image?(url)
      URI.parse(url).path =~ IMAGE_EXT && url !~ API_PAGE
    rescue URI::Error
      false
    end

    def fetch(site, url)
      return nil unless Web.http_url?(url)

      if direct_image?(url)
        name = File.basename(URI.parse(url).path, ".*").tr("-_", "  ")
        return { "title" => name, "image" => url, "site" => URI.parse(url).host, "url" => url }
      end

      from_api(site, url) || from_html(site, url)
    end

    # ---- museum APIs -------------------------------------------------------

    def from_api(site, url)
      if (m = url.match(%r{metmuseum\.org/art/collection/search/(\d+)}))
        json = Web.cached_json(site, "https://collectionapi.metmuseum.org/public/collection/v1/objects/#{m[1]}")
        met(json, url)
      elsif (m = url.match(%r{artic\.edu/artworks/(\d+)}))
        fields = "id,title,artist_display,date_display,medium_display,credit_line,image_id"
        json = Web.cached_json(site, "https://api.artic.edu/api/v1/artworks/#{m[1]}?fields=#{fields}")
        aic(json, url)
      elsif (m = url.match(%r{commons\.wikimedia\.org/wiki/(File:[^?#]+)}))
        title = CGI.escape(CGI.unescape(m[1]).tr("_", " "))
        json = Web.cached_json(site, "https://commons.wikimedia.org/w/api.php?action=query&titles=#{title}" \
                                     "&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=1200&format=json&formatversion=2")
        commons(json, url)
      end
    end

    def met(json, url)
      return nil unless json.is_a?(Hash) && json["title"]
      compact("title" => json["title"], "artist" => json["artistDisplayName"],
              "date" => json["objectDate"], "medium" => json["medium"], "credit" => json["creditLine"],
              "image" => json["primaryImageSmall"].to_s.empty? ? json["primaryImage"] : json["primaryImageSmall"],
              "site" => "The Metropolitan Museum of Art", "url" => url)
    end

    def aic(json, url)
      data = json.is_a?(Hash) && json["data"]
      return nil unless data && data["title"]
      iiif = (json.dig("config", "iiif_url") || "https://www.artic.edu/iiif/2").to_s
      image = data["image_id"] ? "#{iiif}/#{data['image_id']}/full/843,/0/default.jpg" : nil
      compact("title" => data["title"], "artist" => data["artist_display"].to_s.lines.first.to_s.strip,
              "date" => data["date_display"], "medium" => data["medium_display"], "credit" => data["credit_line"],
              "image" => image, "site" => "Art Institute of Chicago", "url" => url)
    end

    def commons(json, url)
      page = json.is_a?(Hash) && json.dig("query", "pages")&.first
      info = page && page["imageinfo"]&.first
      return nil unless info
      ext = info["extmetadata"] || {}
      val = ->(k) { Web.strip_html(ext.dig(k, "value")) }
      title = val.("ObjectName")
      title = page["title"].to_s.sub(/\AFile:/, "").sub(/\.\w+\z/, "") if title.empty?
      compact("title" => title, "artist" => val.("Artist"), "date" => val.("DateTimeOriginal"),
              "medium" => nil, "credit" => [val.("Credit"), val.("LicenseShortName")].reject(&:empty?).join(" · "),
              "description" => val.("ImageDescription"),
              "image" => info["thumburl"] || info["url"], "site" => "Wikimedia Commons",
              "url" => info["descriptionurl"] || url)
    end

    # ---- generic pages -----------------------------------------------------

    def from_html(site, url)
      body, ct, final = Web.cached_get(site, url, accept: "text/html,application/xhtml+xml")
      return nil unless body
      return { "title" => File.basename(URI.parse(final).path), "image" => final, "url" => url } if ct =~ %r{\Aimage/}
      parse_html(body, final || url, url)
    end

    def parse_html(body, base, url = base)
      head = body[0, 600_000]
      meta = {}
      head.scan(/<meta\s[^>]*>/im).each do |tag|
        attrs = {}
        tag.scan(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/m) { |k, v1, v2| attrs[k.downcase] = v1 || v2 }
        key = (attrs["property"] || attrs["name"] || attrs["itemprop"]).to_s.downcase
        meta[key] ||= CGI.unescapeHTML(attrs["content"].to_s).strip if !key.empty? && attrs["content"]
      end

      ld = json_ld(head)
      title = first(meta["og:title"], meta["twitter:title"], ld["name"], head[%r{<title[^>]*>(.*?)</title>}mi, 1])
      return nil if title.to_s.strip.empty?

      image = first(meta["og:image"], meta["og:image:url"], meta["twitter:image"], meta["twitter:image:src"],
                    ld["image"], head[/<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)/i, 1])
      compact(
        "title" => Web.strip_html(title),
        "description" => Web.strip_html(first(meta["og:description"], meta["description"], meta["twitter:description"], ld["description"]), 220),
        "image" => Web.absolute(base, image),
        "site" => first(meta["og:site_name"], URI.parse(base).host.to_s.sub(/\Awww\./, "")),
        "artist" => first(ld["artist"], meta["article:author"], meta["author"]),
        "date" => ld["date"],
        "medium" => ld["medium"],
        "url" => url
      )
    rescue URI::Error
      nil
    end

    # Flattens schema.org JSON-LD into the few fields we care about.
    def json_ld(html)
      out = {}
      html.scan(%r{<script[^>]+application/ld\+json[^>]*>(.*?)</script>}mi).flatten.each do |raw|
        data = begin
          JSON.parse(CGI.unescapeHTML(raw.strip))
        rescue JSON::ParserError
          next
        end
        data = data["@graph"] if data.is_a?(Hash) && data["@graph"]
        nodes = data.is_a?(Array) ? data : [data]
        nodes.select { |n| n.is_a?(Hash) }.each do |n|
          types = Array(n["@type"]).map(&:to_s)
          next unless (types & %w[VisualArtwork Painting Sculpture Photograph ImageObject CreativeWork Article BlogPosting WebPage Product]).any?
          out["name"] ||= n["name"] || n["headline"]
          out["description"] ||= n["description"]
          out["image"] ||= name_or_url(n["image"], "url")
          out["artist"] ||= name_or_url(n["creator"] || n["author"], "name")
          out["date"] ||= n["dateCreated"] || n["datePublished"]
          out["medium"] ||= name_or_url(n["artMedium"] || n["material"], "name")
        end
      end
      out.transform_values { |v| v.is_a?(String) ? v : nil }
    end

    def name_or_url(val, key)
      val = val.first if val.is_a?(Array)
      val.is_a?(Hash) ? val[key] : val
    end

    def first(*vals)
      vals.find { |v| v.is_a?(String) && !v.strip.empty? }
    end

    def compact(hash)
      hash.reject { |_, v| v.nil? || v.to_s.strip.empty? }.transform_values { |v| v.is_a?(String) ? v.strip : v }
    end
  end
end
