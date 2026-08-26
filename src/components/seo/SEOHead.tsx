import React, { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: object;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'Aether Mart | Hyperlocal Delivery in Mahasamund',
  description = 'Aether Mart brings food, groceries, medicines, daily essentials and more to your doorstep in Mahasamund, Chhattisgarh from trusted local businesses.',
  canonicalUrl = 'https://aether-mart-six.vercel.app/',
  ogImage = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  noIndex = false,
  jsonLd,
}) => {
  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // 2. Update Meta Description
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // 3. Update Robots Indexing Rule
    let metaRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = noIndex ? 'noindex, nofollow' : 'index, follow';

    // 4. Update Canonical Link
    let linkCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = canonicalUrl;

    // 5. OpenGraph Meta Tags
    const ogTags: Record<string, string> = {
      'og:title': title,
      'og:description': description,
      'og:image': ogImage,
      'og:url': canonicalUrl,
      'og:type': 'website',
      'og:site_name': 'Aether Mart',
    };

    Object.entries(ogTags).forEach(([property, content]) => {
      let ogMeta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!ogMeta) {
        ogMeta = document.createElement('meta');
        ogMeta.setAttribute('property', property);
        document.head.appendChild(ogMeta);
      }
      ogMeta.content = content;
    });

    // 6. JSON-LD Structured Data
    if (jsonLd) {
      let scriptJsonLd = document.querySelector<HTMLScriptElement>('#dynamic-jsonld');
      if (!scriptJsonLd) {
        scriptJsonLd = document.createElement('script');
        scriptJsonLd.id = 'dynamic-jsonld';
        scriptJsonLd.type = 'application/ld+json';
        document.head.appendChild(scriptJsonLd);
      }
      scriptJsonLd.textContent = JSON.stringify(jsonLd);
    }
  }, [title, description, canonicalUrl, ogImage, noIndex, jsonLd]);

  return null;
};

export default SEOHead;
