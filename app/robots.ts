import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/features",
          "/how-it-works",
          "/verticals",
          "/login",
          "/signup",
          "/install",
        ],
        disallow: ["/p/", "/api/", "/self-onboard/"],
      },
    ],
    sitemap: "https://www.tenopilot.com/sitemap.xml",
  };
}
