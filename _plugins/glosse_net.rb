require "net/http"
require "uri"
require "json"
require "digest"
require "fileutils"
require "cgi"
require "time"

# Shared build-time helpers for the plugins that read the outside world
# (feeds.rb, art.rb, embeds.rb). Everything here degrades to nil: a dead site
# never breaks the build, it just leaves that item as a plain link.
#
#   GLOSSE_OFFLINE=1 bundle exec jekyll build   # use only the on-disk cache
module Glosse
  module Web
    UA      = "Mozilla/5.0 (compatible; glosse.me build; +https://glosse.me)".freeze
    MAX     = 3_000_000
    TTL     = 6 * 3600
    TooBig  = Class.new(StandardError)

    module_function

    def log(msg)
      Jekyll.logger.info "glosse:", msg
    end

    def warn(msg)
      Jekyll.logger.warn "glosse:", msg
    end

    def offline?
      ENV["GLOSSE_OFFLINE"].to_s != ""
    end

    # -> [body, content_type, final_url] or nil
    def get(url, accept: "*/*", redirects: 4)
      uri = URI.parse(url)
      return nil unless uri.is_a?(URI::HTTP) && uri.host

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = 6
      http.read_timeout = 10
      req = Net::HTTP::Get.new(uri.request_uri)
      req["User-Agent"] = UA
      req["Accept"] = accept

      body = +""
      res = http.request(req) do |r|
        next unless r.is_a?(Net::HTTPSuccess)
        r.read_body do |chunk|
          body << chunk
          raise TooBig if body.bytesize > MAX
        end
      end

      case res
      when Net::HTTPSuccess
        ct = res["content-type"].to_s
        [decode(body, ct), ct, url]
      when Net::HTTPRedirection
        return nil if redirects <= 0 || res["location"].to_s.empty?
        get(URI.join(url, res["location"]).to_s, accept: accept, redirects: redirects - 1)
      end
    rescue TooBig, SystemCallError, SocketError, Timeout::Error, IOError, OpenSSL::SSL::SSLError,
           Net::HTTPBadResponse, Net::ProtocolError, URI::Error, EncodingError => e
      warn "#{url} - #{e.class}"
      nil
    end

    def decode(body, content_type)
      charset = content_type[/charset=["']?([\w-]+)/i, 1]
      body = body.dup.force_encoding(charset || "UTF-8")
      body = body.encode("UTF-8", invalid: :replace, undef: :replace, replace: "") unless body.encoding == Encoding::UTF_8
      body.valid_encoding? ? body : body.scrub("")
    rescue ArgumentError, EncodingError
      body.dup.force_encoding("UTF-8").scrub("")
    end

    def cache_file(site, url)
      dir = File.join(site.source, ".jekyll-cache", "glosse")
      FileUtils.mkdir_p(dir)
      File.join(dir, Digest::SHA1.hexdigest(url) + ".json")
    end

    # Disk-cached get (6h). A failed fetch falls back to a stale cache entry.
    def cached_get(site, url, accept: "*/*")
      file = cache_file(site, url)
      hit = begin
        JSON.parse(File.read(file))
      rescue StandardError
        nil
      end
      return hit.values_at("body", "ct", "final") if hit && (offline? || Time.now.to_i - hit["t"].to_i < TTL)
      return nil if offline?

      fresh = get(url, accept: accept)
      if fresh
        File.write(file, JSON.generate("t" => Time.now.to_i, "body" => fresh[0], "ct" => fresh[1], "final" => fresh[2]))
        fresh
      elsif hit
        hit.values_at("body", "ct", "final")
      end
    end

    def cached_json(site, url)
      body, = cached_get(site, url, accept: "application/json")
      body && JSON.parse(body)
    rescue JSON::ParserError
      nil
    end

    # Run the block over items on a few threads, keeping order.
    def pmap(items, threads: 6)
      queue = Queue.new
      items.each_with_index { |item, i| queue << [item, i] }
      results = Array.new(items.size)
      workers = Array.new([threads, items.size].min) do
        Thread.new do
          loop do
            item, i = begin
              queue.pop(true)
            rescue ThreadError
              break
            end
            results[i] = begin
              yield item
            rescue StandardError => e
              warn "#{e.class}: #{e.message}"
              nil
            end
          end
        end
      end
      workers.each(&:join)
      results
    end

    def http_url?(str)
      u = URI.parse(str.to_s.strip)
      u.is_a?(URI::HTTP) && !u.host.to_s.empty?
    rescue URI::Error
      false
    end

    def absolute(base, ref)
      return nil if ref.to_s.strip.empty?
      URI.join(base, ref.to_s.strip).to_s
    rescue URI::Error
      nil
    end

    def strip_html(html, max = nil)
      text = CGI.unescapeHTML(html.to_s.gsub(%r{<(script|style)\b.*?</\1>}mi, " ").gsub(/<[^>]+>/, " "))
      text = text.gsub(/[[:space:]]+/, " ").strip
      max && text.length > max ? text[0, max - 1].sub(/\s+\S*\z/, "") + "…" : text
    end
  end
end
