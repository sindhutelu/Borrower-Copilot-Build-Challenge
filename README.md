# Borrower Copilot

A self-assessment for Indian borrowers: a verdict, two amounts (what a
lender might sanction vs. what you can safely carry), a fair rate band with
all-in APR, and an EMI ceiling — each traceable to a plain-English reason.
No login, no bureau pull, nothing saved.

## Run it (under a minute)

No build step, no install required for the app itself.

```
python3 -m http.server 8000
```

then open **http://localhost:8000** in a browser. (Opening `index.html`
directly also works in most browsers, since everything is plain script
tags with no bundler.)

Click one of the three persona buttons on the intro screen (Priya, Ravi,
Anita) for an instant demo, or click "Start" to answer the questions
yourself.

## Project layout

```
index.html      the app shell
styles.css      the design system
rules.js        pure domain engine — every threshold lives in one CONFIG
                object at the top, each entry tagged with a rule ID
engine.js       orchestration: wires rules.js into the four outputs
questions.js    the adaptive question set, as data
app.js          the wizard + results UI — the only file touching the DOM
RULES.md        every rule, value, and its "why" and source
RUNTHROUGHS.md  Priya, Ravi, Anita — questions asked, outputs, negotiation cards
WALKTHROUGH.md  what's built, what's next, what I'd cut
test/           node test scripts (not required to run the app)
```

## Changing a rule live

Open `rules.js`, edit the value in the `CONFIG` object at the top (every
entry is commented with its rule ID, matching RULES.md), save, and refresh.
No other file needs to change — this was a deliberate design choice for
the follow-up session.

## Running the test scripts (optional)

The app itself has zero dependencies. The test scripts use a couple of dev
dependencies (jsdom, for a headless UI smoke test):

```
npm install
node test/personas.test.js         # sanity-checks the three personas
node test/smoke.test.js            # drives the real UI end-to-end, headless
node test/generate-runthroughs.js  # regenerates RUNTHROUGHS.md verbatim from the live engine
```
