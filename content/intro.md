### Automatic Certificate Management
### at Internet Scale

[Daniel McCarney](https://binaryparadox.net) - April 11th, 2019.

[Polytechnique Montréal](https://www.polymtl.ca/en/) - Seminar Series Talk.

<a href="https://rfc8555-talk.binaryparadox.net" style="font-size:0.7em; color:lightseagreen">https://rfc8555-talk.binarypardox.net</a>

notes:

Let's get right into it.



<!-- .slide: data-background="img/ringedmush.jpg" -->
## Welcome

I'm [Daniel McCarney](https://binaryparadox.net)
([@cpu](https://github.com/cpu)).

I work for [ISRG](https://abetterinternet.org) on [Let's
Encrypt](https://letsencrypt.org).

notes:

My name is Daniel McCarney (sometimes I go by CPU). For the past 3 years I've
had the pleasure of working for the Internet Security Research Group (ISRG) on
Let's Encrypt.

Day to day I'm one of the three backend software developers that work on Let's
Encrypt's certificate authority software. I'm also one of the coauthors of RFC
8555, the protocol that powers our CA and the topic of today's talk.

I'm really excited to be able to talk to you all about this RFC. It's been
something I've been working on for the past three years and it was only
finalized in March. It was a huge effort to build an IETF standard and I'm
really proud of the result. There were 18 different draft versions of this
protocol and the end result really reflects the state of the art for CA
operations.

Let's talk about what I want you come away from this talk with.



## Goals

1. Understand what motivated ACME. <!-- .element: class="fragment" -->
1. Understand the inner workings of ACME. <!-- .element: class="fragment" -->
1. Know how to dig deeper. <!-- .element: class="fragment" -->

Notes:
I have three top level goals for my presentation to you today.

First, I want you to know what the ISRG and Let's Encrypt are and what motivated
the development of ACME. ACME fits into a larger context and mission and I hope
I can explain both.

Second, I want you to understand what happens behind the curtain when you use
Certbot or another ACME client to get a certificate from Let's Encrypt. By
talking through the low level details of ACME I can give you a powerful
foundation to build on if you run into trouble issuing your own certificates.
Deep knowledge of ACME is a greate resume skill - ACME is used for the vast
majority of trusted certificates in the web PKI.

Lastly I want you to know where to go if you want to dig deeper. Throughout my
talk I'll provide pointers back to sections of RFC 8555 so you know where to
look for more detail and all of the caveats. I'll also show you how to run
a test ACME CA for hands-on follow-up experimentation.

OK! Let's start on what motivated ACME. I told you I work for ISRG on Let's
Encrypt but let's dig into what both of those are and how they motivated ACME.



<img src="img/isrg-logo-standard.png" width="30%" height="auto">

> "Our mission is to reduce financial, technological, and educational barriers to secure communication over the Internet"

* Founded in 2013.
* 501(c)(3) public benefit corporation.

notes:

So what's the ISRG exactly?

The internet security research group is a 501(c)(3) non-profit corporation and our
mission is to reduce financial, technological and educational barriers to secure
communication over the Internet.

It was founded in 2013, growing out of a partnership between Mozilla, the EFF,
and the University of Michigan.

ISRG is sponsored by a diverse group of organizations, businesses, and other
non-profits.

You can read more about ISRG, the board of directors, or the technical advisory
board at "abetterinternet.org".



<img src="img/le-logo-wide.png" width="70%" height="auto">

> "Let's Encrypt is a free, automated, and open Certificate Authority"

* Beta access in [December 2015](https://letsencrypt.org/2015/12/03/entering-public-beta.html).
* Public launch [April 2016](https://letsencrypt.org/2016/04/12/leaving-beta-new-sponsors.html).
* Root CA trusted by [all major root programs](https://letsencrypt.org/2018/08/06/trusted-by-all-major-root-programs.html).

notes:

Ok, and so what's Let's Encrypt?

Let's Encrypt is a free, automated and open Certificate Authority run by the ISRG.

It became available for public beta access in December 2015 and went live April of 2016. 

To break into the CA ecosystem Let's Encrypt offers both an intermediate issued
by our own root CA and one with a cross-signature from an existing CA
(IdentTrust).

Since launch we've worked to have our root CA included in all of the major root
programs: Microsoft, Google, Apple, Mozilla, Oracle and Blackberry.



## Key Principles

Key principles behind Let's Encrypt:

* Free <!-- .element: class="fragment" -->
* Automatic <!-- .element: class="fragment" -->
* Secure <!-- .element: class="fragment" -->
* Transparent <!-- .element: class="fragment" -->
* Open <!-- .element: class="fragment" -->
* Cooperative <!-- .element: class="fragment" -->

notes:
Free - Anyone who owns a domain name can use Let's Encrypt to obtain a trusted certificate at zero cost.

Automatic - Software running on a web server can interact with Let's Encrypt to painlessly obtain a certificate, securely configure it for use, and automatically take care of renewal.

Secure - Let's Encrypt serves as a platform for advancing TLS security best practices, both on the CA side and by helping site operators properly secure their servers.

Transparent - All certificates issued are publicly recorded in multiple certificate transparency logs and available for anyone to inspect. We operate in the open instead of relying on any security through obscurity.

Open - Our automatic issuance and renewal protocol is published as an open standard that others can adopt.

Cooperative - Let's Encrypt is a joint effort to benefit the community, beyond the control of any one organization.



<!-- .slide: data-background="img/automation.gif"-->
## Why automation?

* Essential for ease of use. <!-- .element: class="fragment" -->
* Limit damage with shorter cert. lifetimes. <!-- .element: class="fragment" -->

notes:
You might wonder why "Automatic" is the second principle on our list after
"Free". Automation is central to everything Let's Encrypt does for a handful of
reaasons.

First, it's essential for ease of use. It reduces human intervention and chance
for error. Manual tasks are done infrequently and are prone to breaking between
attempts. We've all come back to a project a year or more after starting it and
thought "How did any of this make sense last year?"

Automation also enables risk mitigations like shorter certificate lifetimes.
Let's Encrypt only issues certificates valid for 90 days and that helps limit
damage from key compromise or mis-issuance. We know revocation in the web PKI is
broken and shorter certificate lifetimes is a practical defense.
