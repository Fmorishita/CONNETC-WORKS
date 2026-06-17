/* =========================================================
   ConnectWorks — public Supabase config (browser-safe)
   The anon key is PUBLIC by design; Row Level Security protects writes.
   Fill SUPABASE_ANON_KEY with your project's anon/public key
   (Supabase → Settings → API). Then the site loads editable content
   from your CMS. If left blank, the site uses the built-in fallback
   content and nothing breaks.
   ========================================================= */
window.CW_CONFIG = {
  SUPABASE_URL: "https://kpwerpscygpwsqueuihu.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwd2VycHNjeWdwd3NxdWV1aWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3ODc0NTUsImV4cCI6MjA5NjM2MzQ1NX0.fTC0Bc70nxKMav_ynrEblkLY3gvBEoxA-n73ZUCDFtQ",

  /* Operations Hub — Google Maps (browser key, MUST be HTTP-referrer restricted).
     Leave "" to keep the Route Planner in basic mode (free deep-links).
     When set, the advanced route features (embedded map + automatic stop
     optimization) activate. Restrict it in Google Cloud to your domains. */
  GOOGLE_MAPS_API_KEY: "AIzaSyBAkyCykzkBu9DD1nZ0LSiPYMwoUa-GpXI"
};
