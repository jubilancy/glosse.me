require_relative "glosse_net"
require_relative "linkmeta"

# A URL alone on its own line in any markdown page becomes an embed:
#
#   https://www.youtube.com/watch?v=...        click-to-play video (no tracking until clicked)
#   https://vimeo.com/123  spotify  soundcloud  codepen        players
#   https://bsky.app/profile/x/post/y          the post, rendered
#   https://github.com/owner/repo              repo card (live stars)
#   https://listenbrainz.org/user/name/        listening card (now playing, recent, top artists/tracks, activity)
#                                              add ?range=this_week|week|this_month|month|this_year|year|all_time
#   https://example.com/item/1/manifest.json   IIIF manifest, in the Mirador viewer
#   https://example.com/pic.jpg  clip.mp4  song.mp3   image / video / audio
#   any page that advertises oEmbed            its video/audio/rich player (iframe) or photo, read at build time
#   any other https:// URL                     link card (title, blurb, image) read at build time
#
# A URL inside a sentence, or a [named](link), stays an ordinary link.
module Glosse
  module Embeds
    # kramdown leaves a bare URL as text; <https://...> and [url](url) become a link
    STANDALONE = %r{<p>\s*(?:<a href="(https?://[^"]+)"[^>]*>([^<]*)</a>|(https?://[^\s<]+))\s*</p>}
    RESERVED_GH = %w[orgs sponsors topics features marketplace settings about pricing explore collections trending
                     notifications login join sessions search issues pulls codespaces apps].freeze

    module_function

    def process(doc)
      return unless doc.content.include?("<p>")
      site = doc.site

      doc.content = doc.content.gsub(STANDALONE) do |whole|
        href = CGI.unescapeHTML($1 || $3)
        text = CGI.unescapeHTML($2 || $3)
        next whole unless text.sub(%r{/\z}, "") == href.sub(%r{/\z}, "")

        build(site, href)&.first || whole
      end
    end

    # The default layout loads /assets/js/embeds.js whenever a page contains an embed.
    # -> [html, needs_js] or nil
    def build(site, url)
      uri = URI.parse(url)
      host = uri.host.to_s.downcase.sub(/\A(www|m)\./, "")
      path = uri.path.to_s
      e = ->(s) { CGI.escapeHTML(s.to_s) }

      if (id = youtube_id(host, uri))
        start = youtube_start(uri)
        return [%(<figure class="embed embed-video"><button type="button" class="yt-facade" data-yt="#{e.(id)}" data-start="#{start}" aria-label="play video">) +
                %(<img src="https://i.ytimg.com/vi/#{e.(id)}/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="play" aria-hidden="true">▶</span></button>) +
                %(<figcaption><a href="#{e.(url)}" rel="noopener">watch on youtube ↗</a></figcaption></figure>), true]
      end

      case host
      when "vimeo.com"
        if (m = path.match(%r{\A/(?:channels/[^/]+/|groups/[^/]+/videos/)?(\d+)}))
          return [frame("https://player.vimeo.com/video/#{m[1]}?dnt=1", "vimeo video", "embed-video", url), false]
        end
      when "open.spotify.com"
        if (m = path.match(%r{\A/(?:intl-[a-z]+/)?(track|album|playlist|episode|show|artist)/([A-Za-z0-9]+)}))
          h = %w[track episode].include?(m[1]) ? 152 : 352
          return [frame("https://open.spotify.com/embed/#{m[1]}/#{m[2]}", "spotify #{m[1]}", "embed-audio", url, h), false]
        end
      when "soundcloud.com"
        if path.split("/").reject(&:empty?).size >= 2
          src = "https://w.soundcloud.com/player/?url=#{CGI.escape(url)}&color=%23888888&auto_play=false&hide_related=true&show_comments=false&visual=false"
          return [frame(src, "soundcloud", "embed-audio", url, 166), false]
        end
      when "codepen.io"
        if (m = path.match(%r{\A/([^/]+)/(?:pen|full|details)/([A-Za-z0-9]+)}))
          return [frame("https://codepen.io/#{m[1]}/embed/#{m[2]}?default-tab=result", "codepen", "embed-code", url, 380), false]
        end
      when "bsky.app"
        if (m = path.match(%r{\A/profile/([^/]+)/post/([A-Za-z0-9]+)}))
          return [%(<blockquote class="embed embed-bsky" data-handle="#{e.(m[1])}" data-rkey="#{e.(m[2])}"><a href="#{e.(url)}" rel="noopener">#{e.(url)}</a></blockquote>), true]
        end
      when "listenbrainz.org"
        if (m = path.match(%r{\A/user/([A-Za-z0-9_.-]+)/?\z}))
          range = URI.decode_www_form(uri.query.to_s).to_h["range"].to_s
          range = "" unless %w[this_week week this_month month this_year year all_time].include?(range)
          return [%(<div class="embed embed-lb" data-user="#{e.(m[1])}" data-range="#{e.(range)}"><a href="#{e.(url)}" rel="noopener">listenbrainz.org/user/#{e.(m[1])}</a></div>), true]
        end
      when "github.com"
        parts = path.split("/").reject(&:empty?)
        if parts.size == 2 && !RESERVED_GH.include?(parts[0].downcase)
          repo = "#{parts[0]}/#{parts[1].sub(/\.git\z/, '')}"
          return [%(<div class="embed embed-gh" data-repo="#{e.(repo)}"><a href="#{e.(url)}" rel="noopener">github.com/#{e.(repo)}</a></div>), true]
        end
      end

      case path
      when %r{/manifest(?:\.json)?\z}i
        src = "https://projectmirador.org/embed/?iiif-content=#{CGI.escape(url)}"
        return [frame(src, "iiif viewer", "embed-iiif", url, 600), false]
      when LinkMeta::IMAGE_EXT
        return card(site, url) if url =~ LinkMeta::API_PAGE
        return [%(<figure class="embed embed-img"><a href="#{e.(url)}"><img src="#{e.(url)}" alt="" loading="lazy" referrerpolicy="no-referrer"></a></figure>), false]
      when /\.(mp4|webm|mov|m4v)\z/i
        return [%(<figure class="embed embed-video"><video controls preload="metadata" src="#{e.(url)}"></video></figure>), false]
      when /\.(mp3|ogg|oga|wav|m4a|flac)\z/i
        return [%(<figure class="embed embed-audio"><audio controls preload="none" src="#{e.(url)}"></audio></figure>), false]
      end

      oembed(site, url) || card(site, url)
    rescue URI::Error
      nil
    end

    OEMBED_TYPES = %w[video rich photo].freeze

    # oEmbed discovery: a page can point at its endpoint with
    # <link rel="alternate" type="application/json+oembed" href="...">. Only a photo or a plain
    # iframe is used; the provider's own html is never injected, so anything that needs a
    # script (or isn't https) falls back to the link card.
    def oembed(site, url)
      body, ct, final = Web.cached_get(site, url, accept: "text/html,application/xhtml+xml")
      return nil unless body && ct.to_s =~ /html/i && body =~ /oembed/i

      endpoint = oembed_endpoint(body[0, 600_000], final || url)
      data = endpoint && Web.cached_json(site, endpoint)
      return nil unless data.is_a?(Hash) && OEMBED_TYPES.include?(data["type"])

      title = [data["title"], data["provider_name"], "embedded content"].find { |t| !t.to_s.strip.empty? }.to_s
      e = ->(s) { CGI.escapeHTML(s.to_s) }
      case data["type"]
      when "photo"
        src = data["url"].to_s
        return nil unless src =~ %r{\Ahttps?://}i
        [%(<figure class="embed embed-img"><a href="#{e.(url)}" rel="noopener"><img src="#{e.(src)}" alt="#{e.(title)}" loading="lazy" referrerpolicy="no-referrer"></a></figure>), false]
      else
        src = oembed_iframe(data["html"])
        return nil unless src
        w = data["width"].to_s[/\A\d+\z/].to_i
        h = data["height"].to_s[/\A\d+\z/].to_i
        if data["type"] == "video"
          ratio = w >= 200 && h >= 100 ? "#{w} / #{h}" : "16 / 9"
          [frame(src, title, "embed-oembed", url, nil, ratio), false]
        else
          [frame(src, title, "embed-oembed", url, (h.zero? ? 400 : h).clamp(80, 800)), false]
        end
      end
    end

    def oembed_endpoint(html, base)
      html.scan(/<link\s[^>]*>/im).each do |tag|
        attrs = {}
        tag.scan(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/m) { |k, v1, v2| attrs[k.downcase] = v1 || v2 }
        next unless attrs["type"].to_s.downcase == "application/json+oembed" && attrs["href"]
        href = Web.absolute(base, CGI.unescapeHTML(attrs["href"]))
        return href if href && Web.http_url?(href)
      end
      nil
    end

    def oembed_iframe(html)
      src = html.to_s[/<iframe\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/im, 1] ||
            html.to_s[/<iframe\b[^>]*?\ssrc\s*=\s*'([^']*)'/im, 1]
      src = CGI.unescapeHTML(src.to_s).strip
      src =~ %r{\Ahttps://[^\s"'<>]+\z}i ? src : nil
    end

    def frame(src, title, klass, url, height = nil, ratio = nil)
      style = ratio ? %( style="aspect-ratio:#{ratio};height:auto") : (height ? %( style="height:#{height}px") : "")
      %(<figure class="embed #{klass}"><iframe src="#{CGI.escapeHTML(src)}" title="#{CGI.escapeHTML(title)}" loading="lazy" allowfullscreen) +
        %( allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"#{style}></iframe>) +
        %(<figcaption><a href="#{CGI.escapeHTML(url)}" rel="noopener">open original ↗</a></figcaption></figure>)
    end

    def card(site, url)
      m = LinkMeta.fetch(site, url)
      return nil unless m && m["title"]
      e = ->(s) { CGI.escapeHTML(s.to_s) }
      byline = [m["artist"], m["date"]].compact.join(", ")
      blurb = m["description"] || byline
      img = m["image"] && Web.http_url?(m["image"]) ? %(<img src="#{e.(m['image'])}" alt="" loading="lazy" referrerpolicy="no-referrer">) : ""
      [%(<a class="embed embed-card" href="#{e.(url)}" rel="noopener">#{img}<span class="ec-body"><span class="ec-site">#{e.(m['site'])}</span>) +
       %(<span class="ec-title">#{e.(m['title'])}</span>#{blurb.to_s.empty? ? '' : %(<span class="ec-desc">#{e.(blurb)}</span>)}</span></a>), false]
    end

    def youtube_id(host, uri)
      id = case host
           when "youtu.be" then uri.path.to_s.split("/")[1]
           when "youtube.com", "youtube-nocookie.com"
             if uri.path == "/watch" then URI.decode_www_form(uri.query.to_s).to_h["v"]
             elsif (m = uri.path.to_s.match(%r{\A/(?:embed|shorts|live|v)/([^/?]+)})) then m[1]
             end
           end
      id =~ /\A[\w-]{6,15}\z/ ? id : nil
    end

    def youtube_start(uri)
      t = URI.decode_www_form(uri.query.to_s).to_h.values_at("t", "start").compact.first.to_s
      secs = t =~ /\A\d+\z/ ? t.to_i : (t.scan(/(\d+)([hms])/).sum { |n, u| n.to_i * { "h" => 3600, "m" => 60, "s" => 1 }[u] })
      secs.positive? ? secs : ""
    end
  end
end

Jekyll::Hooks.register %i[pages documents], :post_convert do |doc|
  Glosse::Embeds.process(doc)
end
