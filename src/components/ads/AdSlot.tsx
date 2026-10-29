import React from 'react';
const enabled = import.meta.env.PUBLIC_ADS_ENABLED === 'true';
const client = import.meta.env.PUBLIC_ADSENSE_CLIENT_ID as string | undefined;
export default function AdSlot({ label }: { label: string }) {
  // Ads are OFF by default. When disabled, render a reserved, clearly-labelled empty box
  // (no script, no fake ad, no impression) so layout does not shift if ads are later enabled.
  if (!enabled || !client) return <div className="card my-6 p-4 text-center text-sm text-slate-500" role="note" aria-label="Advertisement space, currently disabled">Advertisement space — disabled until the site owner configures AdSense. Tools work fully without ads.</div>;
  return <div className="card my-6 p-2 text-center" aria-label={label}><ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client={client} data-ad-format="auto" data-full-width-responsive="true" /></div>;
}
