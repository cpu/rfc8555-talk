# Automatic Certificate Management at Internet Scale

Presented at [Polytechnique Montréal](https://www.polymtl.ca/en/) April 11th,
2019 as an invited talk for the Computer Science department seminar series.

## Talk Abstract:

Let's Encrypt is a free, automated, and open certificate authority (CA) run for
the public's benefit. Since its launch in 2016 Let's Encrypt has issued
certificates for over 157 million fully qualified domain names and helped drive
global HTTPS adoption.

As part of realizing automatic certificate management able to scale to the
Internet at large Let's Encrypt helped develop a new protocol called "ACME", the
Automatic Certificate Management Environment. This protocol is now
published by the IETF as a standards track document, RFC 8555.

In this talk I will provide a guided tour of RFC 8555 and discuss the evolution
of the protocol from its earlier drafts to the current standard. There is
already a thriving ecosystem of ACME clients and more CAs are implementing
servers each year. I'll close with a brief demonstration of how you can quickly
and easily run your own test ACME certificate authority to experiment with the
protocol.

## Source Code Usage

This repository holds the full slideshow content and related sourcecode. 99% of
the repo is [reveal.js](https://github.com/hakimel/reveal.js). For talk content
specific to this reveal.js fork see `index.html`, and `content/*.md`.

### Local Hosting

To run/view this slideshow locally with speaker notes follow the [full
`reveal.js` setup](https://github.com/hakimel/reveal.js#full-setup) and run `npm
start` in the root of the repository.

### Heroku Deploy

I've also added an Express wrapper (`web.js`) and some Heroku metadata
(`Procfile`) to allow the slidedeck and speaker notes application to be deployed
to heroku.

After signing up for a Heroku account and [installing the `heroku`
CLI](https://devcenter.heroku.com/articles/heroku-cli) run the following in the
root of the repository to setup a Heroku application and deploy it.

1. heroku create
1. git push heroku master

I of course recommend upgrading your Dyno so you can use the [Let's Encrypt
integration]()

## Speaker Bio:

Daniel McCarney (@cpu) is a backend software developer for the Internet Security
Research Group (ISRG). He is a co-author of RFC 8555 and a primary maintainer of
Boulder, the open source ACME certificate authority that powers Let's Encrypt.
Daniel lives in rural Quebec and enjoys contributing to free software, writing
retro computer viruses and taking pictures of mushrooms.

## Credits

Slideshow built with [revealjs](http://revealjs.com/).
