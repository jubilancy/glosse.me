---
---
// The site's "filesystem" for the ~ terminal, generated from _data at build time.
window.GLOSSE_FS = {
  "pages": [{% for n in site.data.navigation %}{ "name": {{ n.title | jsonify }}, "url": {{ n.url | jsonify }} }{% unless forloop.last %}, {% endunless %}{% endfor %}],
  "sites": [{% for s in site.data.sites %}{ "name": {{ s.name | jsonify }}, "url": {{ s.url | jsonify }} }{% unless forloop.last %}, {% endunless %}{% endfor %}],
  "contact": [{% for c in site.data.contact.reach %}{ "label": {{ c.label | jsonify }}, "text": {{ c.text | jsonify }}, "url": {{ c.url | jsonify }} }{% unless forloop.last %}, {% endunless %}{% endfor %}],
  "sections": {{ site.data.section_index | jsonify }},
  "greenhouse": [{% for g in site.data.greenhouse.items %}{ "name": {{ g.name | jsonify }}, "url": {{ g.url | jsonify }} }{% unless forloop.last %}, {% endunless %}{% endfor %}]
};
