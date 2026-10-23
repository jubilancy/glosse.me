# Lets markdown work inside <details> blocks without writing markdown="1" on each one.
# kramdown leaves the contents of block HTML alone, so a list under <summary> would
# otherwise come out as literal "- one". Only block-level tags at the start of a line
# are touched, and fenced code is skipped so docs can show the raw syntax.
Jekyll::Hooks.register [:pages, :documents], :pre_render do |doc|
  next unless doc.content.include?("<details")

  fence = /(^(?:```|~~~).*?^(?:```|~~~)[ \t]*$)/m
  doc.content = doc.content.split(fence).each_with_index.map do |seg, i|
    next seg if i.odd?
    seg.gsub(/^<details\b(?![^>]*\bmarkdown=)/i, '<details markdown="1"')
  end.join
end
