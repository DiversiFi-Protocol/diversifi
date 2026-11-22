# No email sign-up on the site

- **Status:** decided.
- **Decided by:** Stephen, on 2026-11-21.

## Question

Should the home page keep its "get the monthly reserve reading" email sign-up form?

## Context

The home page's final section had a form that posted an email address to `/api/subscribe`, which forwarded it to an email provider's webhook set by a `SUBSCRIBE_WEBHOOK_URL` secret.
It replaced the old site's Substack sign-up, and promised a reserve update about once a month.

## Decision

Remove the email sign-up entirely: the form, the `/api/subscribe` route, the `SUBSCRIBE_WEBHOOK_URL` setting, and every promise of a monthly email or newsletter.
The final section of the home page offers the app and a link to the live reserve figures instead.

## Reasoning

Nobody will send that email.
A sign-up that collects addresses for an email that never goes out breaks a promise to every visitor who uses it.

## Alternatives considered

- **Keep the form and send the monthly reserve reading.**
  Ruled out: nobody will send it.
- **Go back to the old Substack sign-up.**
  Ruled out for the same reason; it is also a monthly email nobody would write.

## Consequences

- The site no longer collects email addresses.
- `/api/subscribe` returns 404.
- The reserve figures stay on the home page itself, read live from the contract, so visitors check them there rather than by email.

## Plain version

The home page used to ask visitors for their email address to send them a monthly update.
Nobody is going to write that update, so Stephen had the form taken out.
The site no longer asks anyone for an email address.
