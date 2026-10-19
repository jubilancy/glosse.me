---
layout: page
title: guestbook
description: messages i've received, in one river.
lede: messages i've received, in one river. Fetched when the site builds, so it's never more than a day old.
---

<section>
  <div class="section-heading"><span>leave a message</span></div>

  <style>
    .guestbook-form {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      max-width: 640px;
      margin-top: 1.5rem;
      font-family: var(--mono);
    }

    .guestbook-form label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      color: var(--fg);
      font-size: 0.82rem;
      line-height: 1.5;
    }

    .guestbook-form input[type="text"],
    .guestbook-form input[type="email"],
    .guestbook-form textarea {
      width: 100%;
      padding: 0.7rem 0.8rem;
      background: var(--card);
      color: var(--fg);
      border: 1px dashed var(--muted);
      border-radius: 4px;
      font: inherit;
      font-size: 0.9rem;
      line-height: 1.5;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .guestbook-form textarea {
      min-height: 140px;
      resize: vertical;
    }

    .guestbook-form input[type="text"]:focus,
    .guestbook-form input[type="email"]:focus,
    .guestbook-form textarea:focus {
      border-color: var(--fg);
      border-style: dotted;
      outline: none;
    }

    .guestbook-form input[type="submit"] {
      align-self: flex-start;
      margin-top: 0.4rem;
      padding: 0.7rem 1rem;
      border: 1px solid var(--fg);
      border-radius: 999px;
      background: var(--fg);
      color: var(--bg);
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }

    .guestbook-form input[type="submit"]:hover {
      opacity: 0.9;
    }

    @media (max-width: 560px) {
      .guestbook-form {
        margin-top: 1rem;
      }
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
</section>
