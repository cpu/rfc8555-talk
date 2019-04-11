<img src="img/stats.growth.jpg"/>

notes: In case the stats website embed didn't work (or stops working) I included
some screenshots from 2019-04-11.



<img src="img/stats.https.jpg"/>



<img src="img/stats.issued.jpg"/>



<!-- .slide: data-background="img/acme.mail.order.jpg" -->
## Ecosystem

Notes:
Another way we can measure adoption is by looking at the larger ACME ecosystem.
One of my favourite things has been watching the ACME client ecosystem explode
since Let's Encrypt launched. There's now an ACME client for practically every
niche.



## Client Ecosystem

* An ACME client for [every niche](https://letsencrypt.org/docs/client-options).
  * General purpose (e.g. [Certbot](https://certbot.org)).
  * Webservers (e.g. [Caddy](https://caddyserver.com/), [Apache](https://httpd.apache.org/docs/trunk/en/mod/mod_md.html), [HAProxy](https://www.haproxy.com/blog/lets-encrypt-acme2-for-haproxy/)).
  * Shell scripts (e.g. [acme.sh](https://acme.sh), [dehydrated](https://dehydrated.io/)).
  * Programming Languages (e.g. [Go autocert](https://godoc.org/golang.org/x/crypto/acme/autocert)).

Notes:
There are lots of great general purpose ACME clients. We recommend Certbot - it
was the first ACME client and remains a great choice for end-to-end management
of certificates especially if you're using nginx or Apache.

An exciting area of development is seeing webservers build-in first class ACME
support. Caddy was the leader in this space and since then both Apache and
HAProxy have adopted ACME support.

Lots of folks want an ACME client with as few dependencies as possible and there
are some great shell script ACME clients that fit this role well. acme.sh and
dehydrated are two of the best known.

We're even seeing programming languages integrate ACME. Go has an excellent
autocert package that can handle automatically acquiring certificates from an
ACME CA for your Go programs to use.



## Server/CA Ecosystem

* Let's Encrypt
  * [Boulder](https://github.com/letsencrypt/boulder)
  * [Pebble](https://github.com/letsencrypt/pebble)
* EJBCA Enterprise
* Other CAs:
  * Sectigo
  * Buypass
  * Globalsign
  * DigiCert
  * Entrust

Notes:
The ACME server ecosystem is also active. Let's Encrypt's ACME server, Boulder,
is open source. We also provide Pebble, a small testing focused ACME server
great for building ACME client integration tests and experimenting with the
protocol.

We're also seeing other CAs and CA software providers offer ACME support.




## Automating Certificate Issuance

* What class of certificate? DV, OV, or EV? <!-- .element: class="fragment" -->
* Verifying domain ownership: <!-- .element: class="fragment" -->
  * CA/B forum [baseline requirements](https://cabforum.org/baseline-requirements-documents/).
  * Root program requirements (e.g. [Mozilla](https://wiki.mozilla.org/CA)).

Notes:
So let's talk about how Let's Encrypt approaches automating certificate
issuance. Before we dive into ACME I think it's important to understand the
larger context it was built for.

First, ACME is principally concerned with domain-validated certificates. That's
the only kind of certificate that Let's Encrypt issues. These certificates are
cryptographically equivalent to other types of certificates but do not attest
organizational identity. They attest control of the domain names in the
certificate. We'll talk about verifying control more in a moment.

Organization-validated (OV), or Extended-Validation (EV) certificates require
validation above and beyond verifying control of domain names and that
precludes, or at the least greatly complicates, automation.

Issuing DV certs requires verifying control of domain ownership. How can that be
done?

For the web PKI the rules surrounding this are dictated by the CA/Browser forum
(CABF). The CABF is responsible for the "baseline requirements", a series of
documents explaining base policies regarding the operation of a certificate
authority. In addition to the baseline requirements individual root programs run
by browser and OS manufactures add their own policy requirements. Trusted CAs
undergo yearly audits and violations of CABF or root program policy is handled
as a serious event requiring significant follow-up and discussion.
