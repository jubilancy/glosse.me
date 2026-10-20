<?xml version="1.0" encoding="utf-8"?>
<!--
Styles the Atom feeds in a browser. Feed readers ignore this file.
Based on "Pretty Feed v3" by Matt Webb: https://github.com/genmon/aboutfeeds
-->
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:atom="http://www.w3.org/2005/Atom"
    exclude-result-prefixes="atom">

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/atom:feed">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="atom:title"/> (feed)</title>
        <style type="text/css">
<![CDATA[
:root {
  --bg: #fafafa; --fg: #111111; --muted: #6b7280; --border: #e5e5e5; --card: #ffffff;
  --mono: "IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #0d0d0d; --fg: #eaeaea; --muted: #8a8a8a; --border: #262626; --card: #141414; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--mono); font-size: 14px; line-height: 1.6; }
.container { max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
h1 { font-size: 1.3rem; margin: 0 0 0.75rem; }
a { color: var(--fg); }
.about { background: var(--card); border: 1px dashed var(--border); padding: 0.75rem 1rem; margin: 1.25rem 0 2rem; }
.about p { margin: 0.4rem 0; }
.entry { margin-bottom: 1.4rem; }
.entry h2 { font-size: 1rem; margin: 0; }
.meta { color: var(--muted); font-size: 0.85rem; }
.summary { margin: 0.25rem 0 0; color: var(--muted); }
]]>
        </style>
      </head>
      <body>
        <div class="container">
          <h1><xsl:value-of select="atom:title"/></h1>
          <a href="{atom:link[not(@rel)]/@href}">visit the site &#8594;</a>
          <div class="about">
            <p>this is an rss feed. <strong>subscribe by copying this page's url into your feed reader.</strong></p>
            <p><a href="https://aboutfeeds.com">what's a feed? &#8594;</a></p>
          </div>
          <xsl:for-each select="atom:entry">
            <div class="entry">
              <h2><a href="{atom:link/@href}"><xsl:value-of select="atom:title"/></a></h2>
              <div class="meta"><xsl:value-of select="substring(atom:published, 1, 10)"/></div>
              <xsl:if test="atom:summary != ''">
                <p class="summary"><xsl:value-of select="atom:summary"/></p>
              </xsl:if>
            </div>
          </xsl:for-each>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
