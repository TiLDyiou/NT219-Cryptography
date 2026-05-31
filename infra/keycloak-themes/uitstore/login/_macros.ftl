<#macro svgIcon name size=16>
  <#local s = size?c />
  <#if name == "shield-check">
    <svg class="uit-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"/><path d="m9 12 2 2 4-4"/></svg>
  <#elseif name == "fingerprint">
    <svg class="uit-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 11a6 6 0 0 1 12 0v3M9 14c0 3 1 5 2 7M15 11v3c0 2 .5 4 1.5 6M12 11v6M5 16c.5 1.5 1 3 2 5"/></svg>
  <#elseif name == "key">
    <svg class="uit-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>
  <#elseif name == "lock">
    <svg class="uit-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  <#elseif name == "check-circle">
    <svg class="uit-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
  <#elseif name == "eye">
    <svg class="uit-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
  <#elseif name == "eye-off">
    <svg class="uit-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
  <#elseif name == "arrow-left">
    <svg class="uit-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
  </#if>
</#macro>

<#macro brandRow>
  <div class="brand-row">
    <div class="brand-mark" aria-hidden="true">UIT</div>
    <div class="brand-name">UIT Store</div>
  </div>
</#macro>

<#macro featureItem icon title sub>
  <div class="feature-item">
    <div class="feature-icon"><@svgIcon name=icon size=16 /></div>
    <div>
      <div class="feature-title">${title}</div>
      <div class="feature-sub">${sub}</div>
    </div>
  </div>
</#macro>

<#macro visualDecorations>
  <div class="login-visual-deco login-visual-deco--a" aria-hidden="true"></div>
  <div class="login-visual-deco login-visual-deco--b" aria-hidden="true"></div>
</#macro>
