---
layout: guestbook
title: guestbook
description: messages i've received, in one river.
lede: messages i've received, in one river. Fetched when the site builds, so it's never more than a day old.
---

<style>
/* Guestbook form styles to match site: compact, readable, and neutral */
.guestbook-form {
  max-width: 680px;
  margin: 1.25rem auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-family: inherit;
}
.guestbook-form label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  color: #222;
}
.guestbook-form input[type="text"],
.guestbook-form input[type="email"],
.guestbook-form textarea {
  width: 100%;
  padding: 0.65rem;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  background: var(--card-bg, #fff);
  box-shadow: inset 0 1px 0 rgba(0,0,0,0.02);
  font-size: 1rem;
  color: inherit;
}
.guestbook-form textarea {
  min-height: 140px;
  resize: vertical;
}
.guestbook-form input[type="submit"] {
  align-self: flex-start;
  padding: 0.6rem 0.95rem;
  background: #0b1220;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
.guestbook-form input[type="submit"]:hover {
  opacity: 0.96;
  transform: translateY(-1px);
}
.guestbook-form input:focus,
.guestbook-form textarea:focus {
  outline: 2px solid rgba(11,18,32,0.08);
  border-color: #c8d3ff;
  box-shadow: 0 0 0 4px rgba(100,116,255,0.06);
}
@media (max-width: 640px) {
  .guestbook-form { padding: 0 1rem; }
}
</style>

<form class="guestbook-form" action="https://form.taxi/s/eoyi1r1u" method="POST">
  <label>
    Name
    <input type="text" name="Name" required>
  </label>

  <label>
    Email
    <input type="email" name="Email" inputmode="email" autocomplete="email">
  </label>

  <label>
    Message
    <textarea name="Message" required></textarea>
  </label>

  <input type="submit" value="Send">
</form>
