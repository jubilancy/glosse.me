# Jekyll hides any page whose `published:` is falsy, so a clipping with an empty
# `published:` (a date for the original, not a draft flag) would silently vanish.
# Only an explicit `published: false` hides a page.
module Glosse
  module PublishedKey
    def can_be_published?(thing)
      thing.data.fetch("published", true) != false || @site.unpublished
    end
  end
end

Jekyll::Publisher.prepend(Glosse::PublishedKey)
