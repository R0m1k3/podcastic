//! Outbound request guard (SSRF): only public http(s) hosts may be fetched.
//!
//! URLs are checked before each request and each redirect (IP literals and
//! internal names), and every host name is resolved through
//! [`PublicOnlyResolver`], which drops private, loopback, link-local and other
//! internal addresses at connection time (DNS rebinding included).

use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr},
    sync::Arc,
};

use reqwest::dns::{Addrs, Name, Resolve, Resolving};
use url::Url;

fn is_internal_v4(v4: Ipv4Addr) -> bool {
    let [a, b, c, _] = v4.octets();
    v4.is_private()
        || v4.is_loopback()
        || v4.is_link_local()
        || v4.is_unspecified()
        || v4.is_broadcast()
        || v4.is_multicast()
        || a == 0
        // 100.64.0.0/10 (carrier-grade NAT)
        || (a == 100 && (b & 0xc0) == 64)
        // 192.0.0.0/24 (IETF protocol assignments)
        || (a == 192 && b == 0 && c == 0)
        // 198.18.0.0/15 (benchmarking)
        || (a == 198 && (b & 0xfe) == 18)
        // 240.0.0.0/4 (reserved)
        || a >= 240
}

/// Addresses that must never be reached from the server.
pub fn is_private_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => is_internal_v4(v4),
        IpAddr::V6(v6) => {
            let segments = v6.segments();
            v6.is_loopback()
                || v6.is_unspecified()
                || v6.is_multicast()
                // fc00::/7 (unique local)
                || (segments[0] & 0xfe00) == 0xfc00
                // fe80::/10 (link local)
                || (segments[0] & 0xffc0) == 0xfe80
                // IPv4-mapped / IPv4-compatible addresses
                || v6.to_ipv4().is_some_and(is_internal_v4)
                // 64:ff9b::/96 (NAT64) embedding an internal IPv4 address
                || (segments[..6] == [0x64, 0xff9b, 0, 0, 0, 0]
                    && is_internal_v4(Ipv4Addr::new(
                        (segments[6] >> 8) as u8,
                        segments[6] as u8,
                        (segments[7] >> 8) as u8,
                        segments[7] as u8,
                    )))
        }
    }
}

/// `true` for http(s) URLs whose host is neither an internal IP literal nor
/// an internal name (single label, `localhost`). Host names are additionally
/// filtered at resolution time by [`PublicOnlyResolver`].
pub fn url_allowed(url: &Url) -> bool {
    if !matches!(url.scheme(), "http" | "https") {
        return false;
    }
    match url.host() {
        Some(url::Host::Ipv4(ip)) => !is_private_ip(IpAddr::V4(ip)),
        Some(url::Host::Ipv6(ip)) => !is_private_ip(IpAddr::V6(ip)),
        Some(url::Host::Domain(domain)) => {
            let domain = domain.trim_end_matches('.').to_ascii_lowercase();
            domain.contains('.') && domain != "localhost" && !domain.ends_with(".localhost")
        }
        None => false,
    }
}

/// DNS resolver that only returns public addresses.
pub struct PublicOnlyResolver;

impl Resolve for PublicOnlyResolver {
    fn resolve(&self, name: Name) -> Resolving {
        let host = name.as_str().to_owned();
        Box::pin(async move {
            let public: Vec<SocketAddr> = tokio::net::lookup_host((host.as_str(), 0))
                .await?
                .filter(|addr| !is_private_ip(addr.ip()))
                .collect();
            if public.is_empty() {
                return Err(format!("host {host} resolves to no public address").into());
            }
            let addrs: Addrs = Box::new(public.into_iter());
            Ok(addrs)
        })
    }
}

/// Applies the guard to a client builder: public-only DNS and a redirect
/// policy that re-checks every hop.
pub fn guard(builder: reqwest::ClientBuilder, max_redirects: usize) -> reqwest::ClientBuilder {
    builder
        .dns_resolver(Arc::new(PublicOnlyResolver))
        .redirect(reqwest::redirect::Policy::custom(move |attempt| {
            if attempt.previous().len() >= max_redirects {
                attempt.error("too many redirects")
            } else if !url_allowed(attempt.url()) {
                attempt.error("redirect to a forbidden address")
            } else {
                attempt.follow()
            }
        }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn allowed(url: &str) -> bool {
        url_allowed(&Url::parse(url).unwrap())
    }

    #[test]
    fn blocks_internal_urls() {
        assert!(allowed("https://cdn.example.com/a.mp3"));
        assert!(allowed("http://93.184.216.34/a.mp3"));
        assert!(!allowed("http://localhost/a.mp3"));
        assert!(!allowed("http://127.0.0.1/a.mp3"));
        assert!(!allowed("http://10.0.0.5/"));
        assert!(!allowed("http://100.64.1.1/"));
        assert!(!allowed("http://192.168.1.10/a.mp3"));
        assert!(!allowed("http://169.254.169.254/latest"));
        assert!(!allowed("http://[::1]/a.mp3"));
        assert!(!allowed("http://[::ffff:127.0.0.1]/"));
        assert!(!allowed("http://[64:ff9b::a9fe:a9fe]/"));
        assert!(!allowed("http://[fd00::1]/"));
        assert!(!allowed("http://redis:6379/"));
        assert!(!allowed("http://api.localhost/"));
        assert!(!allowed("ftp://example.com/a.mp3"));
        assert!(!allowed("file:///etc/passwd"));
    }

    #[tokio::test]
    async fn resolver_drops_internal_addresses() {
        let result = PublicOnlyResolver.resolve("localhost".parse().unwrap()).await;
        assert!(result.is_err());
    }
}
