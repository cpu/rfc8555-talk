<img src="img/acme-logo-full.png" width="30%" height="auto" style="background:white;">

The Automated Certificate Management Environment

Notes:

To automate domain validation for the web PKI Let's Encrypt and others helped
developed ACME - the Automated Certificate Management Environment. From the
get-go ISRG wanted to make ACME an IETF standard.

We achieved that goal in March of 2019 when RFC 8555 was published by the RFC
editors.

Making ACME an internet standard meant we could centralize expert review of the
protocol and associated cryptography. Prior to ACME each CA would independently
devise validation methods that met the baseline requirements.

The baseline requirements are high level descriptions of permitted validation
methods. By design they don't have the level of detail required to write a
computer program. In comparison an IETF RFC is meant to be implemented and is
greatly concerned with low level details and interoperation. ACME tightly
specifies methods

Making ACME a standard helps develop an ecosystem where subscribers can switch
between CAs without needing to change software.

It's now an immutable document. Errata can be filed and new add-on drafts
devised but RFC 8555 is now as it always will be.



<!-- .slide: data-background="img/road.jpg"-->
## ACME From the inside out

* Plan of attack:
  * Directory <!-- .element: class="fragment" -->
  * Request authentication <!-- .element: class="fragment" -->
  * Resources <!-- .element: class="fragment" -->
    * Accounts
    * Identifiers
    * Challenges
    * Authorizations
    * Orders
  * Certificate issuance <!-- .element: class="fragment" -->

Notes:
We have more than enough context. Let's dive into the ACME protocol together.
Here's a rough map of the topics I'll cover. I like to approach this from the
"inside out" and talk about the smaller resources first, building out to the
larger end to end picture. At its core ACME is a REST API used over HTTPS. 
If you're familiar with other HTTP based REST APIs you'll have a leg-up when it
comes to thinking about ACME.

The directory is the entrypoint to the protocol and how a client learns other
URLs. It's where ACME clients start and it's where we'll start too.

Account management and request authentication are concerns common to most APIs.
ACME is slightly unique in that it doesn't use passwords or authentication
tokens. Accounts are identified by public key and signatures are used for
request authentication.

Identifiers are an abstraction that helps make ACME extensible. For our
purposes all identifiers are domain names in the Internet DNS.

Challenges are mechanisms used to prove control of an identifier.

Authorizations link challenges to identifiers. An account that has solved a
challenge for an identifier has an authorization to issue certificates for that
identifier for some period of time.

Orders are how Accounts get authorizations for a set of domain names. An order
is a collection of identifiers and authorizations.

Certificate issuance involves finalizing an order with a CSR after completing
the required authorizations.



<!-- .slide: data-background="img/yellowpages.jpg"-->
## Directory

* RFC 8555 [Section 7.1.1](https://tools.ietf.org/html/rfc8555#section-7.1.1)
* Directory URL is the only URL required to configure a client.
* Provides a level of URL indirection.
* Holds important metadata (CAA identity, Terms of Service, etc).

Notes:
The directory resource is where ACME clients start and its where we'll start
too. Making a GET request to an ACME server's directory URL returns a JSON
object like the one shown on the slide. The directory URL is the one piece of
information that ACME servers have to provide to ACME clients.

The directory object is a level of indirection that lets server operators
control their own URL structure while still letting clients discover the URLs
to use for ACME server operations.

The directory also contains important metadata used for CAA and for accessing
the CA's terms of service.


## Example Directory

```
{
  "QJB1rQHS7EY": "https://community.letsencrypt.org/t/adding-random-entries-to-the-directory/33417",
  "keyChange": "https://acme-v02.api.letsencrypt.org/acme/key-change",
  "meta": {
    "caaIdentities": [
      "letsencrypt.org"
    ],
    "termsOfService": "https://letsencrypt.org/documents/LE-SA-v1.2-November-15-2017.pdf",
    "website": "https://letsencrypt.org"
  },
  "newAccount": "https://acme-v02.api.letsencrypt.org/acme/new-acct",
  "newNonce": "https://acme-v02.api.letsencrypt.org/acme/new-nonce",
  "newOrder": "https://acme-v02.api.letsencrypt.org/acme/new-order",
  "revokeCert": "https://acme-v02.api.letsencrypt.org/acme/revoke-cert"
}
```

notes:
You might notice the one random looking directory object key in the output.
That's a special entry that changes for every GET request and helps discourage
ACME client implementations from erroring when we introduce a new directory
key.



## Request authentication
<img src="img/coyotedisguise.jpg"/>

* JSON Web Signatures (JWS) - [RFC 7515](https://tools.ietf.org/html/rfc7515)
  * JSON Web Key (JWK) - [RFC 7517](https://tools.ietf.org/html/rfc7517)
  * JSON Web Algorithms (JWA) - [RFC 7518](https://tools.ietf.org/html/rfc7518)

Notes:
Okay, let's talk about request authentication. These acronyms going to come up
a lot for the rest of the presentation, so I'll try to explain them clearly now.

ACME needs an interoperable way to represent public keys and signatures over
data. Building on other IETF standards helped make ACME an achievable project.
Since ACME is an HTTP API it also benefits from using primitives meant for the
web context.

The downside is that I have a slide to show you full of RFC #'s and acronyms
starting with the letter J.

ACME requests are authenticated using JSON Web Signatures (JWS). Those are
specified based on JSON Web Keys (JWK) and JSON Web Algorithms (JWA). There are
other "J" standards in this family (JWT for tokens, JWE for encryption) but
ACME only uses these three.

To save you reading a pile of RFC's I'll give you my high level summary:


## JWA == Algorithm Identifiers

Notes: JWA species ways to identify crypto algorithms, identifiers and
parameters in JSON.

JWS and JWK both rely on definitions from JWA to say stuff like this is an
"HMAC using SHA-384".


## JWK == Public/Private Keys in JSON

Notes: JWK specifies JSON data structures for cryptographic keys. If you need
to represent an ECDSA private key in JSON RFC 7515 will tell you how.


## JWS == Signatures in JSON

Notes: JWS specifies a way to represent digital signatures (and MACs) in JSON.
ACME primarily uses digital signatures but does use MACs in one place to
provide external account binding.

One important thing to know is that JWS allows headers to be added to the
protected data. That is, the signature is over both the message and a set of
additional protected headers.



## ACME Request authentication

* RFC 8555 [Section 6.2](https://tools.ietf.org/html/rfc8555#section-6.2).
* Two types of JWS:
  * JWS with embedded JWK.
  * JWS with key ID.
* ACME specific details:
  * URL header.
  * POST-as-GET.

Notes:
ACME builds on JWS as the primary primitive used to provide request
authentication. There are two primary types of JWS used by ACME: JWS that embed
a JWK and JWS that specify a key ID.

The kind that embed a JWK are used when there isn't an existing Account to
authenticate the request. For example, newAccount requests can't specify a key
ID that the server knows because the account/key relationship hasn't been
created yet. For that reason the JWS embeds the public key that can be used to
verify the request. The server can unpack that key from the JWS, verify the
signature, and store the key for use in the future.

Once the server knows a public key for a specific account future requests can
use JWS that specify a key ID that the server gave the client. When the server
receives a request with a JWS it can lookup the JWK by the key ID and verify
the signature.

ACME requires all JWS include a protected "url" header that indicates the URL
the client intended to send the authenticated request in the signed JWS. This
prevents an authenticated request for one ACME endpoint from being used with a
different ACME endpoint. ACME also specifies nonces to prevent replay attacks
but I don't have time to get into that aspect of the protocol today.

Since GET requests don't provide a convenient way to send a large JWS like a
POST request they are considered unauthenticated. As a consequence when an ACME
client needs to fetch information from the server the protocol specifies a way
to do it with an authenticated POST that has a specific body that indicates it
is meant to be a GET request. The protocol calls this a "POST-as-GET" request.


## Example JWS (embedded JWK, encoded)

```
{
  "payload":"eyJDb250YWN0IjpbIm1haWx0bzpjcHVAbGV0c2VuY3J5cHQub3JnIiwibWFpbHRvOmRhbmllbEBiaW5hcnlwYXJhZG94Lm5ldCJdLCJ0ZXJtc09mU2VydmljZUFncmVlZCI6dHJ1ZX0",
  "protected":"eyJhbGciOiJFUzI1NiIsImp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6IjNlbXltUGJJZ0kxTEl3ZlZoMFNTUDNyN2lmdGEyWl9Jd2NFWTlabHF4NVUiLCJ5IjoiZ0NicHNwVW42eE5Vd2Z0MEtxNGlmOXItQ3VTYmdpZ2xkaXRkSnI3cG9zTSJ9LCJub25jZSI6Ikd3bWx5bWp2cDc4T3huOEN5emxKWWciLCJ1cmwiOiJodHRwczovL2xvY2FsaG9zdDoxNDAwMC9zaWduLW1lLXVwIn0",
  "signature":"_buNEH1m6CBl8AcB0GbeffFIpfojTKNTrJgFeHCAKdUwTWFh22aYg0MRErvWBEDa-lD76ueznmN5paT7OvaVDg"
}
```

Notes:
Not much to look at is it? That's primarily because of the URL Safe BASE64
encoding that has been applied on top of everything by the JWS serialization.

At the top level we can see there is a payload, a protected headers field, and
a signature over the two.

Let's look at this with some of the encoding peeled away.


## Example JWS (embedded JWK, decoded)

```
{
  "payload": {
    "contact": [
       "mailto:cpu@letsencrypt.org",
       "mailto:daniel@binaryparadox.net"
    ],
    "termsOfServiceAgreed": true
  },
  "protected": {
    "alg": "ES256",
    "jwk": {
      "kty": "EC",
      "crv": "P-256",
      "x":"..",
      "y":"..."
   },
   "nonce": "Gwmlymjvp78Oxn8CyzlJYg",
   "url": "https://localhost:14000/sign-me-up"
  }
  "signature": 0xFD 0xBB .. 0xE
}
```

Notes:
Now we have something much clearer! The "payload" is a newAccount request with
some contact information. The "protected" headers tell us that the signature is
ECDSA using P-256 and SHA-256. Embedded in the protected headers is the P-256
ECDSA public key that can be used to verify the signature. Alongside the JWK is
a nonce and the URL that the request was sent to.


## Example JWS (key ID, decoded)

```
{
  "payload": {
    "Identifiers": [
      { "Type": "dns", "Value": "example.com" },
      { "Type": "dns", "Value": "www.example.com" }
    ]
  },
  "protected": {
    "alg": "ES256",
    "kid": "https://localhost:14000/my-account/1",
    "nonce":"CQYiFjCIMkIXvZP42Zq4zw",
    "url":"https://localhost:14000/order-plz"
   }
   "signature": 0x76 0x1A .. 0xB5
}
```

Notes:
I'll skip right to the decoded version of the JWS example with a key ID.

The Key ID form of a JWS looks very similar. In this example the payload is a
new order request for two DNS identifiers. The protected headers no longer
include a JWK and instead there is a "kid" value that lets the ACME client tell
the server to use the JWK associated with the given ID to verify the signature.



<!-- .slide: data-background="img/univac.png"-->
## ACME Resources

Notes:
Ok, now that we've covered request authentication we can talk about some of
ACME's resources. These are the objects we're manipulating via the ACME REST
API.



## Accounts

* RFC 8555 [Section 7.3](https://tools.ietf.org/html/rfc8555#section-7.3).
* Binding between a JWK and contact information.
* Contact information can be updated.
* Associated JWK can be changed.

Notes:
The first resource to cover is the Account resource.

We already saw what a newAccount request looks like when we talked about JWS
with an embedded JWK.

The main thing to know is that an ACME account is a binding between some
(potentially optional) contact information and a JWK.


## Example Account

```
{
   "status": "valid",
   "contact": [
      "mailto:cpu@letsencrypt.org",
      "mailto:daniel@binaryparadox.net"
   ],
   "key": {
      "kty": "EC",
      "crv": "P-256",
      "x": "3emymPbIgI1LIwfVh0SSP3r7ifta2Z_IwcEY9Zlqx5U",
      "y": "gCbpspUn6xNUwft0Kq4if9r-CuSbgiglditdJr7posM"
   }
}
```
Notes:
Here's an example account resource returned by an ACME server to a newAccount
request. We can see the account has a "status" and that status is "valid" since
the account was just created.


## Account Status Changes

```
                     valid
                       |
                       |
           +-----------+-----------+
    Client |                Server |
   deactiv.|                revoke |
           V                       V
      deactivated               revoked
```

Notes:
Most ACME resources have a status field. Each resource can be described by the
state changes that occur to it based on API requests and server events.

The Account resource's status changes are a great first example because they're
quite simple. Accounts are created in the valid status and can only change to
deactivated or revoked. They change to deactivated when a client requests the
account be shut down and they change to revoked if the server operator closes
the account for any reason (e.g. subscriber agreement violations).



## Identifiers

* An abstraction that binds a type and a value.
* RFC 8555 only specifies DNS type identifiers.
  * value == domain name.
* Other specifications may add more (e.g. IP type).

Notes:
Identifiers are pretty straight forward and primarily an extension point for
add-ons to ACME.

RFC-8555 only covers DNS type identifiers where the value is a domain name.

Other specifications down the road may add new types. For instance one of my
coworkers is working on a draft for IP type identifiers and corresponding
challenges.


## Example Identifiers

```
{
  "type": "dns",
  "value": "example.com",
}
```

```
{
  "type": "ip",
  "value": "2001:4860:4860::8888",
}
```

Notes:
The first example is a standard DNS type identifier for the domain name
example.com

The second example is from the ACME-IP draft and not part of the base
specification.



## Challenges

* RFC 8555 [Section 8](https://tools.ietf.org/html/rfc8555#section-8).
* Prove control of an identifier.
* Fields common to all challenge types:
  * url
  * type
  * status
  * token
  * error (if the challenge failed)

notes:
ACME clients prove control of identifiers by completing challenges the ACME
server provides.

RFC 8555 provides two types of challenges and others are being specified in
add-on standards. Each challenge type is different but they all share some
common fields.


## Responding to Challenges

* RFC 8555 [Section 7.5.1](https://tools.ietf.org/html/rfc8555#section-7.5.1).
* Client process:
  1. Get token from challenge.
  1. Compute key authorization.
  1. Configure a challenge response (_type dependent_).
  1. POST `{}` to Challenge URL.
* Server checks computed vs received key auth.

Notes:
Clients respond to challenges by computing a key authorization using the
challenge's random token. More on key authorizations shortly.

Every challenge type will have a different method of conveying the key
authorization to the ACME server. For example the ACME server may expect to be
able to make an HTTP request to the server and receive the expected key
authorization.

Once the client has configured the key authorization response correctly based
on the challenge type it can POST a JWS over an empty JSON object to the
challenge URL. That will initiate the ACME server reaching out to the Internet
in some way to validate the challenge.


## Key Authorizations

* RFC 8555 [Section 8.1](https://tools.ietf.org/html/rfc8555#section-8.1).
  * Account's JWK thumbprint ([RFC 7638](https://tools.ietf.org/html/rfc7638)).
  * Challenge's random token.

```
keyAuthorization = 
  token || '.' || base64url(Thumbprint(accountKey))
```

notes:
All of the challenges operate by having the server calculate the expected key
authorization for a given challenge owned by a specific account and then
checking that the ACME client can convey that same key authorization over one
of the challenge channels.

A key authorization for a challenge is just the concatination of the
challenge's token field with the thumbprint of the JWK of the account solving
the challenge (encoded in BASE64 URL).


## Challenge Status Changes

```
            pending
               |
               | Receive
               | response
               V
           processing <-+
               |   |    | Server retry or
               |   |    | client retry request
               |   +----+
               |
               |
   Successful  |   Failed
   validation  |   validation
     +---------+---------+
     |                   |
     V                   V
   valid              invalid

```

notes:
the challenge status changes are more complex than for accounts but still
reasonably simple. Challenges start life as "pending". When the client POSTs
the challenge to initiate it the status will change to "processing". That
status will remain until the ACME server decides validation of the challenge
was failed and sets the status to "invalid", or if the challenge succeeds and
the server sets the status to "valid"



<!-- .slide: data-background="img/challenge.gif"-->
## RFC 8555 Challenge Types

* HTTP-01
* DNS-01

Notes:
RFC 8555 defines two challenge types, one for HTTP and one for DNS.


## HTTP-01

* CABF BRs "Agreed-Upon Change to Website".
* HTTP request over port 80.
* Uses ".well-known" directory ([RFC 5785](https://tools.ietf.org/html/rfc5785)).

```
/.well-known/acme-challenge/<token>
```

* the ACME server SHOULD follow redirects.

Notes:
This challenge type maps to the baseline requirements "Agreed upon change to a website".

HTTP-01 operates by making an HTTP request over port 80 to a specific path the
domain name to be authorized.

The path portion of the request is specified in RFC 8555 and uses the well-known
directory, a place defined in RFC 5785 for website administrators to put medata
unrelated to the content of the website.

The HTTP-01 path uses a registered directory under well known, acme-challenge,
and includes the challenge token value.


## Example Challenge (HTTP-01)

```
{
  "Type": "http-01",
  "URL": "https://localhost:14000/chalZ/Gpv4lK7R9kozBNUDgCqMsDAdESBkD221K0gpJIHA0fk",
  "Token": "EQOAvL4quK0sEkGoYqOmdIWZxHCg3g5fBCbBpzafAoA",
  "Status": "pending"
},
```

* Imagine challenge was for `example.com`.
* HTTP-01 request will be made to:

```
"http://example.com/.well-known/acme-challenge/EQOAvL4quK0sEkGoYqOmdIWZxHCg3g5fBCbBpzafAoA"
```
Notes:
Here's an example HTTP-01 type challenge. It's in pending status because it was
just created. You can see its random token there as well as the URL that is
POSTed to start the challenge.

If we imagine this challenge was for example.com then POSTing the URL would make
the CA initiate an HTTP request to the path shown on screen. The result should
be the correct key authorization.



## DNS-01

* CABF BRs "DNS Change".
* Lookup for TXT `_acme-challenge.<domain>`.
* Expected value is SHA256 of key authorization.
* Let's Encrypt requires DNS-01 for wildcards.

Notes:
The DNS-01 challenge type maps to the CABF "DNS Change" method.

It operates by making a TXT lookup to the authoritative nameservers for the
given domain. The TXT name is prefixed with a DNS-01 challenge prefix. The
result should be the SHA256 hash of the correct key authorization. A hash is
used here to fit a key authorization into DNS.


## Example Challenge (DNS-01)

```
{
  "Type": "dns-01",
  "URL": "https://localhost:14000/chalZ/Gpv4lK7R9kozBNUDgCqMsDAdESBkD221K0gpJIHA0fk",
  "Token": "f_JMDWUQd8aHOD2I9Mh2ltanIkAbcFiedKR65lRYchc",
  "Status": "invalid",
  "Error": {
    "Type": "urn:ietf:params:acme:error:unauthorized",
    "Detail": "Error retrieving TXT records for DNS challenge",
    "Status": 403
  }
},
```

* Imagine challenge was for `example.com`.
* DNS-01 query would have been:

```
_acme-challenge.example.com.    IN    TXT
```
Notes:
Very similar to an HTTP-01 challenge. Here the status is invalid because the
challenge has already been attempted and failed for the provided error reason.

If we imagine the challenge was for example.com then the lookup that failed
would have been for a TXT of the form on-screen.




## Authorizations

* RFC 8555 [Section 7.1.4](https://tools.ietf.org/html/rfc8555#section-7.1.4).
* Authorizations combine challenges and an identifier.
* Have a status and an expiry.
* Complete challenge -> authorized for the identifier.

Notes:
Authorizations group challenges and an identifier. They have a status, and an
expiry. If an account completes a challenge successfully then the authorization
for the identifer is valid and the account is said to be authorized to issue
certificates for that identifier.


## Example Authorization

```
{
  "Status": "valid",
  "Identifier": {
    "Type": "dns",
    "Value": "www.example.com"
  },
  "Challenges": [
    {
      "Type": "http-01",
      "URL": "https://localhost:14000/chalZ/b3qXIe_wmLMhCsm7PKsJSV_ErBIdNsrSFLIBbJJ_3E0",
      "Token": "yYWJ2FxUM8HTldFNjIaI8Uc88aFzpA8sim0EEtq4YAg",
      "Status": "valid"
    }
  ],
  "Expires": "2019-04-08T22:25:52Z",
  "Wildcard": false
}
```
Notes:
Here's a valid authorization for www.example.com. We can see the http-01
challenge was validated successfully.


## Authorization Status Changes

```
                  pending --------------------+
                     |                        |
   Challenge failure |                        |
          or         |                        |
         Error       |  Challenge valid       |
           +---------+---------+              |
           |                   |              |
           V                   V              |
        invalid              valid            |
                               |              |
                               |              |
                               |              |
                +--------------+--------------+
                |              |              |
                |              |              |
         Server |       Client |   Time after |
         revoke |   deactivate |    "expires" |
                V              V              V
             revoked      deactivated      expired
```



## Orders

* RFC 8555 [Section 7.1.3](https://tools.ietf.org/html/rfc8555#section-7.1.3).
* Collect up identifiers and authorizations.
* Have a URL for order finalization.
* Have a URL for certificate retrieval.
* Primary difference between ACME v1 and v2.


## Example Order

```
{
  "Status": "pending",
  "Identifiers": [
    {
      "Type": "dns",
      "Value": "example.com"
    },
    {
      "Type": "dns",
      "Value": "*.example.com"
    },
    {
      "Type": "dns",
      "Value": "www.example.com"
    }
  ],
  "Authorizations": [
    "https://localhost:14000/authZ/WJsytes0fHuP3Fh0sjUo-ckuuLNzZg5gWkmBnNzOoUU",
    "https://localhost:14000/authZ/-on9sfIPyHYeMkrx0aj2ppSppE9AyNn76X6K9LI_Hmo",
    "https://localhost:14000/authZ/b8FS_BtHhP0yOlbMxagLQX_RmVi7YsG1CPhP5zFyIxY"
  ],
  "Finalize": "https://localhost:14000/finalize-order/PLLqRucyQ4HJVozSQhDWrXjEU28dxUKhvpRg3H7335I"
}
```


## Order Finalization

* RFC 8555 [Section 7.4](https://tools.ietf.org/html/rfc8555#section-7.4).
* All authorizations valid -> order is ready.
* POST a CSR matching order.
* Initiates certificate issuance process.


## Order Status Changes

```
    pending --------------+
       |                  |
       | All authz        |
       | "valid"          |
       V                  |
     ready ---------------+
       |                  |
       | Receive          |
       | finalize         |
       | request          |
       V                  |
   processing ------------+
       |                  |
       | Certificate      | Error or
       | issued           | Authorization failure
       V                  V
     valid             invalid
```



## Certificate Issuance

1. Create an account (or use existing). <!-- .element: class="fragment" -->
1. Create an order for some identifiers. <!-- .element: class="fragment" -->
1. POST-as-GET order authorizations. <!-- .element: class="fragment" -->
1. POST authorization challenges. <!-- .element: class="fragment" -->
1. POST-as-GET order to poll status. <!-- .element: class="fragment" -->
1. POST order finalization URL. <!-- .element: class="fragment" -->
1. POST-as-GET order to poll status. <!-- .element: class="fragment" -->
1. POST-as-GET certificate URL. <!-- .element: class="fragment" -->


## A Demo

* [Pebble](https://github.com/letsencrypt/pebble)
* [acmeshell](https://github.com/cpu/acmeshell)


## Create an account (encoded)

```
{
  "payload": "eyJ0ZXJtc09mU2VydmljZUFncmVlZCI6dHJ1ZX0",
  "protected": "eyJhbGciOiJFUzI1NiIsImp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6ImxXVlVvZGx5bWRIbm9pSnJtZmlxT2FCNEU0WlBrN0tMSUN2ZXp0VElSUnMiLCJ5IjoidG5BQU9BNXROdklnSlFUWnUzRjR0WnJPeXEwUnpoS2pJUDJLcHJ3QmJGZyJ9LCJub25jZSI6Ik9nM1NQVnBHcXRIYnlnRkdkY0toUmciLCJ1cmwiOiJodHRwczovL2xvY2FsaG9zdDoxNDAwMC9zaWduLW1lLXVwIn0",
  "signature": "3-3Y19y7ierH8WyDi9LKk7X7p6Ew6cXDvBwH3SPlCIYxEa6YRhWg9vTVYGQ2jtIINJstSM0q2HietP7gURTVoQ"
}

```


## Create an account request (decoded)

```
{
  "payload": { "termsOfServiceAgreed": true },
  "protected": {
    "alg": "ES256",
    "jwk": {
       "kty": "EC",
       "crv": "P-256",
       "x": "lWVUodlymdHnoiJrmfiqOaB4E4ZPk7KLICveztTIRRs",
       "y":"tnAAOA5tNvIgJQTZu3F4tZrOyq0RzhKjIP2KprwBbFg"
     },
    "nonce":"Og3SPVpGqtHbygFGdcKhRg",
    "url":"https://localhost:14000/sign-me-up"
  }
  "signature": 0xDF 0xED ... 0xA1
}
```


## Create an account response

```
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Location: https://localhost:14000/my-account/4
Replay-Nonce: DhU9Y935pdoLljog6QNTeg

{
  "status": "valid",
  "contact": null,
  "key": {
    "kty": "EC",
    "crv": "P-256",
    "x": "lWVUodlymdHnoiJrmfiqOaB4E4ZPk7KLICveztTIRRs",
    "y":"tnAAOA5tNvIgJQTZu3F4tZrOyq0RzhKjIP2KprwBbFg"
  }
}
```


## Create an order request

```
{
  "payload": {
    "identifiers": [
      { "Type": "dns", "Value": "www.example.com" }
    ]
   },
   "protected": {
     "alg": "ES256",
     "kid": "https://localhost:14000/my-account/4",
     "nonce": "DhU9Y935pdoLljog6QNTeg",
     "url": "https://localhost:14000/order-plz"
   }
   "signature": 0x18 0xFD ... 0x27
}
```


## Create an order response

```
HTTP/1.1 201 Created
Location: https://localhost:14000/my-order/ddtQT_w2db4_duhSBMw8_dhh8Nl6WrA-z4tyKLDFij0
Replay-Nonce: iytxlxWar3QCY2aMGqMYKw

{
   "status": "pending",
   "expires": "2019-04-10T00:48:11Z",
   "identifiers": [
      {
         "type": "dns",
         "value": "www.example.com"
      }
   ],
   "finalize": "https://localhost:14000/finalize-order/ddtQT_w2db4_duhSBMw8_dhh8Nl6WrA-z4tyKLDFij0",
   "authorizations": [
      "https://localhost:14000/authZ/omPvqSb5PVcusOXWYwCAfutnqBB4OPl0kEtFdxc5z8E"
   ]
}
```


## POST-as-GET authz request

```
{
  "payload": "",
  "protected: {
    "alg": "ES256",
    "kid": "https://localhost:14000/my-account/4",
    "nonce": "xqozOFYWYhXsq_hyJg4fPg",
    "url": "https://localhost:14000/authZ/omPvqSb5PVcusOXWYwCAfutnqBB4OPl0kEtFdxc5z8E"
  }
  "signature": 0xCC 0xEB ... 0xE
}
```


## POST-as-GET authz response

```
HTTP/1.1 200 OK
Replay-Nonce: sNMWGwIK5wMXFrzm21p-Ng

{
   "status": "pending",
   "identifier": {
      "type": "dns",
      "value": "www.example.com"
   },
   "challenges": [
      {
         "type": "tls-alpn-01",
         "url": "https://localhost:14000/chalZ/A_96Z_fTL6pe4JrtSqDjA9VDXWjgcWGlm7ih-XK-koI",
         "token": "JEfi7_-El3qP1MKi-7VcNReV7I29xXRDrlpnSln0iuQ",
         "status": "pending"
      },
      {
         "type": "dns-01",
         "url": "https://localhost:14000/chalZ/qguIRyQPHv81TdiRS6xuRUSjEBY7YKX2tABKbh0GASA",
         "token": "7dj04U8Toa_lfmZtMrnhmqEni2Y2J07p3KqvlzbQhN8",
         "status": "pending"
      },
      {
         "type": "http-01",
         "url": "https://localhost:14000/chalZ/oFzGjAjGti1_aEPsLUBdJorDEc3EWjDzyg1OlvBz0z4",
         "token": "7HE-HjevqwuuNhg00xaNWxZFb2quXOUCDWBqeZb6rWA",
         "status": "pending"
      }
   ],
   "expires": "2019-04-09T01:48:11Z"
}
```


## Initiate Challenge Request

```
{
  "payload": {},
  "protected": {
    "alg": "ES256",
    "kid": "https://localhost:14000/my-account/4",
    "nonce": "rYPgIMyC2O_fB7-QI2EwyA",
    "url": "https://localhost:14000/chalZ/oFzGjAjGti1_aEPsLUBdJorDEc3EWjDzyg1OlvBz0z4"
  },
  "signature": 0xE7 0x61 ... 0x4F
}

```


## Initiate Challenge Response

```
HTTP/1.1 200 OK
Link: <https://localhost:14000/authZ/omPvqSb5PVcusOXWYwCAfutnqBB4OPl0kEtFdxc5z8E>;rel="up"
Replay-Nonce: B-IhW4ZJtW7ymtVTCUp4nQ

{
   "type": "http-01",
   "url": "https://localhost:14000/chalZ/oFzGjAjGti1_aEPsLUBdJorDEc3EWjDzyg1OlvBz0z4",
   "token": "7HE-HjevqwuuNhg00xaNWxZFb2quXOUCDWBqeZb6rWA",
   "status": "pending"
}
```


## POST-as-GET Order Request

```
{
  "payload": "",
  "protected": {
    "alg": "ES256",
    "kid": "https://localhost:14000/my-account/4",
    "nonce": "DkTlhJFoGyrfwFJeiJ8iWw",
    "url": "https://localhost:14000/my-order/ddtQT_w2db4_duhSBMw8_dhh8Nl6WrA-z4tyKLDFij0"
  },
  "signature": 0xDF 0xA8 .. 0xC7
}
```


## POST-as-GET Order Response

```
HTTP/1.1 200 OK
Replay-Nonce: KLN2pvm7vj3b29dh5Qf3LQ

{
   "status": "ready",
   "expires": "2019-04-10T00:48:11Z",
   "identifiers": [
      {
         "type": "dns",
         "value": "www.example.com"
      }
   ],
   "finalize": "https://localhost:14000/finalize-order/ddtQT_w2db4_duhSBMw8_dhh8Nl6WrA-z4tyKLDFij0",
   "authorizations": [
      "https://localhost:14000/authZ/omPvqSb5PVcusOXWYwCAfutnqBB4OPl0kEtFdxc5z8E"
   ]
}
```


## Finalize Order Request

```
{
  "payload": {
    "CSR": "MIIBAjCBqQIBADAaMRgwFgYDVQQDEw93d3cuZXhhbXBsZS5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAASkMDMKzAdTkJsH4YcE5ixLaDS1Qit5_tR2ebWKBszUmvkPIZr6kRtLQVgt4epZH7GrStht3r7CzLMNQbwmLjfvoC0wKwYJKoZIhvcNAQkOMR4wHDAaBgNVHREEEzARgg93d3cuZXhhbXBsZS5jb20wCgYIKoZIzj0EAwIDSAAwRQIhAMXRko5wtKTR8IMtaz9BImeq24Ya3dyrjmjLm8joz_SRAiAyCfx-zr95LMEFkN5eAZ4ZcpnV44c2SQ_m4IUQ8SkDdg"
  }
  "protected": {
    "alg": "ES256",
    "kid": "https://localhost:14000/my-account/4",
    "nonce": "wFO2L9vZdW6U6cNanjZDog",
    "url": "https://localhost:14000/finalize-order/ddtQT_w2db4_duhSBMw8_dhh8Nl6WrA-z4tyKLDFij0"
  }
  "signature": 0x3E 0xA0 ... 0xDA
}
```


## Finalize Order Response

```
HTTP/1.1 200 OK
Location: https://localhost:14000/my-order/ddtQT_w2db4_duhSBMw8_dhh8Nl6WrA-z4tyKLDFij0
Replay-Nonce: F078KAgocLrT7-jUo9qKUQ

{
   "status": "processing",
   "expires": "2019-04-10T00:48:11Z",
   "identifiers": [
      {
         "type": "dns",
         "value": "www.example.com"
      }
   ],
   "finalize": "https://localhost:14000/finalize-order/ddtQT_w2db4_duhSBMw8_dhh8Nl6WrA-z4tyKLDFij0",
   "authorizations": [
      "https://localhost:14000/authZ/omPvqSb5PVcusOXWYwCAfutnqBB4OPl0kEtFdxc5z8E"
   ]
}
```


## POST-as-GET Order Response

```
HTTP/1.1 200 OK

{
   "status": "valid",
   "expires": "2019-04-10T00:48:11Z",
   "identifiers": [
      {
         "type": "dns",
         "value": "www.example.com"
      }
   ],
   "finalize": "https://localhost:14000/finalize-order/ddtQT_w2db4_duhSBMw8_dhh8Nl6WrA-z4tyKLDFij0",
   "authorizations": [
      "https://localhost:14000/authZ/omPvqSb5PVcusOXWYwCAfutnqBB4OPl0kEtFdxc5z8E"
   ],
   "certificate": "https://localhost:14000/certZ/15cc2e0a387f2e05"
}
```


## POST-as-GET Certificate Response

```
HTTP/1.1 200 OK
Content-Type: application/pem-certificate-chain; charset=utf-8

-----BEGIN CERTIFICATE-----
MIICVDCCATygAwIBAgIIFcwuCjh/LgUwDQYJKoZIhvcNAQELBQAwKDEmMCQGA1UE
AxMdUGViYmxlIEludGVybWVkaWF0ZSBDQSA3ZDY1Y2UwHhcNMTkwNDA5MDA1OTIw
WhcNMjQwNDA5MDA1OTIwWjAaMRgwFgYDVQQDEw93d3cuZXhhbXBsZS5jb20wWTAT
BgcqhkjOPQIBBggqhkjOPQMBBwNCAASkMDMKzAdTkJsH4YcE5ixLaDS1Qit5/tR2
ebWKBszUmvkPIZr6kRtLQVgt4epZH7GrStht3r7CzLMNQbwmLjfvo1swWTAOBgNV
HQ8BAf8EBAMCBaAwHQYDVR0lBBYwFAYIKwYBBQUHAwEGCCsGAQUFBwMCMAwGA1Ud
EwEB/wQCMAAwGgYDVR0RBBMwEYIPd3d3LmV4YW1wbGUuY29tMA0GCSqGSIb3DQEB
CwUAA4IBAQAS/hsZ2Wuog5hQQ6w18Io+dYqPjJLIuu3Ud4fLEk9qSP2x6Z/GHHE2
1a6crOCTJRJL/8t27UAnWCsblScxWpIxs7yJGUlgHZ4ibmw/Ti6EcBfqYlgUn6DV
AQaCmby/UZHxXAkBVv3zkp6kqIm+lvgxW8fHRCKCvYHRJaeTStx+IMXWyjO2qzCr
DaGmUkY0ty2/xKibWcHN8SQB8IN8BuOSbUtKmu2JIq/QXakYgV+zihPkNECOh1Gb
ynmGQusWnHhjvslDSaLV2gK/KRuWGng1eInuyUUzzQE8GauJyB7BmplcoIx8CyVL
1kMDhgo/vgq8ZlMcIc+ri0yZpQtw7XEu
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIDDDCCAfSgAwIBAgIIfWXOzkh4gsQwDQYJKoZIhvcNAQELBQAwIDEeMBwGA1UE
AxMVUGViYmxlIFJvb3QgQ0EgNmM4MDQ4MB4XDTE5MDQwOTAwNDMyOFoXDTQ5MDQw
OTAxNDMyOFowKDEmMCQGA1UEAxMdUGViYmxlIEludGVybWVkaWF0ZSBDQSA3ZDY1
Y2UwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCukLKkAnvJ7mjB69JO
+XOWmLQlEDFTDtfA7qMMHZiTs8NxONYHwHrExRi4S8ol7j2Vmx2Hr8Anf6c2eUzt
alFOQae8KFLm9fwHytONkoD1eu9HjK5hx0Wmcul/MQcV6/Tw/ZY7fFugJ3SxBZ1s
eEGvdROOsdxXwD65g7UrDcdqcZ+C769LRC5Zoi9OPVD+XrWqTwVNr/EXcfTtSwWk
c5wH/DRxCxG0zUERKhQAspVEFwk/bzFsJFRRjg6aZwWG/3IziKDgIeUSTF/G+kW6
AxqqrzxsqQcSMqIIlkXEbqHr1yim4Z2NG61e+2IgbR7r/QMQDmh0wLbNgN1bvINv
qlzjAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIChDAdBgNVHSUEFjAUBggrBgEFBQcD
AQYIKwYBBQUHAwIwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEA
ZYWb+Q3D6q2JbbkcvJp2TGJSiOpfyIGXDC12tI5E0lvvXnh/SJXGKJoZ+OSgzkri
kN2Eo95qGCt4RZ809a3vm+bu0ucP/A/0hp+a1ZD+VwdvXeFKn067sY+zbrfIgVh4
pZ3q5lRZ3QoINF6SGQrhObcDIt3tiioFxSh2uUMLsjYDkJSpzkNuqCGCH+bwUw/r
PZoXmYXWfbgCtSnRahR4uYP0JDaxYGaQYhZMID8ZaOT6C3dsyP9TZGO41sG0o68T
EKwUJuVJM17A8el51PkfR/5btwG+rGJeA+MUcN6r6wMgRT6k1jreh4bBPTi9npja
kEy3bRgDf/4B58oF3ujRMw==
-----END CERTIFICATE-----
```
