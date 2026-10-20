---
layout: prose
title: about
description: Who's typing.
---
I'm eliana. I'm a student, and in the margins of that I build small
static things for the web — RSS readers, image galleries, bookmark
tools, book lists. Mostly vanilla JS, mostly deployed from a browser
tab, mostly for an audience of one.

The through-line is collecting. I archive things: playlists that get
delisted, bookmarks that rot, pages that quietly disappear. Most of
what I build is downstream of wanting a better place to put all of it.

*glosse* — a gloss, the note in the margin explaining the word.
That felt about right for a site that's mostly annotations on other
people's internet.

<section>
  <div class="section-heading"><span>what I work with</span></div>
  <ul class="link-list">
    <li><a href="/projects/"><span class="name">vanilla JS + static hosting</span><span class="desc">no build step where possible</span></a></li>
    <li><a href="https://quartz.jzhao.xyz/"><span class="name">quartz</span><span class="desc">digital gardens</span></a></li>
    <li><a href="https://pages.cloudflare.com/"><span class="name">cloudflare pages + github actions</span><span class="desc">deploys</span></a></li>
  </ul>
</section>

<section>
  <div class="section-heading"><span>elsewhere</span></div>
  <ul class="link-list">
    {%- for s in site.data.sites %}
    <li><a href="{{ s.url }}"><span class="name">{{ s.name }}</span><span class="desc">{{ s.short }}</span></a></li>
    {%- endfor %}
  </ul>
</section>
